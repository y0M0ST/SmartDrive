import { Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AgencyViolationListItem } from "@/types/violation";
import { VIOLATION_TYPE_LABEL, violationTypeBadgeClass } from "@/lib/violationTypeDisplay";
import { ViolationEvidenceThumb } from "./ViolationEvidenceThumb";
import { VN_IANA } from "@/lib/vnDateRange";

type ViolationDataTableProps = {
  rows: AgencyViolationListItem[];
  loading: boolean;
  resolveProvinceName: (code: string) => string;
  onRowClick: (row: AgencyViolationListItem) => void;
};

function formatOccurred(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return formatInTimeZone(d, VN_IANA, "dd/MM/yyyy HH:mm");
}

function routeLabel(row: AgencyViolationListItem, resolveProvinceName: (c: string) => string): string {
  const r = row.trip?.route;
  if (!r?.start_point && !r?.end_point) return "—";
  const a = r.start_point ? resolveProvinceName(r.start_point) : "—";
  const b = r.end_point ? resolveProvinceName(r.end_point) : "—";
  return `${a} → ${b}`;
}

export function ViolationDataTable({
  rows,
  loading,
  resolveProvinceName,
  onRowClick,
}: ViolationDataTableProps) {
  const { resolvedTheme } = useTheme();
  const [themeReady, setThemeReady] = useState(false);
  useEffect(() => setThemeReady(true), []);
  const isDark = themeReady && resolvedTheme === "dark";

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[150px]">Thời gian</TableHead>
            <TableHead>Tài xế</TableHead>
            <TableHead className="w-[110px]">Biển số</TableHead>
            <TableHead>Tuyến đường</TableHead>
            <TableHead className="w-[150px]">Loại vi phạm</TableHead>
            <TableHead className="w-[100px] text-center">Bằng chứng</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                <Loader2 className="mx-auto h-8 w-8 animate-spin opacity-70" aria-hidden />
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                Không có bản ghi vi phạm trong khoảng đã chọn.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => {
              const typeKey = row.type as keyof typeof VIOLATION_TYPE_LABEL;
              const label = VIOLATION_TYPE_LABEL[typeKey] ?? row.type;
              return (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => onRowClick(row)}
                >
                  <TableCell className="whitespace-nowrap font-mono text-sm">
                    {formatOccurred(row.occurred_at)}
                  </TableCell>
                  <TableCell className="font-medium">{row.trip?.driver?.full_name ?? "—"}</TableCell>
                  <TableCell className="font-mono text-sm">{row.trip?.vehicle?.license_plate ?? "—"}</TableCell>
                  <TableCell className="max-w-[280px]">
                    <div className="text-sm">{routeLabel(row, resolveProvinceName)}</div>
                    {row.trip?.route?.name ? (
                      <div className="line-clamp-1 text-xs text-muted-foreground">{row.trip.route.name}</div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={violationTypeBadgeClass(row.type, isDark)}>
                      {label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      type="button"
                      className="mx-auto inline-flex rounded-lg outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRowClick(row);
                      }}
                      aria-label="Xem ảnh bằng chứng"
                    >
                      <ViolationEvidenceThumb src={row.image_url} alt={label} />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
