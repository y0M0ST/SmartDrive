"""
US_10 — Gửi một vi phạm AI giả lập (JSON) tới `POST /api/device/violation`.

Chạy: `python violation_simulator.py` (thư mục `ai_module`, `.env` có CURRENT_TRIP_ID + MASTER_DEVICE_API_KEY).
"""

from __future__ import annotations

import logging
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

_ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(_ENV_PATH)

from api_client import send_violation_json  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("violation_simulator")

# PNG 1×1 pixel (nhỏ) — đủ để Cloudinary/base64 pipeline demo; không cần file ảnh thật.
_MOCK_PNG_BASE64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


def main() -> int:
    trip_id = (os.getenv("CURRENT_TRIP_ID") or "").strip()
    if not trip_id:
        logger.error("Thiếu CURRENT_TRIP_ID trong .env.")
        return 1

    device_event_id = uuid.uuid4().hex
    occurred = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    try:
        ok = send_violation_json(
            trip_id=trip_id,
            violation_type="DROWSY",
            image_base64=_MOCK_PNG_BASE64,
            device_event_id=device_event_id,
            lat=16.04,
            lng=108.25,
            occurred_at_iso=occurred,
        )
    except Exception as e:  # noqa: BLE001
        logger.exception("Lỗi khi gọi send_violation_json: %s", e)
        return 1

    if ok:
        logger.info("Đã gửi vi phạm demo | device_event_id=%s", device_event_id[:16] + "…")
        return 0
    logger.warning("Gửi vi phạm thất bại (xem log api_client).")
    return 1


if __name__ == "__main__":
    sys.exit(main())
