import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ViolationFiltersBar } from "@/components/violations/ViolationFiltersBar";
import { ViolationDataTable } from "@/components/violations/ViolationDataTable";
import { ViolationDetailModal } from "@/components/violations/ViolationDetailModal";
import { violationApi, unwrapViolationList } from "@/services/violationApi";
import { provinceApi, type VietnamProvinceDto } from "@/services/provinceApi";
import { adminApi } from "@/services/adminApi";
import api from "@/services/api";
import type { AgencyViolationListItem } from "@/types/violation";
import { vnTodayYmd } from "@/lib/vnDateRange";

type VehicleApiRow = { id: string; license_plate: string };

const PAGE_SIZE = 10;

type ListMeta = { total: number; currentPage: number; totalPages: number; limit: number };

function unwrapProvinceList(res: { data?: { data?: VietnamProvinceDto[] } }): VietnamProvinceDto[] {
  const d = res.data?.data;
  return Array.isArray(d) ? d : [];
}

function unwrapVehicleList(res: { data?: { data?: VehicleApiRow[] | { data?: VehicleApiRow[] } } }): VehicleApiRow[] {
  const inner = res.data?.data;
  if (Array.isArray(inner)) return inner;
  if (inner && typeof inner === "object" && Array.isArray((inner as { data?: VehicleApiRow[] }).data)) {
    return (inner as { data: VehicleApiRow[] }).data;
  }
  return [];
}

