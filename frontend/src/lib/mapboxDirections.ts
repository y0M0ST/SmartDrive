/** Khoảng cách mét → km, làm tròn 1 chữ số thập phân (chuỗi hiển thị). */
export function metersToKmOneDecimal(meters: number): string {
  const km = meters / 1000;
  return (Math.round(km * 10) / 10).toFixed(1);
}

/** Thời lượng giây → "X giờ Y phút" (tiếng Việt). */
export function formatDurationVi(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  const hoursPart = h > 0 ? `${h} giờ` : "";
  const minsPart = m > 0 ? `${m} phút` : "";
  if (h === 0 && m === 0) return "0 phút";
  if (h === 0) return minsPart;
  if (m === 0) return hoursPart;
  return `${hoursPart} ${minsPart}`.trim();
}

export type MapboxRouteLeg = { distance: number; duration: number };

export type MapboxDirectionsResult = {
  distanceM: number;
  durationSec: number;
};

/**
 * Mapbox Directions API — tọa độ theo thứ tự lng,lat.
 * @see https://docs.mapbox.com/api/navigation/directions/
 */
export async function fetchMapboxDrivingRoute(params: {
  accessToken: string;
  lat1: number;
  lng1: number;
  lat2: number;
  lng2: number;
}): Promise<MapboxDirectionsResult> {
  const { accessToken, lat1, lng1, lat2, lng2 } = params;
  const coordPath = `${lng1},${lat1};${lng2},${lat2}`;
  const qs = new URLSearchParams({
    access_token: accessToken,
    geometries: "geojson",
  });
  const res = await fetch(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${coordPath}?${qs.toString()}`,
  );
  const json = (await res.json()) as {
    code?: string;
    message?: string;
    routes?: { distance: number; duration: number }[];
  };

  if (!res.ok) {
    const msg = json?.message || json?.code || res.statusText;
    throw new Error(typeof msg === "string" ? msg : "Mapbox Directions lỗi");
  }

  const route0 = json.routes?.[0];
  if (!route0 || typeof route0.distance !== "number" || typeof route0.duration !== "number") {
    throw new Error("Không tìm được lộ trình lái xe giữa hai điểm.");
  }

  return { distanceM: route0.distance, durationSec: route0.duration };
}
