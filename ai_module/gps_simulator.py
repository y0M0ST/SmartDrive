"""
US_09 — Giả lập luồng GPS: đọc CURRENT_TRIP_ID từ `.env`, gửi POST mỗi N giây.

Chạy: `python gps_simulator.py` (từ thư mục `ai_module`, đã cài deps + `.env`).
"""

from __future__ import annotations

import logging
import os
import random
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

_ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(_ENV_PATH)

from api_client import send_gps_point  # noqa: E402 — sau load_dotenv

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("gps_simulator")

INTERVAL_SEC = float(os.getenv("SMARTDRIVE_GPS_SIM_INTERVAL_SEC", "5"))
# Mặc định: gần trung tâm TP.HCM (có thể override bằng env)
LAT0 = float(os.getenv("GPS_SIM_START_LAT", "10.776889"))
LNG0 = float(os.getenv("GPS_SIM_START_LNG", "106.700806"))


def main() -> int:
    trip_id = (os.getenv("CURRENT_TRIP_ID") or "").strip()
    if not trip_id:
        logger.error("Thiếu CURRENT_TRIP_ID trong .env — dừng.")
        return 1

    logger.info(
        "Bắt đầu GPS simulator | trip_id=%s | mỗi %.1fs | Ctrl+C để dừng",
        trip_id[:8] + "...",
        INTERVAL_SEC,
    )

    lat, lng = LAT0, LNG0
    heading = 90.0

    try:
        while True:
            # Di chuyển nhẹ ~15–40 m mỗi lần (đại khái 0.00015–0.0004 độ)
            lat += random.uniform(-0.00025, 0.00025)
            lng += random.uniform(-0.00025, 0.00025)
            heading = (heading + random.uniform(-15, 15)) % 360.0
            speed_kmh = max(0.0, min(120.0, 40.0 + random.uniform(-10, 15)))

            ok = send_gps_point(
                trip_id=trip_id,
                latitude=lat,
                longitude=lng,
                speed=speed_kmh,
                heading=heading,
            )
            if ok:
                logger.info(
                    "Đã gửi GPS lat=%.6f lng=%.6f speed=%.1f h=%.0f",
                    lat,
                    lng,
                    speed_kmh,
                    heading,
                )
            else:
                logger.warning("Gửi GPS thất bại — sẽ thử lại sau %.1fs", INTERVAL_SEC)

            time.sleep(max(1.0, INTERVAL_SEC))
    except KeyboardInterrupt:
        logger.info("Đã dừng theo Ctrl+C.")
        return 0
    except Exception as e:  # noqa: BLE001
        logger.exception("Lỗi không mong đợi: %s", e)
        return 1


if __name__ == "__main__":
    sys.exit(main())
