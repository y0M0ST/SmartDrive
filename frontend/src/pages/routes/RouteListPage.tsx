import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { routeApi } from "@/services/routeApi";
import { provinceApi, type VietnamProvinceDto } from "@/services/provinceApi";
import {
  fetchMapboxDrivingRoute,
  formatDurationVi,
  metersToKmOneDecimal,
} from "@/lib/mapboxDirections";

type RouteStatus = "ACTIVE" | "SUSPENDED";

interface RouteRow {
  id: string;
  name: string;
  start_point: string;
  end_point: string;
  distance_km: number;
  estimated_hours: number;
  status: RouteStatus;
}

function unwrapRouteList(res: unknown): RouteRow[] {
  const r = res as { data?: { data?: RouteRow[] | { data?: RouteRow[] } } };
  const inner = r.data?.data;
  if (Array.isArray(inner)) return inner;
  if (inner && typeof inner === "object" && Array.isArray((inner as { data?: RouteRow[] }).data)) {
    return (inner as { data: RouteRow[] }).data;
  }
  return [];
}

/** Axios response — body ServiceResponse, mảng tỉnh nằm ở `data`. */
function unwrapProvinceList(res: { data?: { data?: VietnamProvinceDto[] } }): VietnamProvinceDto[] {
  const d = res.data?.data;
  return Array.isArray(d) ? d : [];
}

function getApiMessage(error: unknown): string {
  const ax = error as { response?: { data?: { message?: string } } };
  const m = ax.response?.data?.message;
  return typeof m === "string" && m.trim() ? m : "Đã có lỗi xảy ra.";
}

