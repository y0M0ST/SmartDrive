/**
 * US_16 — Lịch sử vi phạm cá nhân (Cổng tài xế).
 *
 * PHẦN 1 — Khám sức khỏe Backend (GET /api/driver/violations):
 * 1) Trường UI: `id`, `occurred_at` (ISO string), `trip_code`, `type`, `image_url`,
 *    `coordinates: { latitude, longitude }` (+ `trip_id`). Đủ cho thẻ + lightbox.
 * 2) Phân trang: `{ data: [...], meta: { total, page, limit, totalPages } }` trong
 *    `ServiceResponse` → client đọc `response.data.data`.
 * 3) Query: `month` (bắt buộc, `YYYY-MM`), `tripCode` (tuỳ chọn), `page`, `limit`.
 */
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { driverApi, unwrapDriverViolations } from "@/services/driverApi";
import type { DriverViolationListItem } from "@/types/driverViolations";
import type { DriverViolationsMeta } from "@/types/driverViolations";
import { vnCurrentYearMonth, vnYearMonthOptions } from "@/lib/vnDateRange";
import { DriverViolationsFilterBar } from "@/components/driver-portal/violations/DriverViolationsFilterBar";
import { DriverViolationCard } from "@/components/driver-portal/violations/DriverViolationCard";
import { DriverViolationsEmptyState } from "@/components/driver-portal/violations/DriverViolationsEmptyState";
import { DriverViolationImageLightbox } from "@/components/driver-portal/violations/DriverViolationImageLightbox";
import { Button } from "@/components/ui/button";

const PAGE_LIMIT = 15;
const MONTH_OPTIONS = vnYearMonthOptions(18);

const emptyMeta: DriverViolationsMeta = { total: 0, page: 1, limit: PAGE_LIMIT, totalPages: 0 };

export default function DriverViolationsPage() {
  const [month, setMonth] = useState(() => vnCurrentYearMonth());
  const [tripInput, setTripInput] = useState("");
  const [tripQuery, setTripQuery] = useState("");

  const [items, setItems] = useState<DriverViolationListItem[]>([]);
  const [meta, setMeta] = useState<DriverViolationsMeta>(emptyMeta);
  const [loadedPage, setLoadedPage] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [lightboxItem, setLightboxItem] = useState<DriverViolationListItem | null>(null);

  const fetchPage = useCallback(
    async (page: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const res = await driverApi.getMyViolations({
          month,
          tripCode: tripQuery.trim() || undefined,
          page,
          limit: PAGE_LIMIT,
        });
        const parsed = unwrapDriverViolations(res);
        if (!parsed) {
          if (!append) {
            setItems([]);
            setMeta(emptyMeta);
            setLoadedPage(0);
          }
          toast.error("Không đọc được dữ liệu từ máy chủ.");
          return;
        }
        setMeta(parsed.meta);
        setLoadedPage(page);
        setItems((prev) => (append ? [...prev, ...parsed.data] : parsed.data));
      } catch (e: unknown) {
        if (!append) {
          setItems([]);
          setMeta(emptyMeta);
          setLoadedPage(0);
        }
        const msg =
          e && typeof e === "object" && "response" in e
            ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? "")
            : "";
        toast.error(msg || "Không tải được lịch sử vi phạm.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [month, tripQuery],
  );

  useEffect(() => {
    void fetchPage(1, false);
  }, [fetchPage]);

  const applyTripFilter = useCallback(() => {
    setTripQuery(tripInput.trim());
  }, [tripInput]);

  const onMonthChange = useCallback((ym: string) => {
    setMonth(ym);
    setTripInput("");
    setTripQuery("");
  }, []);

  const canLoadMore = loadedPage > 0 && meta.totalPages > 0 && loadedPage < meta.totalPages;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5 pb-4 md:max-w-3xl md:gap-6 md:pb-0">
      <div>
        <h1 className="text-xl font-black tracking-tight text-foreground md:text-3xl">Lịch sử vi phạm</h1>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          Các sự kiện AI ghi nhận trên chuyến của bạn trong tháng đã chọn.
        </p>
      </div>

      <DriverViolationsFilterBar
        month={month}
        monthOptions={MONTH_OPTIONS}
        onMonthChange={onMonthChange}
        tripCodeInput={tripInput}
        onTripCodeInputChange={setTripInput}
        onApplyTripFilter={applyTripFilter}
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <Loader2 className="size-9 animate-spin text-blue-600 dark:text-blue-400" aria-hidden />
          <p className="text-sm font-medium">Đang tải…</p>
        </div>
      ) : items.length === 0 ? (
        <DriverViolationsEmptyState />
      ) : (
        <>
          <ul className="flex flex-col gap-3 md:gap-4">
            {items.map((v) => (
              <li key={v.id}>
                <DriverViolationCard item={v} onOpenDetail={setLightboxItem} />
              </li>
            ))}
          </ul>

          {canLoadMore ? (
            <div className="flex justify-center pt-1">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-12 min-w-[11rem] rounded-2xl text-sm font-extrabold"
                disabled={loadingMore}
                onClick={() => void fetchPage(loadedPage + 1, true)}
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                    Đang tải…
                  </>
                ) : (
                  "Xem thêm"
                )}
              </Button>
            </div>
          ) : null}

          <p className="text-center text-[11px] text-muted-foreground">
            Hiển thị {items.length} / {meta.total} bản ghi
            {meta.totalPages > 1 ? ` · Trang ${loadedPage}/${meta.totalPages}` : ""}
          </p>
        </>
      )}

      <DriverViolationImageLightbox
        open={!!lightboxItem}
        item={lightboxItem}
        onClose={() => setLightboxItem(null)}
      />
    </div>
  );
}
