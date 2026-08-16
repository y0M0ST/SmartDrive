import "leaflet/dist/leaflet.css";
import { memo, useEffect, useMemo } from "react";
import L from "leaflet";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import type { FleetTripView } from "@/lib/tripGpsMerge";
import { isFleetSignalStale } from "@/lib/tripGpsMerge";

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const b = L.latLngBounds(points);
    if (b.isValid()) {
      map.fitBounds(b, { padding: [48, 48], maxZoom: 14 });
    }
  }, [map, points]);
  return null;
}

const VIETNAM_CENTER: [number, number] = [16.047, 108.21];

type TripMarkersProps = {
  trips: FleetTripView[];
  nowMs: number;
  pulse: number;
};

const TripMarkers = memo(function TripMarkers({ trips, nowMs, pulse }: TripMarkersProps) {
  const points = useMemo(() => {
    const out: [number, number][] = [];
    for (const t of trips) {
      if (typeof t.latitude === "number" && typeof t.longitude === "number") {
        out.push([t.latitude, t.longitude]);
      }
    }
    return out;
  }, [trips]);

  return (
    <>
      <FitBounds points={points} />
      {trips.map((t) => {
        if (t.latitude == null || t.longitude == null) return null;
        const stale = isFleetSignalStale(t.effective_last_signal_iso, nowMs);
        const blinkOn = stale && pulse % 2 === 1;
        const fillColor = stale ? (blinkOn ? "#dc2626" : "#64748b") : "#2563eb";
        const stroke = stale ? (blinkOn ? "#991b1b" : "#475569") : "#1e3a8a";
        return (
          <CircleMarker
            key={t.trip_id}
            center={[t.latitude, t.longitude]}
            radius={stale ? 11 : 9}
            pathOptions={{
              color: stroke,
              fillColor,
              fillOpacity: 0.92,
              weight: 2,
            }}
          >
            <Popup>
              <div className="min-w-[200px] space-y-1 text-xs">
                <p className="font-bold text-foreground">{t.license_plate || "—"}</p>
                <p>
                  <span className="text-muted-foreground">Tài xế:</span> {t.driver_name || "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Tốc độ:</span>{" "}
                  {typeof t.speed === "number" && Number.isFinite(t.speed) ? `${Math.round(t.speed)} km/h` : "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Vi phạm:</span> {t.violation_count}
                </p>
                {stale ? (
                  <p className="font-semibold text-destructive">Mất tín hiệu (&gt; 3 phút)</p>
                ) : null}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
});

export type AgencyFleetLeafletMapProps = {
  trips: FleetTripView[];
  nowMs: number;
  pulse: number;
};

/** Leaflet + OSM — không cần Mapbox token. */
export const AgencyFleetLeafletMap = memo(function AgencyFleetLeafletMap({
  trips,
  nowMs,
  pulse,
}: AgencyFleetLeafletMapProps) {
  return (
    <MapContainer
      center={VIETNAM_CENTER}
      zoom={7}
      className="fleet-map-container h-full w-full min-h-0 flex-1 rounded-xl border border-border"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <TripMarkers trips={trips} nowMs={nowMs} pulse={pulse} />
    </MapContainer>
  );
});
