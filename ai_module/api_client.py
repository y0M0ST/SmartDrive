"""
US_20 — Gửi sự kiện vi phạm AI lên Backend (multipart / device ingest).

Gọi từ luồng camera chính qua thread riêng để không block OpenCV.
"""

from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

import cv2
import numpy as np
import requests

logger = logging.getLogger(__name__)

# --- Cấu hình (ưu tiên biến môi trường, fallback cho dev local) ---
BACKEND_URL = os.getenv(
    "SMARTDRIVE_DEVICE_INGEST_URL",
    "http://localhost:3000/api/device/violations",
)
API_KEY = os.getenv("MASTER_DEVICE_API_KEY", "")

REQUEST_TIMEOUT_SEC = float(os.getenv("SMARTDRIVE_DEVICE_REQUEST_TIMEOUT", "5"))

_ALLOWED_TYPES = frozenset({"DROWSY", "DISTRACTED"})


def send_violation(
    image_frame: np.ndarray,
    trip_id: str,
    violation_type: str,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
) -> bool:
    """
    Encode frame JPG trong RAM và POST multipart tới `/api/device/violations`.

    :param image_frame: BGR numpy array (OpenCV).
    :param trip_id: UUID chuyến (string).
    :param violation_type: "DROWSY" hoặc "DISTRACTED".
    :param lat, lng: Tọa độ tùy chọn.
    :return: True nếu HTTP 2xx; False nếu lỗi mạng/HTTP/encode (không ném exception ra ngoài).
    """
    if not API_KEY:
        logger.warning(
            "MASTER_DEVICE_API_KEY chưa được cấu hình — bỏ qua gửi vi phạm (thiết lập trong .env).",
        )
        return False

    vt = (violation_type or "").strip().upper()
    if vt not in _ALLOWED_TYPES:
        logger.warning("violation_type không hợp lệ: %r (chỉ DROWSY | DISTRACTED)", violation_type)
        return False

    ok, buf = cv2.imencode(".jpg", image_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
    if not ok or buf is None:
        logger.warning("cv2.imencode JPG thất bại — không gửi vi phạm.")
        return False

    image_bytes = buf.tobytes()
    device_event_id = uuid.uuid4().hex
    occurred_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    payload: dict[str, Any] = {
        "deviceEventId": device_event_id,
        "tripId": trip_id,
        "type": vt,
        "occurredAt": occurred_at,
    }
    if lat is not None:
        payload["latitude"] = float(lat)
    if lng is not None:
        payload["longitude"] = float(lng)

    json_string = json.dumps(payload, separators=(",", ":"))

    files = {
        "image": ("evidence.jpg", image_bytes, "image/jpeg"),
    }
    form_data = {"data": json_string}
    headers = {"x-device-api-key": API_KEY}

    try:
        resp = requests.post(
            BACKEND_URL,
            files=files,
            data=form_data,
            headers=headers,
            timeout=REQUEST_TIMEOUT_SEC,
        )
        if 200 <= resp.status_code < 300:
            return True
        logger.warning(
            "Ingest vi phạm HTTP %s: %s",
            resp.status_code,
            (resp.text or "")[:500],
        )
        return False
    except requests.Timeout:
        logger.warning("Ingest vi phạm timeout sau %ss — bỏ qua.", REQUEST_TIMEOUT_SEC)
        return False
    except requests.RequestException as e:
        logger.warning("Ingest vi phạm lỗi mạng: %s", e)
        return False
    except Exception as e:  # noqa: BLE001 — không để crash luồng gọi
        logger.exception("Ingest vi phạm lỗi không mong đợi: %s", e)
        return False
