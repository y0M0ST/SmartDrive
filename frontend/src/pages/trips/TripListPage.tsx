import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TripList from "@/components/trips/TripList";
import CreateTripModal from "@/components/trips/CreateTripModal";
import TripDetailModal from "@/components/trips/TripDetailModal";
import { tripApi } from "@/services/tripApi";
import { provinceApi, type VietnamProvinceDto } from "@/services/provinceApi";
import type { TripRow } from "@/types/trip";

const PAGE_SIZE = 10;

type ListMeta = { total: number; currentPage: number; totalPages: number };

function unwrapTripList(res: unknown): { trips: TripRow[]; meta: ListMeta } {
  const r = res as {
    data?: {
      data?: TripRow[] | { data?: TripRow[]; meta?: Partial<ListMeta> };
    };
  };
  const inner = r.data?.data;
  if (Array.isArray(inner)) {
    return {
      trips: inner,
      meta: { total: inner.length, currentPage: 1, totalPages: 1 },
    };
  }
  if (inner && typeof inner === "object") {
    const data = (inner as { data?: TripRow[] }).data;
    const m = (inner as { meta?: Partial<ListMeta> }).meta;
    if (Array.isArray(data)) {
      return {
        trips: data,
        meta: {
          total: typeof m?.total === "number" ? m.total : data.length,
          currentPage: typeof m?.currentPage === "number" ? m.currentPage : 1,
          totalPages: typeof m?.totalPages === "number" ? m.totalPages : 1,
        },
      };
    }
  }
  return { trips: [], meta: { total: 0, currentPage: 1, totalPages: 1 } };
}

function unwrapProvinceList(res: { data?: { data?: VietnamProvinceDto[] } }): VietnamProvinceDto[] {
  const d = res.data?.data;
  return Array.isArray(d) ? d : [];
}

export default function TripListPage() {
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [meta, setMeta] = useState<ListMeta>({ total: 0, currentPage: 1, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailTripId, setDetailTripId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [provinces, setProvinces] = useState<VietnamProvinceDto[]>([]);

  const provinceByCode = useMemo(() => {
    const m = new Map<string, VietnamProvinceDto>();
    provinces.forEach((p) => m.set(p.code, p));
    return m;
  }, [provinces]);

  const resolveProvinceName = useCallback(
    (code: string) => provinceByCode.get(code)?.name ?? code,
    [provinceByCode],
  );

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tripApi.getList({ page, limit: PAGE_SIZE });
      const { trips: rows, meta: m } = unwrapTripList(res);
      setTrips(rows);
      setMeta(m);
    } catch {
      toast.error("Không tải được danh sách chuyến đi.");
      setTrips([]);
      setMeta({ total: 0, currentPage: 1, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void fetchTrips();
  }, [fetchTrips]);

  const openTripDetail = useCallback((id: string) => {
    setDetailTripId(id);
    setDetailOpen(true);
  }, []);

  const onDetailModalOpenChange = useCallback((open: boolean) => {
    setDetailOpen(open);
    if (!open) setDetailTripId(null);
  }, []);

  const refreshAfterCreate = useCallback(async () => {
    setPage(1);
    setLoading(true);
    try {
      const res = await tripApi.getList({ page: 1, limit: PAGE_SIZE });
      const { trips: rows, meta: m } = unwrapTripList(res);
      setTrips(rows);
      setMeta(m);
    } catch {
      toast.error("Không tải được danh sách chuyến đi.");
    } finally {
      setLoading(false);
    }
  }, []);

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

  return (
    <div className="p-6 lg:p-8">
      <Card className="border-none shadow-none lg:border lg:border-border lg:shadow-sm">
        <CardContent className="p-0 lg:p-6">
          <TripList
            trips={trips}
            loading={loading}
            resolveProvinceName={resolveProvinceName}
            onCreateClick={() => setModalOpen(true)}
            onTripDetailClick={openTripDetail}
          />

          {meta.totalPages > 1 ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
              <span>
                Trang {meta.currentPage} / {meta.totalPages} — {meta.total} chuyến
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

      <CreateTripModal open={modalOpen} onOpenChange={setModalOpen} onCreated={refreshAfterCreate} />

      <TripDetailModal
        open={detailOpen}
        tripId={detailTripId}
        onOpenChange={onDetailModalOpenChange}
        resolveProvinceName={resolveProvinceName}
      />
    </div>
  );
}
