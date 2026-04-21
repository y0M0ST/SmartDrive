"""
US_09 — Giả lập GPS theo tuyến DEMO (Đà Nẵng), ping-pong, bearing & tốc độ thực tế hơn.

Chạy: `python gps_simulator.py` (từ thư mục `ai_module`, `.env` có CURRENT_TRIP_ID + MASTER_DEVICE_API_KEY).

Tuỳ chọn env:
  GPS_SIM_STEP_SEC_MIN / GPS_SIM_STEP_SEC_MAX — khoảng nghỉ giữa hai điểm (mặc định 2.0–3.0 giây).
  GPS_SIM_ROUTE_MODE — `pingpong` (mặc định) hoặc `loop` (lặp từ đầu khi tới cuối).
"""

from __future__ import annotations

import logging
import math
import os
import random
import sys
import time
from pathlib import Path
from typing import Iterator, Literal, Tuple

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

Coord = Tuple[float, float]

# Đà Nẵng — đoạn minh hoạ dọc khu vực ven biển Ngũ Hành Sơn / Trường Sa (tọa độ xấp xỉ thực địa, chỉ phục vụ demo phòng thi).
DEMO_ROUTE: list[Coord] = [
    (16.04210, 108.24650),
    (16.04135, 108.24720),
    (16.04055, 108.24795),
    (16.03975, 108.24870),
    (16.03895, 108.24945),
    (16.03815, 108.25020),
    (16.03735, 108.25095),
    (16.03655, 108.25170),
    (16.03575, 108.25245),
    (16.03495, 108.25320),
    (16.03415, 108.25395),
    (16.03335, 108.25470),
    (16.03255, 108.25545),
    (16.03175, 108.25620),
    (16.03095, 108.25695),
    (16.03015, 108.25770),
]


def bearing_degrees(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Góc lệch so với hướng Bắc (0–360), chiều kim đồng hồ — dùng cho heading trên bản đồ (từ điểm 1 → điểm 2).
    Công thức initial bearing (Haversine hướng).
    """
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_lon = math.radians(lon2 - lon1)
    x = math.sin(d_lon) * math.cos(phi2)
    y = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(d_lon)
    brng = math.degrees(math.atan2(x, y))
    return (brng + 360.0) % 360.0


def _next_index_pingpong(idx: int, step: int, n: int) -> tuple[int, int]:
    """Bước một chỉ số; đảo chiều ở hai đầu mảng."""
    nxt = idx + step
    if 0 <= nxt < n:
        return nxt, step
    step = -step
    nxt = idx + step
    return nxt, step


def _next_index_loop(idx: int, step: int, n: int) -> tuple[int, int]:
    """Luôn tiến về phía trước; hết cuối thì nhảy về 0."""
    nxt = idx + step
    if nxt >= n:
        return 0, step
    if nxt < 0:
        return n - 1, step
    return nxt, step


def iter_route_playback(
    route: list[Coord],
    mode: Literal["pingpong", "loop"],
) -> Iterator[tuple[float, float, float]]:
    """
    Lần lượt phát ra (lat, lon, heading) — heading từ điểm hiện tại tới điểm sắp tới theo hướng di chuyển.
    """
    n = len(route)
    if n < 2:
        raise ValueError("DEMO_ROUTE cần ít nhất 2 điểm.")

    idx, step = 0, 1
    advance = _next_index_pingpong if mode == "pingpong" else _next_index_loop

    while True:
        lat, lon = route[idx]
        nxt, step = advance(idx, step, n)
        hdg = bearing_degrees(lat, lon, route[nxt][0], route[nxt][1])
        yield lat, lon, hdg
        idx = nxt


def _step_delay_sec() -> float:
    lo = float(os.getenv("GPS_SIM_STEP_SEC_MIN", "2.0"))
    hi = float(os.getenv("GPS_SIM_STEP_SEC_MAX", "3.0"))
    if hi < lo:
        lo, hi = hi, lo
    return random.uniform(lo, hi)


def _route_mode() -> Literal["pingpong", "loop"]:
    raw = (os.getenv("GPS_SIM_ROUTE_MODE") or "pingpong").strip().lower()
    return "loop" if raw == "loop" else "pingpong"


def _demo_speed_kmh() -> float:
    return random.uniform(30.0, 50.0)


def main() -> int:
    trip_id = (os.getenv("CURRENT_TRIP_ID") or "").strip()
    if not trip_id:
        logger.error("Thiếu CURRENT_TRIP_ID trong .env — dừng.")
        return 1

    mode = _route_mode()
    logger.info(
        "GPS route simulator | trip=%s… | %d điểm | mode=%s | Ctrl+C dừng",
        trip_id[:8],
        len(DEMO_ROUTE),
        mode,
    )

    try:
        playback = iter_route_playback(DEMO_ROUTE, mode)
        for lat, lon, heading in playback:
            speed = _demo_speed_kmh()
            try:
                ok = send_gps_point(
                    trip_id=trip_id,
                    latitude=lat,
                    longitude=lon,
                    speed=speed,
                    heading=heading,
                )
            except Exception as e:  # noqa: BLE001 — không sập demo
                logger.exception("Gửi GPS lỗi không mong đợi: %s", e)
                ok = False

            if ok:
                logger.info(
                    "GPS ok | lat=%.6f lng=%.6f | spd=%.1f km/h | hdg=%.1f°",
                    lat,
                    lon,
                    speed,
                    heading,
                )
            else:
                logger.warning("GPS gửi thất bại — chờ bước tiếp theo.")

            time.sleep(_step_delay_sec())

    except KeyboardInterrupt:
        logger.info("Đã dừng (Ctrl+C).")
        return 0
    except ValueError as e:
        logger.error("%s", e)
        return 1
    except Exception as e:  # noqa: BLE001
        logger.exception("Lỗi không mong đợi: %s", e)
        return 1


if __name__ == "__main__":
    sys.exit(main())
