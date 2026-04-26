"""
US_19 / US_21 — Edge AI: EAR + Head pose, cảnh báo âm thanh WAV (pygame, thread riêng),
đồng bộ Backend qua SQLite + cache đĩa (`persistence_manager`) — không block camera.

Chạy thử (webcam laptop, backend đang mở):
  cd ai_module
  copy .env.example .env   # điền MASTER_DEVICE_API_KEY, CURRENT_TRIP_ID, SMARTDRIVE_DEVICE_VIOLATION_JSON_URL
  pip install -r requirements.txt   # gồm pygame — phát alarm_drowsy.wav / alarm_distracted.wav nếu có
  # Đặt hai file WAV cạnh smartdrive_edge_ai.py (hoặc chỉnh EDGE_ALARM_*_WAV trong .env)
  # Tuỳ chọn: EDGE_ALARM_VOLUME=0.0–1.0, EDGE_AUDIO_RECOVERY_HOLD_SEC (mặc định ~0.35s — giữ còi thêm sau khi tài xế đã ổn định)
  python smartdrive_edge_ai.py

Test mất mạng (US_21): tắt Node, gây vi phạm → kiểm tra `database/violation_queue.db` và `cache/*.jpg`;
bật lại Node → thread Sync tự xả hàng đợi.

Tuỳ chọn: `python smartdrive_edge_ai.py --trip-id <uuid>` ghi đè CURRENT_TRIP_ID.

Thoát: phím `q` trên cửa sổ OpenCV.
"""

from __future__ import annotations

import argparse
import logging
import math
import os
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
import requests

try:
    import mediapipe as mp
except ImportError as e:  # pragma: no cover
    raise SystemExit("Cần cài mediapipe: pip install -r requirements.txt") from e

from dotenv import load_dotenv

_ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(_ENV_PATH)

# Trùng backend `device-auth` — bắt buộc header `x-device-api-key` khi POST ingest.
MASTER_DEVICE_API_KEY = (os.getenv("MASTER_DEVICE_API_KEY") or "").strip()

from api_client import send_violation_json  # noqa: E402
from audio_alarm_manager import AudioAlarmManager  # noqa: E402
from persistence_manager import PersistenceManager, image_path_to_base64  # noqa: E402

_MODULE_DIR = Path(__file__).resolve().parent

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("smartdrive_edge_ai")

# --- MediaPipe: 6 điểm / mắt (EAR) ---
_LEFT_EYE_MP = np.array([362, 385, 387, 263, 373, 380], dtype=np.int32)
_RIGHT_EYE_MP = np.array([33, 160, 158, 133, 153, 144], dtype=np.int32)

# --- Head pose: 6 điểm 2D ↔ model 3D (LearnOpenCV / solvePnP) ---
_HEAD_POSE_2D_IDX = np.array([1, 152, 263, 33, 287, 57], dtype=np.int32)
_HEAD_MODEL_3D_MM = np.array(
    [
        (0.0, 0.0, 0.0),
        (0.0, -330.0, -65.0),
        (-225.0, 170.0, -135.0),
        (225.0, 170.0, -135.0),
        (-150.0, -150.0, -125.0),
        (150.0, -150.0, -125.0),
    ],
    dtype=np.float64,
)


def _euclidean(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.linalg.norm(a - b))


def eye_aspect_ratio_xy(pts_xy: np.ndarray) -> float:
    """pts_xy: (6,2) theo thứ tự [p1,p2,p3,p4,p5,p6] như PyImageSearch."""
    p1, p2, p3, p4, p5, p6 = pts_xy
    v1 = _euclidean(p2, p6)
    v2 = _euclidean(p3, p5)
    h = _euclidean(p1, p4)
    if h < 1e-6:
        return 1.0
    return (v1 + v2) / (2.0 * h)


def rotation_vector_to_euler_degrees(rvec: np.ndarray, tvec: np.ndarray) -> tuple[float, float, float]:
    """Trả về (pitch, yaw, roll) độ — ước lượng từ solvePnP (đủ cho ngưỡng DISTRACTED)."""
    rmat, _ = cv2.Rodrigues(rvec)
    sy = math.sqrt(rmat[0, 0] * rmat[0, 0] + rmat[1, 0] * rmat[1, 0])
    singular = sy < 1e-6
    if not singular:
        pitch = math.atan2(rmat[2, 1], rmat[2, 2])
        yaw = math.atan2(-rmat[2, 0], sy)
        roll = math.atan2(rmat[1, 0], rmat[0, 0])
    else:
        pitch = math.atan2(-rmat[1, 2], rmat[1, 1])
        yaw = math.atan2(-rmat[2, 0], sy)
        roll = 0.0
    return tuple(math.degrees(x) for x in (pitch, yaw, roll))


