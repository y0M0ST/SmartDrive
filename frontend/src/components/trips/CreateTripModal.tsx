import { useCallback, useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { routeApi } from "@/services/routeApi";
import { tripApi } from "@/services/tripApi";

type VehicleOption = { id: string; license_plate: string; status: string };

type RouteOption = {
  id: string;
  name: string;
  start_point: string;
  end_point: string;
  estimated_hours: number;
};

type DriverOption = { id: string; full_name: string };

const createTripFormSchema = z.object({
  route_id: z.string().uuid("Chọn tuyến đường"),
  vehicle_id: z.string().uuid("Chọn xe"),
  driver_id: z.string().uuid("Chọn tài xế"),
  departure_time: z.string().min(1, "Chọn giờ xuất bến"),
}).superRefine((data, ctx) => {
  const d = new Date(data.departure_time);
  if (Number.isNaN(d.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Thời gian không hợp lệ",
      path: ["departure_time"],
    });
    return;
  }
  if (d.getTime() < Date.now() - 60_000) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Giờ xuất bến không được trong quá khứ",
      path: ["departure_time"],
    });
  }
});

type CreateTripFormValues = z.infer<typeof createTripFormSchema>;

function unwrapRouteList(res: unknown): RouteOption[] {
  const r = res as { data?: { data?: RouteOption[] | { data?: RouteOption[] } } };
  const inner = r.data?.data;
  let raw: RouteOption[] = [];
  if (Array.isArray(inner)) raw = inner;
  else if (inner && typeof inner === "object" && Array.isArray((inner as { data?: RouteOption[] }).data)) {
    raw = (inner as { data: RouteOption[] }).data;
  }
  return raw.map((row) => ({
    ...row,
    estimated_hours: typeof row.estimated_hours === "number" ? row.estimated_hours : Number(row.estimated_hours) || 0,
  }));
}

function unwrapAvailableList<T>(res: unknown): T[] {
  const d = (res as { data?: { data?: T[] } })?.data?.data;
  return Array.isArray(d) ? d : [];
}

function getApiMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const m = error.response?.data?.message;
    if (typeof m === "string" && m.trim()) return m;
  }
  return "Đã có lỗi xảy ra.";
}

type CreateTripModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void | Promise<void>;
};

