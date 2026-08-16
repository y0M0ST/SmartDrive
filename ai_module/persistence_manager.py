"""
US_21 — Hàng đợi vi phạm bền vững (SQLite + ảnh trên đĩa), đồng bộ sau khi có mạng.

- `enqueue_violation`: ghi DB + lưu JPEG vào `cache/`.
- `get_next_batch`: FIFO theo `id`.
- `mark_as_sent`: xóa hàng + xóa file ảnh (ACK HTTP 2xx từ `api_client.send_violation_json`).
- `prune_cache_orphans` + `_enforce_storage_limits_post_prune`: xóa file **mồ côi** (không còn trong queue); mặc định **không** xóa bản pending chưa ACK khi đầy ổ — chỉ cảnh báo (US_21). Tùy chọn `PERSISTENCE_EVICT_PENDING_ON_PRESSURE=1` để bật evict FIFO cũ (mất bằng chứng chưa gửi).
"""

from __future__ import annotations

import base64
import json
import logging
import os
import sqlite3
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)

_DEFAULT_DB = Path(__file__).resolve().parent / "database" / "violation_queue.db"
_DEFAULT_CACHE = Path(__file__).resolve().parent / "cache"


def _prepare_evidence_bgr(
    frame_bgr: np.ndarray,
    max_w: int = 320,
    jpeg_quality: int = 72,
) -> np.ndarray:
    h, w = frame_bgr.shape[:2]
    out = frame_bgr
    if w > max_w:
        scale = max_w / float(w)
        out = cv2.resize(out, (max_w, int(h * scale)), interpolation=cv2.INTER_AREA)
    return cv2.GaussianBlur(out, (3, 3), 0)


@dataclass
class ViolationQueueRow:
    id: int
    device_event_id: str
    payload: dict[str, Any]
    image_path: str
    retry_count: int
    created_at: str