export default function RouteListPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [provinces, setProvinces] = useState<VietnamProvinceDto[]>([]);
  const [provincesLoading, setProvincesLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    startPoint: "",
    endPoint: "",
    distance: "",
    durationText: "",
    estimatedHours: "",
  });

  const provinceByCode = useMemo(() => {
    const m = new Map<string, VietnamProvinceDto>();
    provinces.forEach((p) => m.set(p.code, p));
    return m;
  }, [provinces]);

  const resolveName = useCallback(
    (code: string) => provinceByCode.get(code)?.name ?? code,
    [provinceByCode],
  );

  const fetchProvinces = useCallback(async () => {
    setProvincesLoading(true);
    try {
      const res = await provinceApi.list();
      setProvinces(unwrapProvinceList(res));
    } catch {
      toast.error("Không tải được danh mục tỉnh/thành.");
      setProvinces([]);
    } finally {
      setProvincesLoading(false);
    }
  }, []);

  const fetchRoutes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await routeApi.getList();
      setRoutes(unwrapRouteList(res));
    } catch {
      toast.error("Không thể tải danh sách tuyến đường.");
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProvinces();
  }, [fetchProvinces]);

  useEffect(() => {
    void fetchRoutes();
  }, [fetchRoutes]);

  /** Mapbox: khi đủ 2 điểm (mã tỉnh) và khác nhau. */
  useEffect(() => {
    if (!isDialogOpen) return;
    const start = formData.startPoint;
    const end = formData.endPoint;
    if (!start || !end || start === end) {
      setFormData((prev) => {
        if (prev.distance === "" && prev.durationText === "" && prev.estimatedHours === "") return prev;
        return { ...prev, distance: "", durationText: "", estimatedHours: "" };
      });
      return;
    }

    const p1 = provinceByCode.get(start);
    const p2 = provinceByCode.get(end);
    if (!p1 || !p2) return;

    const token = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined)?.trim();
    if (!token) {
      toast.error(
        "Chưa có token Mapbox (VITE_MAPBOX_TOKEN). Kiểm tra: (1) dòng VITE_MAPBOX_TOKEN=pk… nằm trong frontend/.env và đã Ctrl+S lưu file; (2) đã tắt và chạy lại npm run dev — Vite chỉ đọc .env khi khởi động.",
        { duration: 12_000 },
      );
      return;
    }

    let cancelled = false;
    (async () => {
      setIsCalculating(true);
      try {
        const { distanceM, durationSec } = await fetchMapboxDrivingRoute({
          accessToken: token,
          lat1: p1.lat,
          lng1: p1.lng,
          lat2: p2.lat,
          lng2: p2.lng,
        });
        if (cancelled) return;
        setFormData((prev) => ({
          ...prev,
          distance: metersToKmOneDecimal(distanceM),
          durationText: formatDurationVi(durationSec),
          estimatedHours: (Math.round((durationSec / 3600) * 100) / 100).toFixed(2),
        }));
      } catch (e: unknown) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Mapbox không trả về lộ trình hợp lệ.");
        }
      } finally {
        if (!cancelled) setIsCalculating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    formData.startPoint,
    formData.endPoint,
    provinceByCode,
    isDialogOpen,
  ]);

  const resetForm = () => {
    setFormData({
      name: "",
      startPoint: "",
      endPoint: "",
      distance: "",
      durationText: "",
      estimatedHours: "",
    });
    setEditingRoute(null);
    setIsCalculating(false);
  };

  const openCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const toggleStatus = async (route: RouteRow) => {
    try {
      const next: RouteStatus = route.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
      await routeApi.changeStatus(route.id, { status: next });
      toast.success("Đã cập nhật trạng thái.");
      void fetchRoutes();
    } catch (error: unknown) {
      toast.error(getApiMessage(error));
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.startPoint || !formData.endPoint) {
      toast.error("Vui lòng điền đầy đủ tên tuyến và chọn điểm đi / điểm đến.");
      return;
    }
    if (formData.startPoint === formData.endPoint) {
      toast.error("Điểm đi và điểm đến không được trùng nhau.");
      return;
    }
    const distanceKm = Number(formData.distance);
    const estHours = Number(formData.estimatedHours);
    if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
      toast.error("Cự ly (km) phải là số dương — chọn hai tỉnh để hệ thống tính hoặc nhập tay.");
      return;
    }
    if (!Number.isFinite(estHours) || estHours <= 0) {
      toast.error("Thời gian dự kiến chưa hợp lệ — chờ tính toán Mapbox hoặc kiểm tra token.");
      return;
    }

    const payload = {
      name: formData.name.trim(),
      start_point: formData.startPoint,
      end_point: formData.endPoint,
      distance_km: distanceKm,
      estimated_hours: estHours,
    };

    try {
      if (editingRoute) {
        await routeApi.update(editingRoute.id, payload);
        toast.success("Cập nhật tuyến thành công.");
      } else {
        await routeApi.create(payload);
        toast.success("Thêm tuyến thành công.");
      }
      setIsDialogOpen(false);
      resetForm();
      void fetchRoutes();
    } catch (error: unknown) {
      toast.error(getApiMessage(error));
    }
  };

  const handleDelete = async (route: RouteRow) => {
    if (route.status === "ACTIVE") {
      toast.error("Tạm ngưng tuyến trước khi xóa.");
      return;
    }
    if (!confirm(`Xóa tuyến «${route.name}»?`)) return;
    try {
      await routeApi.delete(route.id);
      toast.success("Đã xóa tuyến đường.");
      void fetchRoutes();
    } catch (error: unknown) {
      toast.error(getApiMessage(error));
    }
  };

  const handleEdit = (route: RouteRow) => {
    setEditingRoute(route);
    const sec = Math.round(route.estimated_hours * 3600);
    setFormData({
      name: route.name,
      startPoint: route.start_point,
      endPoint: route.end_point,
      distance: String(route.distance_km),
      durationText: formatDurationVi(sec),
      estimatedHours: route.estimated_hours.toFixed(2),
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="min-h-0 space-y-6 text-foreground transition-colors">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-3xl font-black tracking-tight">Quản lý tuyến đường</h1>
        <Button
          type="button"
          onClick={openCreate}
          className="rounded-xl bg-blue-600 font-bold hover:bg-blue-700"
          disabled={provincesLoading || provinces.length === 0}
        >
          <Plus className="mr-2 h-4 w-4" /> Thêm tuyến đường mới
        </Button>
      </div>

      <Card className="overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50 [&_tr]:border-border">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-[70px] text-center font-bold">STT</TableHead>
                <TableHead className="font-bold">Tên tuyến</TableHead>
                <TableHead className="font-bold">Điểm đi</TableHead>
                <TableHead className="font-bold">Điểm đến</TableHead>
                <TableHead className="font-bold">Cự ly</TableHead>
                <TableHead className="font-bold">Thời gian</TableHead>
                <TableHead className="font-bold">Trạng thái</TableHead>
                <TableHead className="text-center font-bold">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    Đang tải…
                  </TableCell>
                </TableRow>
              ) : (
                routes.map((route, index) => (
                  <TableRow key={route.id} className="border-border hover:bg-muted/40">
                    <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-semibold text-primary">{route.name}</TableCell>
                    <TableCell className="text-foreground">{resolveName(route.start_point)}</TableCell>
                    <TableCell className="text-foreground">{resolveName(route.end_point)}</TableCell>
                    <TableCell className="text-muted-foreground">{route.distance_km} km</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDurationVi(Math.round(route.estimated_hours * 3600))}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void toggleStatus(route)}
                        className={`h-8 rounded-full border-none px-3 font-bold ${
                          route.status === "ACTIVE"
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-red-100 text-red-700 hover:bg-red-200"
                        }`}
                      >
                        {route.status === "ACTIVE" ? "Đang khai thác" : "Tạm ngưng"}
                      </Button>
                    </TableCell>
                    <TableCell className="space-x-2 text-center">
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleEdit(route)}>
                        <Pencil className="h-4 w-4 text-amber-500" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => void handleDelete(route)}>
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="overflow-visible rounded-2xl border border-border bg-card text-card-foreground shadow-xl sm:max-w-[500px]">
          <DialogHeader className="border-b border-border pb-4">
            <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
              {editingRoute ? "Cập nhật tuyến đường" : "Thêm tuyến đường mới"}
            </DialogTitle>
          </DialogHeader>

          <div className="relative grid gap-6 py-6">
            {isCalculating && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-xl bg-background/75 backdrop-blur-[2px]">
                <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
                <p className="text-sm font-bold text-foreground">Đang tính toán…</p>
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-semibold text-muted-foreground">Tên tuyến</Label>
              <Input
                className="col-span-3 h-11 border-border bg-background transition-all"
                placeholder="VD: Đà Nẵng — Huế"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-bold text-foreground">Điểm đi</Label>
              <div className="col-span-3">
                <Select
                  value={formData.startPoint || undefined}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, startPoint: v }))}
                  disabled={provincesLoading}
                >
                  <SelectTrigger className="h-11 border-2 border-border bg-background font-medium">
                    <SelectValue placeholder={provincesLoading ? "Đang tải…" : "Chọn điểm đi"} />
                  </SelectTrigger>
                  <SelectContent className="z-[9999] max-h-72 border-2 border-border bg-popover text-popover-foreground">
                    {provinces.map((p) => (
                      <SelectItem
                        key={p.code}
                        value={p.code}
                        className="cursor-pointer rounded-lg py-3 font-medium focus:bg-blue-50 focus:text-blue-700 hover:bg-blue-50 hover:text-blue-700"
                      >
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-bold text-foreground">Điểm đến</Label>
              <div className="col-span-3">
                <Select
                  value={formData.endPoint || undefined}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, endPoint: v }))}
                  disabled={provincesLoading}
                >
                  <SelectTrigger className="h-11 border-2 border-border bg-background font-medium">
                    <SelectValue placeholder={provincesLoading ? "Đang tải…" : "Chọn điểm đến"} />
                  </SelectTrigger>
                  <SelectContent className="z-[9999] max-h-72 border-2 border-border bg-popover text-popover-foreground">
                    {provinces.map((p) => (
                      <SelectItem
                        key={p.code}
                        value={p.code}
                        className="cursor-pointer rounded-lg py-3 font-medium focus:bg-blue-50 focus:text-blue-700 hover:bg-blue-50 hover:text-blue-700"
                      >
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-2">
              <div className="space-y-2 px-1 text-left">
                <Label className="ml-1 font-semibold text-muted-foreground">Khoảng cách (km)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    className="h-11 border-border bg-background pr-10 font-bold text-foreground"
                    value={formData.distance}
                    onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    km
                  </span>
                </div>
              </div>

              <div className="space-y-2 px-1 text-left">
                <Label className="ml-1 font-semibold text-muted-foreground">Thời gian dự kiến</Label>
                <Input
                  readOnly
                  className="h-11 cursor-default border-border bg-muted/50 font-semibold text-foreground"
                  placeholder="Chọn đủ 2 tỉnh để tự tính"
                  value={formData.durationText}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2 border-t border-border bg-muted/40 p-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsDialogOpen(false);
                resetForm();
              }}
              className="font-semibold text-muted-foreground"
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={isCalculating}
              className="bg-blue-600 px-8 font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
            >
              Lưu tuyến đường
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