export default function ViolationListPage() {
  const today = useMemo(() => {
    const y = vnTodayYmd();
    return { from: y, to: y };
  }, []);

  const [dateFrom, setDateFrom] = useState(today.from);
  const [dateTo, setDateTo] = useState(today.to);
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [violationType, setViolationType] = useState("");

  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AgencyViolationListItem[]>([]);
  const [meta, setMeta] = useState<ListMeta>({
    total: 0,
    currentPage: 1,
    totalPages: 1,
    limit: PAGE_SIZE,
  });
  const [loading, setLoading] = useState(true);

  const [provinces, setProvinces] = useState<VietnamProvinceDto[]>([]);
  const [driverRoleId, setDriverRoleId] = useState("");
  const [drivers, setDrivers] = useState<{ id: string; full_name: string }[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [vehicles, setVehicles] = useState<{ id: string; license_plate: string }[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<AgencyViolationListItem | null>(null);

  const provinceByCode = useMemo(() => {
    const m = new Map<string, VietnamProvinceDto>();
    provinces.forEach((p) => m.set(p.code, p));
    return m;
  }, [provinces]);

  const resolveProvinceName = useCallback(
    (code: string) => provinceByCode.get(code)?.name ?? code,
    [provinceByCode],
  );

  const fetchViolations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await violationApi.getList({
        page,
        limit: PAGE_SIZE,
        startDate: dateFrom,
        endDate: dateTo,
        ...(driverId ? { driverId } : {}),
        ...(vehicleId ? { vehicleId } : {}),
        ...(violationType ? { type: violationType as "DROWSY" | "DISTRACTED" } : {}),
      });
      const parsed = unwrapViolationList(res);
      if (!parsed) {
        setRows([]);
        setMeta({ total: 0, currentPage: 1, totalPages: 1, limit: PAGE_SIZE });
        return;
      }
      setRows(parsed.data);
      setMeta({
        total: parsed.meta.total,
        currentPage: parsed.meta.currentPage,
        totalPages: parsed.meta.totalPages,
        limit: parsed.meta.limit,
      });
    } catch {
      toast.error("Không tải được lịch sử vi phạm.");
      setRows([]);
      setMeta({ total: 0, currentPage: 1, totalPages: 1, limit: PAGE_SIZE });
    } finally {
      setLoading(false);
    }
  }, [page, dateFrom, dateTo, driverId, vehicleId, violationType]);

  useEffect(() => {
    void fetchViolations();
  }, [fetchViolations]);

  useEffect(() => {
    (async () => {
      try {
        const res = await provinceApi.list();
        setProvinces(unwrapProvinceList(res));
      } catch {
        setProvinces([]);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminApi.getRoles();
        const list = res.data?.data as { id: string; name: string }[] | undefined;
        const d = Array.isArray(list) ? list.find((r) => r.name === "DRIVER") : undefined;
        if (d) setDriverRoleId(d.id);
      } catch {
        setDriverRoleId("");
      }
    })();
  }, []);

  useEffect(() => {
    if (!driverRoleId) return;
    (async () => {
      setDriversLoading(true);
      try {
        const res = await adminApi.getList({
          page: 1,
          limit: 500,
          role_id: driverRoleId,
        });
        const payload = res.data?.data as
          | { data?: { id: string; full_name: string }[] }
          | undefined;
        const data = Array.isArray(payload?.data) ? payload.data : [];
        setDrivers(data.map((u) => ({ id: u.id, full_name: u.full_name })));
      } catch {
        setDrivers([]);
      } finally {
        setDriversLoading(false);
      }
    })();
  }, [driverRoleId]);

  useEffect(() => {
    (async () => {
      setVehiclesLoading(true);
      try {
        const res = await api.get("/vehicles");
        const list = unwrapVehicleList(res);
        setVehicles(list.map((v) => ({ id: v.id, license_plate: v.license_plate })));
      } catch {
        setVehicles([]);
      } finally {
        setVehiclesLoading(false);
      }
    })();
  }, []);

  const onDateRangeChange = useCallback((r: { from: string; to: string }) => {
    setPage(1);
    setDateFrom(r.from);
    setDateTo(r.to);
  }, []);

  const onDriverIdChange = useCallback((id: string) => {
    setPage(1);
    setDriverId(id);
  }, []);

  const onVehicleIdChange = useCallback((id: string) => {
    setPage(1);
    setVehicleId(id);
  }, []);

  const onViolationTypeChange = useCallback((t: string) => {
    setPage(1);
    setViolationType(t);
  }, []);

  const onReset = useCallback(() => {
    const y = vnTodayYmd();
    setPage(1);
    setDateFrom(y);
    setDateTo(y);
    setDriverId("");
    setVehicleId("");
    setViolationType("");
  }, []);

  const openDetail = useCallback((row: AgencyViolationListItem) => {
    setDetailItem(row);
    setDetailOpen(true);
  }, []);

  const onDetailOpenChange = useCallback((open: boolean) => {
    setDetailOpen(open);
    if (!open) setDetailItem(null);
  }, []);

  return (
    <div className="p-6 lg:p-8">
      <Card className="border-none shadow-none lg:border lg:border-border lg:shadow-sm">
        <CardContent className="space-y-6 p-0 lg:p-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Lịch sử vi phạm AI</h1>
            <p className="text-sm text-muted-foreground">
              Theo dõi bằng chứng hình ảnh, tuyến và tài xế — lọc theo ngày, xe và loại vi phạm.
            </p>
          </div>

          <ViolationFiltersBar
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateRangeChange={onDateRangeChange}
            driverId={driverId}
            onDriverIdChange={onDriverIdChange}
            drivers={drivers}
            driversLoading={driversLoading}
            vehicleId={vehicleId}
            onVehicleIdChange={onVehicleIdChange}
            vehicles={vehicles}
            vehiclesLoading={vehiclesLoading}
            violationType={violationType}
            onViolationTypeChange={onViolationTypeChange}
            onReset={onReset}
          />

          <ViolationDataTable
            rows={rows}
            loading={loading}
            resolveProvinceName={resolveProvinceName}
            onRowClick={openDetail}
          />

          {meta.totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
              <span>
                Trang {meta.currentPage} / {meta.totalPages} — {meta.total} bản ghi
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Trước
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sau
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <ViolationDetailModal open={detailOpen} onOpenChange={onDetailOpenChange} item={detailItem} />
    </div>
  );
}
