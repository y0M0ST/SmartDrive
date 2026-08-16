"""
US_20 / US_10 — Gửi vi phạm AI lên Backend: multipart (`/api/device/violations`),
JSON (`/api/device/violation`), GPS (`/api/device/gps`).

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
GPS_INGEST_URL = os.getenv(
    "SMARTDRIVE_DEVICE_GPS_URL",
    "http://localhost:3000/api/device/gps",
)
VIOLATION_JSON_URL = os.getenv(
    "SMARTDRIVE_DEVICE_VIOLATION_JSON_URL",
    "http://localhost:3000/api/device/violation",
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


def send_gps_point(
    trip_id: str,
    latitude: float,
    longitude: float,
    speed: float,
    heading: Optional[float] = None,
) -> bool:
    """
    US_09 — POST JSON tới `/api/device/gps` (header `x-device-api-key`).

    :return: True nếu HTTP 2xx; False nếu lỗi (không ném exception ra ngoài).
    """
    if not API_KEY:
        logger.warning(
            "MASTER_DEVICE_API_KEY chưa được cấu hình — bỏ qua gửi GPS (thiết lập trong .env).",
        )
        return False

    tid = (trip_id or "").strip()
    if not tid:
        logger.warning("send_gps_point: trip_id rỗng.")
        return False

    payload: dict[str, Any] = {
        "trip_id": tid,
        "latitude": float(latitude),
        "longitude": float(longitude),
        "speed": float(speed),
    }
    if heading is not None:
        payload["heading"] = float(heading)

    headers = {
        "x-device-api-key": API_KEY,
        "Content-Type": "application/json",
    }

    try:
        resp = requests.post(
            GPS_INGEST_URL,
            json=payload,
            headers=headers,
            timeout=REQUEST_TIMEOUT_SEC,
        )
        if 200 <= resp.status_code < 300:
            return True
        logger.warning(
            "Ingest GPS HTTP %s: %s",
            resp.status_code,
            (resp.text or "")[:500],
        )
        return False
    except requests.Timeout:
        logger.warning("Ingest GPS timeout sau %ss — bỏ qua.", REQUEST_TIMEOUT_SEC)
        return False
    except requests.RequestException as e:
        logger.warning("Ingest GPS lỗi mạng: %s", e)
        return False
    except Exception as e:  # noqa: BLE001
        logger.exception("Ingest GPS lỗi không mong đợi: %s", e)
        return False


def send_violation_json_detailed(
    trip_id: str,
    violation_type: str,
    *,
    image_base64: Optional[str] = None,
    image_url: Optional[str] = None,
    device_event_id: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    occurred_at_iso: Optional[str] = None,
    device_api_key: Optional[str] = None,
) -> bool:
    """
    US_10 — POST JSON tới `/api/device/violation` (header `x-device-api-key`).

    Phải cung cấp đúng một trong hai: `image_base64` hoặc `image_url`.

    :param device_api_key: Ghi đè `MASTER_DEVICE_API_KEY` (ví dụ từ `smartdrive_edge_ai` sau `load_dotenv`).
    :return: (ok, status_code, body_text) để caller quyết định retry/drop.
    """
    key = (device_api_key or "").strip() or (API_KEY or "").strip() or os.getenv("MASTER_DEVICE_API_KEY", "").strip()
    if not key:
        logger.warning(
            "MASTER_DEVICE_API_KEY chưa được cấu hình — bỏ qua gửi vi phạm JSON (thiếu header x-device-api-key).",
        )
        return False, None, ""

    tid = (trip_id or "").strip()
    if not tid:
        logger.warning("send_violation_json: trip_id rỗng.")
        return False, None, ""

    vt = (violation_type or "").strip().upper()
    if vt not in _ALLOWED_TYPES:
        logger.warning("send_violation_json: violation_type không hợp lệ: %r", violation_type)
        return False, None, ""

    b64 = (image_base64 or "").strip() or None
    url = (image_url or "").strip() or None
    if bool(b64) == bool(url):
        logger.warning("send_violation_json: cần đúng một trong image_base64 hoặc image_url.")
        return False, None, ""

    eid = (device_event_id or "").strip() or uuid.uuid4().hex

    payload: dict[str, Any] = {
        "device_event_id": eid,
        "trip_id": tid,
        "violation_type": vt,
    }
    if b64:
        payload["image_base64"] = b64
    else:
        payload["image_url"] = url
    if lat is not None:
        payload["latitude"] = float(lat)
    if lng is not None:
        payload["longitude"] = float(lng)
    if occurred_at_iso:
        payload["occurred_at"] = occurred_at_iso

    headers = {
        "x-device-api-key": key,
        "Content-Type": "application/json",
    }

    try:
        resp = requests.post(
            VIOLATION_JSON_URL,
            json=payload,
            headers=headers,
            timeout=REQUEST_TIMEOUT_SEC,
        )
        if 200 <= resp.status_code < 300:
            return True, resp.status_code, (resp.text or "")
        logger.warning(
            "Ingest vi phạm JSON HTTP %s: %s",
            resp.status_code,
            (resp.text or "")[:500],
        )
        return False, resp.status_code, (resp.text or "")
    except requests.Timeout:
        logger.warning("Ingest vi phạm JSON timeout sau %ss.", REQUEST_TIMEOUT_SEC)
        return False, None, ""
    except requests.RequestException as e:
        logger.warning("Ingest vi phạm JSON lỗi mạng: %s", e)
        return False, None, ""
    except Exception as e:  # noqa: BLE001
        logger.exception("Ingest vi phạm JSON lỗi không mong đợi: %s", e)
        return False, None, ""


def send_violation_json(
    trip_id: str,
    violation_type: str,
    *,
    image_base64: Optional[str] = None,
    image_url: Optional[str] = None,
    device_event_id: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    occurred_at_iso: Optional[str] = None,
    device_api_key: Optional[str] = None,
) -> bool:
    """Backward-compatible wrapper: chỉ trả về thành công/thất bại."""
    ok, _status, _body = send_violation_json_detailed(
        trip_id,
        violation_type,
        image_base64=image_base64,
        image_url=image_url,
        device_event_id=device_event_id,
        lat=lat,
        lng=lng,
        occurred_at_iso=occurred_at_iso,
        device_api_key=device_api_key,
    )
    return ok
