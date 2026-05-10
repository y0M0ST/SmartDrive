"""
Gửi GPS định kỳ lên Backend (mô phỏng thiết bị / US_09).

  cd ai_module
  pip install -r requirements.txt   # requests, python-dotenv
  # .env: MASTER_DEVICE_API_KEY, CURRENT_TRIP_ID (UUID chuyến IN_PROGRESS)
  # tuỳ chọn: SMARTDRIVE_DEVICE_GPS_URL, EDGE_DEFAULT_LAT, EDGE_DEFAULT_LNG
  python send_gps.py

Thoát: Ctrl+C
"""

from __future__ import annotations

import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv

_ENV = Path(__file__).resolve().parent / ".env"
load_dotenv(_ENV)

GPS_URL = (os.getenv("SMARTDRIVE_DEVICE_GPS_URL") or "http://localhost:3000/api/device/gps").strip()
API_KEY = (os.getenv("MASTER_DEVICE_API_KEY") or "").strip()
TRIP_ID = (os.getenv("CURRENT_TRIP_ID") or "").strip()

# Điểm khởi tạo (có thể ghi đè bằng .env)
_lat0 = float(os.getenv("GPS_SIM_START_LAT", os.getenv("EDGE_DEFAULT_LAT", "16.047")))
_lng0 = float(os.getenv("GPS_SIM_START_LNG", os.getenv("EDGE_DEFAULT_LNG", "108.21")))

# Mỗi vòng tăng nhẹ để thấy xe “chạy” (~ hàng chục mét tùy vĩ độ)
DLAT = float(os.getenv("GPS_SIM_DLAT", "0.00012"))
DLNG = float(os.getenv("GPS_SIM_DLNG", "0.00015"))
INTERVAL_SEC = float(os.getenv("GPS_SIM_INTERVAL_SEC", "3"))
SPEED_KMH = float(os.getenv("GPS_SIM_SPEED", "42"))
HEADING_DEG = float(os.getenv("GPS_SIM_HEADING", "95"))


def main() -> int:
    if not API_KEY:
        print("Thiếu MASTER_DEVICE_API_KEY trong .env.", file=sys.stderr)
        return 1
    if not TRIP_ID:
        print("Thiếu CURRENT_TRIP_ID (UUID chuyến IN_PROGRESS) trong .env.", file=sys.stderr)
        return 1

    lat, lng = _lat0, _lng0
    headers = {
        "x-device-api-key": API_KEY,
        "Content-Type": "application/json",
    }

    print(f"POST mỗi {INTERVAL_SEC}s → {GPS_URL}")
    print(f"trip_id={TRIP_ID[:8]}…")

    try:
        while True:
            recorded_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            body = {
                "trip_id": TRIP_ID,
                "latitude": round(lat, 7),
                "longitude": round(lng, 7),
                "speed": SPEED_KMH,
                "heading": HEADING_DEG,
                "recorded_at": recorded_at,
            }
            try:
                r = requests.post(GPS_URL, json=body, headers=headers, timeout=10)
                if 200 <= r.status_code < 300:
                    print(f"OK {r.status_code} | lat={body['latitude']:.6f} lng={body['longitude']:.6f} | {recorded_at}")
                else:
                    print(f"HTTP {r.status_code}: {(r.text or '')[:400]}")
            except requests.RequestException as e:
                print(f"Lỗi mạng: {e}")

            lat += DLAT
            lng += DLNG
            time.sleep(INTERVAL_SEC)
    except KeyboardInterrupt:
        print("\nĐã dừng.")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
