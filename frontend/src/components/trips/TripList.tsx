import { Eye, Loader2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TripRow } from "@/types/trip";
import { TRIP_STATUS_LABEL, tripStatusBadgeCn } from "@/lib/tripStatusDisplay";

type TripListProps = {
  trips: TripRow[];
  loading: boolean;
  resolveProvinceName: (code: string) => string;
  onCreateClick: () => void;
  onTripDetailClick: (tripId: string) => void;
};

function formatDeparture(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TripList({
  trips,
  loading,
  resolveProvinceName,
  onCreateClick,
  onTripDetailClick,
}: TripListProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Quản lý chuyến đi</h1>
          <p className="text-sm text-muted-foreground">
            Danh sách chuyến theo nhà xe — mã chuyến, tuyến, tài xế, xe và trạng thái.
          </p>
        </div>
        <Button type="button" onClick={onCreateClick} className="shrink-0 gap-2">
          <Plus className="h-4 w-4" />
          Tạo chuyến đi
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[120px]">Mã chuyến</TableHead>
              <TableHead>Tuyến đường</TableHead>
              <TableHead>Tài xế</TableHead>
              <TableHead>Biển số xe</TableHead>
              <TableHead>Giờ xuất bến</TableHead>
              <TableHead className="w-[130px]">Trạng thái</TableHead>
              <TableHead className="w-[110px] text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin opacity-70" />
                </TableCell>
              </TableRow>
            ) : trips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Chưa có chuyến đi nào. Nhấn &quot;Tạo chuyến đi&quot; để thêm mới.
                </TableCell>
              </TableRow>
            ) : (
              trips.map((t) => {
                const r = t.route;
                const routeLabel = r
                  ? `${resolveProvinceName(r.start_point)} → ${resolveProvinceName(r.end_point)}`
                  : "—";
                return (
                  <TableRow
                    key={t.id}
                    className="cursor-pointer"
                    onClick={() => onTripDetailClick(t.id)}
                  >
                    <TableCell className="font-mono text-sm font-semibold">{t.trip_code}</TableCell>
                    <TableCell className="max-w-[280px]">
                      <div className="font-medium text-foreground">{routeLabel}</div>
                      {r?.name ? (
                        <div className="text-xs text-muted-foreground line-clamp-1">{r.name}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>{t.driver?.full_name ?? "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{t.vehicle?.license_plate ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{formatDeparture(t.departure_time)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={tripStatusBadgeCn(t.status)}>
                        {TRIP_STATUS_LABEL[t.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTripDetailClick(t.id);
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Chi tiết
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
