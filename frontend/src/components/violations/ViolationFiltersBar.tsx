import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ViolationDateRangePicker } from "./ViolationDateRangePicker";

const ALL = "__all__";

export type DriverOption = { id: string; full_name: string };
export type VehicleOption = { id: string; license_plate: string };

type ViolationFiltersBarProps = {
  dateFrom: string;
  dateTo: string;
  onDateRangeChange: (r: { from: string; to: string }) => void;
  driverId: string;
  onDriverIdChange: (id: string) => void;
  drivers: DriverOption[];
  driversLoading?: boolean;
  vehicleId: string;
  onVehicleIdChange: (id: string) => void;
  vehicles: VehicleOption[];
  vehiclesLoading?: boolean;
  violationType: string;
  onViolationTypeChange: (type: string) => void;
  onReset: () => void;
};

export function ViolationFiltersBar({
  dateFrom,
  dateTo,
  onDateRangeChange,
  driverId,
  onDriverIdChange,
  drivers,
  driversLoading,
  vehicleId,
  onVehicleIdChange,
  vehicles,
  vehiclesLoading,
  violationType,
  onViolationTypeChange,
  onReset,
}: ViolationFiltersBarProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/50 p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex min-w-[200px] flex-col gap-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Khoảng thời gian
          </Label>
          <ViolationDateRangePicker from={dateFrom} to={dateTo} onRangeChange={onDateRangeChange} />
        </div>

        <div className="flex min-w-[200px] flex-col gap-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tài xế
          </Label>
          <Select
            value={driverId || ALL}
            onValueChange={(v) => onDriverIdChange(v === ALL ? "" : v)}
            disabled={driversLoading}
          >
            <SelectTrigger className="h-10 w-[220px] max-w-full">
              <SelectValue placeholder={driversLoading ? "Đang tải…" : "Tất cả tài xế"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tất cả tài xế</SelectItem>
              {drivers.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-[200px] flex-col gap-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Biển số xe
          </Label>
          <Select
            value={vehicleId || ALL}
            onValueChange={(v) => onVehicleIdChange(v === ALL ? "" : v)}
            disabled={vehiclesLoading}
          >
            <SelectTrigger className="h-10 w-[200px] max-w-full">
              <SelectValue placeholder={vehiclesLoading ? "Đang tải…" : "Tất cả xe"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tất cả xe</SelectItem>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.license_plate}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-[180px] flex-col gap-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Loại vi phạm
          </Label>
          <Select value={violationType || ALL} onValueChange={(v) => onViolationTypeChange(v === ALL ? "" : v)}>
            <SelectTrigger className="h-10 w-[200px] max-w-full">
              <SelectValue placeholder="Tất cả loại" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tất cả loại</SelectItem>
              <SelectItem value="DROWSY">Buồn ngủ (DROWSY)</SelectItem>
              <SelectItem value="DISTRACTED">Mất tập trung (DISTRACTED)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="button" variant="secondary" className="h-10 shrink-0" onClick={onReset}>
          Xóa lọc
        </Button>
      </div>
    </div>
  );
}
