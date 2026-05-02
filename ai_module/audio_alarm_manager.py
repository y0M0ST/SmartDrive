"""
US_19 — Phát cảnh báo âm thanh tại chỗ (WAV) không chặn vòng lặp camera.

- `pygame.mixer` chạy trên **thread daemon riêng**; main thread chỉ gọi `set_alarm(kind)`.
- `set_alarm(None)` → `pygame.mixer.stop()` — âm thanh tắt ngay khi tài xế về trạng thái bình thường.
- Thiếu file hoặc lỗi load: **Warning**, không ném exception ra main.
- Cùng tên gốc: nếu không thấy đúng `EDGE_ALARM_*_WAV`, tự thử `.{wav,mp3,ogg}` (vd. chỉ có `alarm_drowsy.mp3`).
- `volume` 0.0–1.0 (pygame `Sound.set_volume`) — cấu hình từ biến môi trường phía caller.
"""

from __future__ import annotations

import logging
import threading
import time
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


def _resolve_alarm_file(base: Path, configured_name: str) -> Optional[Path]:
    """
    Ưu tiên đúng tên trong .env; nếu không có file (vd. chỉ có .mp3 mà mặc định .wav),
    thử cùng stem với .wav / .mp3 / .ogg.
    """
    direct = base / configured_name
    if direct.is_file():
        return direct
    stem = Path(configured_name).stem
    for ext in (".wav", ".mp3", ".ogg"):
        cand = base / f"{stem}{ext}"
        if cand.is_file():
            logger.info("Dùng file âm thanh: %s (theo cấu hình %s)", cand.name, configured_name)
            return cand
    return None


try:
    import pygame
except ImportError:
    pygame = None  # type: ignore[assignment]


class AudioAlarmManager:
    """Điều khiển phát lặp WAV theo loại vi phạm; mọi I/O mixer chỉ trong worker thread."""

    def __init__(
        self,
        base_dir: Path,
        stop_event: threading.Event,
        *,
        drowsy_wav: str = "alarm_drowsy.wav",
        distracted_wav: str = "alarm_distracted.wav",
        volume: float = 1.0,
    ) -> None:
        self._base = base_dir
        self._stop = stop_event
        self._drowsy_name = drowsy_wav
        self._dist_name = distracted_wav
        self._volume = max(0.0, min(1.0, float(volume)))
        self._lock = threading.Lock()
        self._desired: Optional[str] = None  # "DROWSY" | "DISTRACTED" | None
        self._thread: Optional[threading.Thread] = None

    def set_alarm(self, kind: Optional[str]) -> None:
        """Main thread / OpenCV: đặt trạng thái mong muốn (không block)."""
        with self._lock:
            self._desired = kind if kind in ("DROWSY", "DISTRACTED") else None

    def _read_desired(self) -> Optional[str]:
        with self._lock:
            return self._desired

    def start(self) -> None:
        self._thread = threading.Thread(target=self._worker, name="AudioAlarmPygame", daemon=True)
        self._thread.start()

    def join(self, timeout: Optional[float] = None) -> None:
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=timeout)

    def _worker(self) -> None:
        if pygame is None:
            logger.warning("pygame chưa cài — không phát alarm WAV (pip install pygame).")
            while not self._stop.is_set():
                self._stop.wait(0.25)
            return

        try:
            pygame.mixer.init(frequency=44100, size=-16, channels=2, buffer=512)
        except Exception as e:  # noqa: BLE001
            logger.warning("pygame.mixer.init thất bại: %s — bỏ qua audio.", e)
            while not self._stop.is_set():
                self._stop.wait(0.25)
            return

        dpath = _resolve_alarm_file(self._base, self._drowsy_name)
        ppath = _resolve_alarm_file(self._base, self._dist_name)
        drowsy_sound = None
        dist_sound = None

        if dpath is not None:
            try:
                drowsy_sound = pygame.mixer.Sound(str(dpath))
                try:
                    drowsy_sound.set_volume(self._volume)
                except Exception:
                    pass
            except Exception as e:  # noqa: BLE001
                logger.warning("Không load được %s: %s", dpath.name, e)
        else:
            logger.warning(
                "Không tìm thấy file âm thanh BUỒN NGỦ (%s hoặc %s.{wav,mp3,ogg}) trong %s.",
                self._drowsy_name,
                Path(self._drowsy_name).stem,
                self._base,
            )

        if ppath is not None:
            try:
                dist_sound = pygame.mixer.Sound(str(ppath))
                try:
                    dist_sound.set_volume(self._volume)
                except Exception:
                    pass
            except Exception as e:  # noqa: BLE001
                logger.warning("Không load được %s: %s", ppath.name, e)
        else:
            logger.warning(
                "Không tìm thấy file âm thanh MẤT TẬP TRUNG (%s hoặc %s.{wav,mp3,ogg}) trong %s.",
                self._dist_name,
                Path(self._dist_name).stem,
                self._base,
            )

        playing: Optional[str] = None
        warned_play_drowsy = False
        warned_play_dist = False

        while not self._stop.is_set():
            desired = self._read_desired()
            if desired != playing:
                try:
                    pygame.mixer.stop()
                except Exception:
                    pass
                prev = playing
                playing = None

                if prev is not None and desired is None:
                    logger.info("Tắt cảnh báo âm thanh")
                    warned_play_drowsy = False
                    warned_play_dist = False

                if desired == "DROWSY":
                    if drowsy_sound is not None:
                        drowsy_sound.play(loops=-1)
                        playing = "DROWSY"
                        logger.info("Bật cảnh báo âm thanh BUỒN NGỦ")
                    else:
                        if not warned_play_drowsy:
                            logger.warning("BUỒN NGỦ nhưng không có file âm thanh đã load — không phát.")
                            warned_play_drowsy = True
                        playing = "DROWSY"
                elif desired == "DISTRACTED":
                    if dist_sound is not None:
                        dist_sound.play(loops=-1)
                        playing = "DISTRACTED"
                        logger.info("Bật cảnh báo âm thanh MẤT TẬP TRUNG")
                    else:
                        if not warned_play_dist:
                            logger.warning("MẤT TẬP TRUNG nhưng không có file âm thanh đã load — không phát.")
                            warned_play_dist = True
                        playing = "DISTRACTED"

            # Chờ ngắn trên **audio thread** (không ảnh hưởng FPS camera).
            self._stop.wait(0.05)

        try:
            pygame.mixer.stop()
            pygame.mixer.quit()
        except Exception:
            pass
        if playing is not None:
            logger.info("Tắt cảnh báo âm thanh")