export default function CreateTripModal({ open, onOpenChange, onCreated }: CreateTripModalProps) {
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CreateTripFormValues>({
    resolver: zodResolver(createTripFormSchema),
    defaultValues: {
      route_id: "",
      vehicle_id: "",
      driver_id: "",
      departure_time: "",
    },
  });

  const routeId = form.watch("route_id");
  const departureTime = form.watch("departure_time");
  const departureField = form.register("departure_time");

  const loadRoutes = useCallback(async () => {
    setRoutesLoading(true);
    try {
      const routeRes = await routeApi.getList({ page: 1, limit: 200 });
      setRoutes(unwrapRouteList(routeRes));
    } catch {
      toast.error("Không tải được danh sách tuyến.");
      setRoutes([]);
    } finally {
      setRoutesLoading(false);
    }
  }, []);

  const fetchAvailability = useCallback(async () => {
    const rid = form.getValues("route_id");
    const depStr = form.getValues("departure_time");
    const route = routes.find((r) => r.id === rid);
    if (!rid || !depStr || !route || !(route.estimated_hours > 0)) {
      setVehicles([]);
      setDrivers([]);
      return;
    }
    const dep = new Date(depStr);
    if (Number.isNaN(dep.getTime())) {
      setVehicles([]);
      setDrivers([]);
      return;
    }
    const plannedEnd = new Date(dep.getTime() + route.estimated_hours * 60 * 60 * 1000);
    setAvailabilityLoading(true);
    try {
      const params = {
        departure_time: dep.toISOString(),
        planned_end_time: plannedEnd.toISOString(),
      };
      const [drRes, vRes] = await Promise.all([
        tripApi.getAvailableDrivers(params),
        tripApi.getAvailableVehicles(params),
      ]);
      const driverList = unwrapAvailableList<DriverOption>(drRes);
      const vehicleList = unwrapAvailableList<VehicleOption>(vRes);
      setDrivers(driverList);
      setVehicles(vehicleList);

      const vid = form.getValues("vehicle_id");
      const did = form.getValues("driver_id");
      if (vid && !vehicleList.some((v) => v.id === vid)) form.setValue("vehicle_id", "");
      if (did && !driverList.some((d) => d.id === did)) form.setValue("driver_id", "");
    } catch {
      toast.error("Không tải được danh sách xe/tài xế khả dụng.");
      setVehicles([]);
      setDrivers([]);
    } finally {
      setAvailabilityLoading(false);
    }
  }, [routes, form]);

  useEffect(() => {
    if (!open) return;
    void loadRoutes();
    form.reset({
      route_id: "",
      vehicle_id: "",
      driver_id: "",
      departure_time: "",
    });
    setVehicles([]);
    setDrivers([]);
  }, [open, loadRoutes, form]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      void fetchAvailability();
    }, 400);
    return () => window.clearTimeout(t);
  }, [open, routeId, departureTime, routes, fetchAvailability]);

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await tripApi.create({
        route_id: values.route_id,
        vehicle_id: values.vehicle_id,
        driver_id: values.driver_id,
        departure_time: new Date(values.departure_time).toISOString(),
      });
      toast.success("Đã tạo chuyến đi thành công.");
      onOpenChange(false);
      await onCreated();
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 409) {
        toast.error("Tài xế hoặc xe đã trùng lịch");
        return;
      }
      toast.error(getApiMessage(error));
    } finally {
      setSubmitting(false);
    }
  });

  const slotReady =
    Boolean(routeId) &&
    Boolean(departureTime) &&
    routes.some((r) => r.id === routeId) &&
    !Number.isNaN(new Date(departureTime).getTime());

  const selectsDisabled = routesLoading || !slotReady || availabilityLoading;
  const availabilityHint = !routesLoading && slotReady
    ? availabilityLoading
      ? "Đang kiểm tra lịch trống…"
      : "Chỉ hiển thị xe và tài xế còn trống lịch trong khung giờ này."
    : "Chọn tuyến đường và giờ xuất bến để tải xe/tài xế khả dụng.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tạo chuyến đi mới</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tuyến đường</Label>
            <Controller
              name="route_id"
              control={form.control}
              render={({ field }) => (
                <Select
                  disabled={routesLoading}
                  value={field.value || undefined}
                  onValueChange={(v) => {
                    field.onChange(v);
                    form.setValue("vehicle_id", "");
                    form.setValue("driver_id", "");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={routesLoading ? "Đang tải…" : "Chọn tuyến"} />
                  </SelectTrigger>
                  <SelectContent>
                    {routes.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.route_id ? (
              <p className="text-sm text-destructive">{form.formState.errors.route_id.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="departure_time">Giờ xuất bến</Label>
            <Input
              id="departure_time"
              type="datetime-local"
              step={60}
              disabled={routesLoading}
              {...departureField}
              onChange={(e) => {
                departureField.onChange(e);
                form.setValue("vehicle_id", "");
                form.setValue("driver_id", "");
              }}
            />
            {form.formState.errors.departure_time ? (
              <p className="text-sm text-destructive">{form.formState.errors.departure_time.message}</p>
            ) : null}
          </div>

          <p className="text-xs text-muted-foreground">{availabilityHint}</p>

          <div className="space-y-2">
            <Label>Xe</Label>
            <Controller
              name="vehicle_id"
              control={form.control}
              render={({ field }) => (
                <Select
                  disabled={selectsDisabled}
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        !slotReady
                          ? "Chọn tuyến và giờ trước"
                          : availabilityLoading
                            ? "Đang kiểm tra…"
                            : vehicles.length
                              ? "Chọn xe"
                              : "Không có xe trống lịch"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.license_plate}
                        {v.status !== "AVAILABLE" ? ` (${v.status})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.vehicle_id ? (
              <p className="text-sm text-destructive">{form.formState.errors.vehicle_id.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Tài xế</Label>
            <Controller
              name="driver_id"
              control={form.control}
              render={({ field }) => (
                <Select
                  disabled={selectsDisabled}
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        !slotReady
                          ? "Chọn tuyến và giờ trước"
                          : availabilityLoading
                            ? "Đang kiểm tra…"
                            : drivers.length
                              ? "Chọn tài xế"
                              : "Không có tài xế trống lịch"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.driver_id ? (
              <p className="text-sm text-destructive">{form.formState.errors.driver_id.message}</p>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Hủy
            </Button>
            <Button type="submit" disabled={submitting || routesLoading || selectsDisabled}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang lưu…
                </>
              ) : (
                "Tạo chuyến"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