class PersistenceManager:
    """SQLite + thư mục cache; thread-safe (một RLock cho mọi thao tác)."""

    def __init__(
        self,
        db_path: Optional[Path | str] = None,
        cache_dir: Optional[Path | str] = None,
        *,
        max_cache_bytes: int = 500 * 1024 * 1024,
        max_pending_warn: int = 5000,
    ) -> None:
        self._db_path = Path(db_path or os.getenv("PERSISTENCE_DB_PATH", str(_DEFAULT_DB)))
        self._cache_dir = Path(cache_dir or os.getenv("PERSISTENCE_CACHE_DIR", str(_DEFAULT_CACHE)))
        self._max_cache_bytes = int(os.getenv("PERSISTENCE_MAX_CACHE_BYTES", str(max_cache_bytes)))
        self._max_pending_warn = int(os.getenv("PERSISTENCE_MAX_PENDING_WARN", str(max_pending_warn)))
        # 0 = tắt cap (mặc định). Đặt >0 để giới hạn số bản ghi chưa sync (FIFO evict cũ nhất).
        self._max_pending_records = int(os.getenv("PERSISTENCE_MAX_PENDING_RECORDS", "0"))
        self._evict_pending_on_pressure = os.getenv("PERSISTENCE_EVICT_PENDING_ON_PRESSURE", "0").strip().lower() in (
            "1",
            "true",
            "yes",
        )
        self._lock = threading.RLock()
        self._cache_dir.mkdir(parents=True, exist_ok=True)
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path, timeout=30, isolation_level=None)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self) -> None:
        with self._lock:
            conn = self._connect()
            try:
                conn.execute(
                    """
                    CREATE TABLE IF NOT EXISTS violation_queue (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        device_event_id TEXT NOT NULL UNIQUE,
                        payload_json TEXT NOT NULL,
                        image_path TEXT NOT NULL,
                        retry_count INTEGER NOT NULL DEFAULT 0,
                        created_at TEXT NOT NULL
                    );
                    """
                )
                conn.execute(
                    "CREATE INDEX IF NOT EXISTS idx_violation_queue_fifo ON violation_queue(id);",
                )
            finally:
                conn.close()

    def enqueue_violation(
        self,
        frame_bgr: np.ndarray,
        *,
        device_event_id: str,
        trip_id: str,
        violation_type: str,
        occurred_at_iso: str,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
    ) -> bool:
        """Lưu ảnh + metadata. Trả False nếu không ghi được."""
        img_rel = f"{device_event_id}.jpg"
        abs_path = (self._cache_dir / img_rel).resolve()
        prepared = _prepare_evidence_bgr(frame_bgr)
        if not cv2.imwrite(str(abs_path), prepared, [int(cv2.IMWRITE_JPEG_QUALITY), 72]):
            logger.error("Không ghi được ảnh cache: %s", abs_path)
            return False

        payload: dict[str, Any] = {
            "trip_id": trip_id,
            "violation_type": violation_type,
            "occurred_at_iso": occurred_at_iso,
        }
        if lat is not None:
            payload["latitude"] = float(lat)
        if lng is not None:
            payload["longitude"] = float(lng)
        created = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        with self._lock:
            conn = self._connect()
            try:
                conn.execute(
                    """
                    INSERT INTO violation_queue (device_event_id, payload_json, image_path, retry_count, created_at)
                    VALUES (?, ?, ?, 0, ?);
                    """,
                    (
                        device_event_id,
                        json.dumps(payload, separators=(",", ":")),
                        str(abs_path),
                        created,
                    ),
                )
            except sqlite3.IntegrityError:
                logger.warning("Trùng device_event_id — bỏ enqueue: %s", device_event_id[:16])
                try:
                    Path(abs_path).unlink(missing_ok=True)
                except OSError:
                    pass
                return False
            finally:
                conn.close()

        self._maybe_warn_pending_size()
        return True

    def get_next_batch(self, limit: int = 8) -> list[ViolationQueueRow]:
        """FIFO: bản ghi cũ nhất (id nhỏ nhất)."""
        with self._lock:
            conn = self._connect()
            try:
                cur = conn.execute(
                    """
                    SELECT id, device_event_id, payload_json, image_path, retry_count, created_at
                    FROM violation_queue
                    ORDER BY id ASC
                    LIMIT ?;
                    """,
                    (limit,),
                )
                rows = []
                for r in cur.fetchall():
                    rows.append(
                        ViolationQueueRow(
                            id=int(r["id"]),
                            device_event_id=str(r["device_event_id"]),
                            payload=json.loads(r["payload_json"]),
                            image_path=str(r["image_path"]),
                            retry_count=int(r["retry_count"]),
                            created_at=str(r["created_at"]),
                        ),
                    )
                return rows
            finally:
                conn.close()

    def increment_retry(self, device_event_id: str) -> None:
        with self._lock:
            conn = self._connect()
            try:
                conn.execute(
                    "UPDATE violation_queue SET retry_count = retry_count + 1 WHERE device_event_id = ?;",
                    (device_event_id,),
                )
            finally:
                conn.close()

    def evict_oldest_pending(self, *, reason: str) -> bool:
        """
        Xóa **một** bản ghi pending cũ nhất (FIFO theo `id`) + ảnh — chỉ gọi khi `PERSISTENCE_EVICT_PENDING_ON_PRESSURE=1`.
        **Phá hủy dữ liệu:** mất bằng chứng cục bộ chưa ACK từ server; không dùng trong cấu hình mặc định US_21.
        """
        with self._lock:
            conn = self._connect()
            try:
                cur = conn.execute(
                    "SELECT device_event_id FROM violation_queue ORDER BY id ASC LIMIT 1;",
                )
                row = cur.fetchone()
            finally:
                conn.close()
        if not row:
            return False
        eid = str(row["device_event_id"])
        logger.warning("[US_21] Evict oldest pending (%s): %s…", reason, eid[:16])
        self.mark_as_sent(eid)
        return True

    def mark_as_sent(self, device_event_id: str) -> None:
        """Sau ACK 2xx: xóa DB + xóa file ảnh."""
        with self._lock:
            conn = self._connect()
            image_path: Optional[str] = None
            try:
                cur = conn.execute(
                    "SELECT image_path FROM violation_queue WHERE device_event_id = ?;",
                    (device_event_id,),
                )
                row = cur.fetchone()
                if row:
                    image_path = str(row["image_path"])
                conn.execute("DELETE FROM violation_queue WHERE device_event_id = ?;", (device_event_id,))
            finally:
                conn.close()
        if image_path:
            p = Path(image_path)
            try:
                p.unlink(missing_ok=True)
            except OSError as e:
                logger.warning("Không xóa được file ảnh %s: %s", p, e)

    def pending_count(self) -> int:
        with self._lock:
            conn = self._connect()
            try:
                cur = conn.execute("SELECT COUNT(*) AS c FROM violation_queue;")
                return int(cur.fetchone()["c"])
            finally:
                conn.close()

    def _referenced_image_paths(self) -> set[str]:
        with self._lock:
            conn = self._connect()
            try:
                cur = conn.execute("SELECT image_path FROM violation_queue;")
                out: set[str] = set()
                for r in cur.fetchall():
                    try:
                        out.add(str(Path(str(r["image_path"])).resolve()))
                    except OSError:
                        out.add(str(r["image_path"]))
                return out
            finally:
                conn.close()

    def _cache_dir_total_bytes(self) -> int:
        total = 0
        if not self._cache_dir.is_dir():
            return 0
        for p in self._cache_dir.rglob("*"):
            if p.is_file():
                try:
                    total += p.stat().st_size
                except OSError:
                    pass
        return total

    def prune_cache_orphans(self) -> None:
        """
        Giảm dung lượng `cache/`: xóa file **mồ côi** (không còn hàng trong `violation_queue` trỏ tới),
        từ cũ đến mới — tương đương dọn dẹp sau khi đã sync / crash trước khi xóa DB.
        Không xóa file đang là bằng chứng chờ gửi. Nếu vẫn vượt ngưỡng sau khi hết mồ côi → log cảnh báo.
        """
        referenced = self._referenced_image_paths()
        if not self._cache_dir.is_dir():
            return

        orphans: list[Path] = []
        for p in self._cache_dir.iterdir():
            if not p.is_file():
                continue
            try:
                rp = str(p.resolve())
            except OSError:
                rp = str(p)
            if rp not in referenced:
                orphans.append(p)

        orphans.sort(key=lambda x: x.stat().st_mtime_ns if x.exists() else 0)
        target = int(self._max_cache_bytes * 0.95)

        for p in orphans:
            if self._cache_dir_total_bytes() <= target:
                break
            try:
                sz = p.stat().st_size
            except OSError:
                sz = 0
            try:
                p.unlink(missing_ok=True)
                logger.info("Đã xóa file cache mồ côi: %s (~%s KB)", p.name, round(sz / 1024, 1))
            except OSError as e:
                logger.warning("Không xóa được orphan %s: %s", p, e)

        total = self._cache_dir_total_bytes()
        if total > self._max_cache_bytes:
            if self._evict_pending_on_pressure:
                logger.warning(
                    "[US_21] Dung lượng cache (~%s MB) vẫn vượt %s MB sau orphan prune — có thể evict pending FIFO (đã bật PERSISTENCE_EVICT_PENDING_ON_PRESSURE).",
                    round(total / (1024 * 1024), 1),
                    round(self._max_cache_bytes / (1024 * 1024), 1),
                )
            else:
                logger.warning(
                    "[US_21] Dung lượng cache (~%s MB) vẫn vượt %s MB sau orphan prune — không evict pending (mặc định). Tăng ổ / giảm JPEG / hoặc PERSISTENCE_EVICT_PENDING_ON_PRESSURE=1 (rủi ro mất bản ghi chưa ACK).",
                    round(total / (1024 * 1024), 1),
                    round(self._max_cache_bytes / (1024 * 1024), 1),
                )
        self._enforce_storage_limits_post_prune()

    def _enforce_storage_limits_post_prune(self) -> None:
        """
        Cap số pending (tuỳ cấu hình) và/hoặc giảm cache — chỉ **evict bản pending chưa ACK** khi
        `PERSISTENCE_EVICT_PENDING_ON_PRESSURE=1` (mặc định tắt, khớp US_21).
        """
        cap = self._max_pending_records
        if cap > 0 and self.pending_count() > cap:
            if self._evict_pending_on_pressure:
                while self.pending_count() > cap:
                    if not self.evict_oldest_pending(reason=f"PERSISTENCE_MAX_PENDING_RECORDS={cap}"):
                        break
            else:
                logger.warning(
                    "[US_21] pending=%s vượt PERSISTENCE_MAX_PENDING_RECORDS=%s — không tự evict. Kiểm tra mạng hoặc bật PERSISTENCE_EVICT_PENDING_ON_PRESSURE=1 (mất bản ghi chưa gửi).",
                    self.pending_count(),
                    cap,
                )

        if not self._evict_pending_on_pressure:
            if self._cache_dir_total_bytes() > self._max_cache_bytes:
                logger.warning(
                    "[US_21] Cache > PERSISTENCE_MAX_CACHE_BYTES nhưng không evict pending (mặc định an toàn).",
                )
            return

        max_evictions = 50_000
        n = 0
        while self._cache_dir_total_bytes() > self._max_cache_bytes and n < max_evictions:
            n += 1
            if not self.evict_oldest_pending(reason="PERSISTENCE_MAX_CACHE_BYTES"):
                logger.warning(
                    "[US_21] Cache vượt ngưỡng nhưng không còn pending để evict — cần tăng ổ hoặc giảm vi phạm offline.",
                )
                break

        total = self._cache_dir_total_bytes()
        if total > self._max_cache_bytes:
            logger.warning(
                "[US_21] Sau evict, cache ~%s MB vẫn > %s MB.",
                round(total / (1024 * 1024), 1),
                round(self._max_cache_bytes / (1024 * 1024), 1),
            )

    def _maybe_warn_pending_size(self) -> None:
        n = self.pending_count()
        if n >= self._max_pending_warn:
            logger.warning(
                "[US_21] Hàng đợi SQLite có %s bản ghi pending — kiểm tra mạng / backend.",
                n,
            )


def image_path_to_base64(image_path: str) -> str:
    raw = Path(image_path).read_bytes()
    return base64.b64encode(raw).decode("ascii")