def estimate_head_pose_degrees(
    frame_hw: tuple[int, int],
    landmarks_px: np.ndarray,
) -> Optional[tuple[float, float, float]]:
    h, w = frame_hw
    pts = landmarks_px[_HEAD_POSE_2D_IDX].astype(np.float64)
    focal = float(w)
    center = (w / 2.0, h / 2.0)
    cam_matrix = np.array([[focal, 0, center[0]], [0, focal, center[1]], [0, 0, 1]], dtype=np.float64)
    dist = np.zeros((4, 1), dtype=np.float64)
    ok, rvec, tvec = cv2.solvePnP(
        _HEAD_MODEL_3D_MM,
        pts,
        cam_matrix,
        dist,
        flags=cv2.SOLVEPNP_ITERATIVE,
    )
    if not ok:
        return None
    return rotation_vector_to_euler_degrees(rvec, tvec)


def _probe_network(json_url: str) -> bool:
    """Kiểm tra nhanh TCP/HTTP tới endpoint ingest (GET/HEAD đều được)."""
    try:
        r = requests.head(json_url, timeout=2.5, allow_redirects=True)
        return r.status_code < 600
    except requests.RequestException:
        pass
    try:
        r = requests.get(json_url, timeout=2.5, stream=True)
        r.close()
        return True
    except requests.RequestException:
        return False


def sync_worker_loop(
    stop: threading.Event,
    pm: PersistenceManager,
    interval_sec: float,
    batch_size: int,
    healthcheck_url: str,
    device_api_key: str,
) -> None:
    """US_21 — định kỳ: có mạng → lấy batch SQLite → POST → mark_as_sent / increment_retry."""
    while not stop.is_set():
        if not _probe_network(healthcheck_url):
            if stop.wait(interval_sec):
                break
            continue
        rows = pm.get_next_batch(batch_size)
        if not rows:
            pm.prune_cache_orphans()
        else:
            for row in rows:
                try:
                    b64 = image_path_to_base64(row.image_path)
                except OSError:
                    logger.warning("Mất file ảnh — bỏ hàng queue: %s", row.device_event_id[:16])
                    pm.mark_as_sent(row.device_event_id)
                    continue
                ok = send_violation_json(
                    row.payload["trip_id"],
                    row.payload["violation_type"],
                    image_base64=b64,
                    device_event_id=row.device_event_id,
                    lat=row.payload.get("latitude"),
                    lng=row.payload.get("longitude"),
                    occurred_at_iso=row.payload["occurred_at_iso"],
                    device_api_key=device_api_key,
                )
                if ok:
                    pm.mark_as_sent(row.device_event_id)
                    logger.info("Đã sync violation | id=%s…", row.device_event_id[:12])
                else:
                    pm.increment_retry(row.device_event_id)
                    logger.info("Chưa sync được — giữ SQLite, retry+1 | %s…", row.device_event_id[:12])
            pm.prune_cache_orphans()
        if stop.wait(interval_sec):
            break


def main() -> int:
    parser = argparse.ArgumentParser(description="SmartDrive Edge AI — webcam + đồng bộ vi phạm.")
    parser.add_argument("--trip-id", dest="trip_id", default=None, help="UUID chuyến (ghi đè CURRENT_TRIP_ID)")
    parser.add_argument("--camera", type=int, default=int(os.getenv("EDGE_CAMERA_INDEX", "0")))
    args = parser.parse_args()

    trip_id = (args.trip_id or os.getenv("CURRENT_TRIP_ID") or "").strip()
    if not trip_id:
        logger.error("Thiếu trip_id: đặt CURRENT_TRIP_ID trong .env hoặc --trip-id")
        return 1

    ear_thresh = float(os.getenv("EDGE_EAR_THRESHOLD", "0.25"))
    drowsy_hold = float(os.getenv("EDGE_DROWSY_HOLD_SEC", "1.2"))
    pose_deg = float(os.getenv("EDGE_POSE_DEG_THRESHOLD", "30"))
    pose_hold = float(os.getenv("EDGE_DISTRACTED_HOLD_SEC", "1.0"))
    alarm_volume = float(os.getenv("EDGE_ALARM_VOLUME", "1.0"))
    audio_recovery = float(os.getenv("EDGE_AUDIO_RECOVERY_HOLD_SEC", "0.35"))
    sync_interval = float(os.getenv("EDGE_SYNC_INTERVAL_SEC", "2.0"))
    sync_batch = int(os.getenv("EDGE_SYNC_BATCH_SIZE", "6"))
    health_url = (os.getenv("SMARTDRIVE_DEVICE_VIOLATION_JSON_URL") or "").strip()
    if not health_url:
        health_url = "http://localhost:3000/api/device/violation"
    if not MASTER_DEVICE_API_KEY:
        logger.warning(
            "Thiếu MASTER_DEVICE_API_KEY trong .env — POST ingest sẽ bị 401 từ backend. "
            "Điền cùng giá trị với MASTER_DEVICE_API_KEY trên server.",
        )
    lat = float(os.getenv("EDGE_DEFAULT_LAT", "16.04")) if os.getenv("EDGE_DEFAULT_LAT") else None
    lng = float(os.getenv("EDGE_DEFAULT_LNG", "108.25")) if os.getenv("EDGE_DEFAULT_LNG") else None

    stop_ev = threading.Event()
    audio_alarm = AudioAlarmManager(
        _MODULE_DIR,
        stop_ev,
        drowsy_wav=(os.getenv("EDGE_ALARM_DROWSY_WAV") or "alarm_drowsy.wav").strip(),
        distracted_wav=(os.getenv("EDGE_ALARM_DISTRACTED_WAV") or "alarm_distracted.wav").strip(),
        volume=alarm_volume,
    )
    audio_alarm.start()
    pm = PersistenceManager()

    sync_t = threading.Thread(
        target=sync_worker_loop,
        args=(stop_ev, pm, sync_interval, sync_batch, health_url, MASTER_DEVICE_API_KEY),
        name="SyncWorker",
        daemon=True,
    )
    sync_t.start()

    mp_face_mesh = mp.solutions.face_mesh
    face_mesh = mp_face_mesh.FaceMesh(
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    cap = cv2.VideoCapture(args.camera)
    if not cap.isOpened():
        logger.error("Không mở được camera index=%s", args.camera)
        stop_ev.set()
        return 1

    # --- Trạng thái thời gian (monotonic) ---
    d_bad_since: Optional[float] = None
    p_bad_since: Optional[float] = None
    drowsy_active = False
    pose_active = False
    sent_drowsy = False
    sent_pose = False
    pending_hud = pm.pending_count()
    hud_tick = 0
    audio_clear_since: Optional[float] = None

    logger.info(
        "Edge AI bật | trip=%s… | EAR<thresh %.2f %.1fs | pose>%.0f° %.1fs | alarm_vol=%.2f audio_rec=%.2fs | SQLite pending=%s",
        trip_id[:8],
        ear_thresh,
        drowsy_hold,
        pose_deg,
        pose_hold,
        max(0.0, min(1.0, alarm_volume)),
        audio_recovery,
        pm.pending_count(),
    )

    try:
        while True:
            hud_tick += 1
            if hud_tick % 20 == 0:
                pending_hud = pm.pending_count()

            ok, frame = cap.read()
            if not ok or frame is None:
                continue

            h, w = frame.shape[:2]
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            rgb.flags.writeable = False
            res = face_mesh.process(rgb)
            rgb.flags.writeable = True

            now = time.monotonic()
            ear = 0.35
            pose_ok = True
            pitch_yaw = (0.0, 0.0)

            if res.multi_face_landmarks:
                lm = res.multi_face_landmarks[0].landmark
                pts = np.array([(lm[i].x * w, lm[i].y * h) for i in range(468)], dtype=np.float64)

                le = pts[_LEFT_EYE_MP]
                re = pts[_RIGHT_EYE_MP]
                ear_l = eye_aspect_ratio_xy(le)
                ear_r = eye_aspect_ratio_xy(re)
                ear = float((ear_l + ear_r) / 2.0)

                euler = estimate_head_pose_degrees((h, w), pts)
                if euler is not None:
                    pitch, yaw, _roll = euler
                    pitch_yaw = (pitch, yaw)
                    if max(abs(pitch), abs(yaw)) <= pose_deg:
                        pose_ok = True
                    else:
                        pose_ok = False
                else:
                    pose_ok = True
            else:
                # Không có mặt: không tích luỹ DROWSY/DISTRACTED
                d_bad_since = None
                p_bad_since = None
                drowsy_active = False
                pose_active = False
                audio_clear_since = None
                audio_alarm.set_alarm(None)
                cv2.putText(frame, "NO FACE", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 165, 255), 2)
                cv2.imshow("SmartDrive Edge AI (US_19) — q: thoát", frame)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break
                continue

            # DROWSY: EAR thấp kéo dài
            if ear < ear_thresh:
                if d_bad_since is None:
                    d_bad_since = now
                drowsy_active = (now - d_bad_since) >= drowsy_hold
            else:
                d_bad_since = None
                drowsy_active = False

            # DISTRACTED: pose xấu kéo dài
            if not pose_ok:
                if p_bad_since is None:
                    p_bad_since = now
                pose_active = (now - p_bad_since) >= pose_hold
            else:
                p_bad_since = None
                pose_active = False

            if not drowsy_active:
                sent_drowsy = False
            if not pose_active:
                sent_pose = False

            # Âm thanh (US_19): DISTRACTED ưu tiên — pygame thread; khi hết nguy cơ, giữ thêm EDGE_AUDIO_RECOVERY_HOLD_SEC (0 = tắt ngay)
            threat_audio = pose_active or drowsy_active
            if threat_audio:
                audio_clear_since = None
                if pose_active:
                    audio_alarm.set_alarm("DISTRACTED")
                elif drowsy_active:
                    audio_alarm.set_alarm("DROWSY")
            else:
                if audio_recovery <= 0:
                    audio_alarm.set_alarm(None)
                else:
                    if audio_clear_since is None:
                        audio_clear_since = now
                    elif (now - audio_clear_since) >= audio_recovery:
                        audio_alarm.set_alarm(None)
                        audio_clear_since = None

            # US_21 — Ghi SQLite + ảnh disk (rising edge + latch)
            occurred_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            if pose_active and not sent_pose:
                eid = uuid.uuid4().hex
                if pm.enqueue_violation(
                    frame,
                    device_event_id=eid,
                    trip_id=trip_id,
                    violation_type="DISTRACTED",
                    occurred_at_iso=occurred_iso,
                    lat=lat,
                    lng=lng,
                ):
                    sent_pose = True
                    pending_hud = pm.pending_count()
                    logger.info("Enqueue DISTRACTED (SQLite) | device_event_id=%s…", eid[:12])
            elif drowsy_active and not sent_drowsy and not pose_active:
                eid = uuid.uuid4().hex
                if pm.enqueue_violation(
                    frame,
                    device_event_id=eid,
                    trip_id=trip_id,
                    violation_type="DROWSY",
                    occurred_at_iso=occurred_iso,
                    lat=lat,
                    lng=lng,
                ):
                    sent_drowsy = True
                    pending_hud = pm.pending_count()
                    logger.info("Enqueue DROWSY (SQLite) | device_event_id=%s…", eid[:12])

            # HUD (không sleep)
            color = (0, 255, 0)
            status = "OK"
            if pose_active:
                status = "DISTRACTED"
                color = (0, 128, 255)
            elif drowsy_active:
                status = "DROWSY"
                color = (0, 0, 255)
            cv2.putText(frame, f"{status} EAR={ear:.2f}", (10, 36), cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)
            cv2.putText(
                frame,
                f"Pitch/Yaw={pitch_yaw[0]:.0f},{pitch_yaw[1]:.0f}",
                (10, 72),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (200, 200, 200),
                2,
            )
            cv2.putText(
                frame,
                f"queue_pending~{pending_hud}",
                (10, h - 14),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                (180, 180, 180),
                1,
            )
            cv2.imshow("SmartDrive Edge AI (US_19/21) — q: thoát", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
    finally:
        stop_ev.set()
        cap.release()
        face_mesh.close()
        cv2.destroyAllWindows()
        audio_alarm.join(timeout=2.5)
        sync_t.join(timeout=3.0)

    logger.info("Đã thoát Edge AI.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
