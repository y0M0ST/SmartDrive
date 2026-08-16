/** Khớp `VehicleType` / `VehicleStatus` backend */
export type VehicleTypeCode = "SEAT" | "SLEEPER";
export type VehicleStatusCode = "AVAILABLE" | "IN_SERVICE" | "MAINTENANCE" | "INACTIVE";

export const VEHICLE_TYPE_LABEL: Record<VehicleTypeCode, string> = {
  SEAT: "Ghế ngồi",
  SLEEPER: "Giường nằm",
};

export const VEHICLE_STATUS_LABEL: Record<VehicleStatusCode, string> = {
  AVAILABLE: "Sẵn sàng",
  IN_SERVICE: "Đang chạy",
  MAINTENANCE: "Bảo dưỡng",
  INACTIVE: "Không hoạt động",
};

const UNKNOWN_LABEL = "Không xác định";

export function vehicleTypeLabel(type: string | null | undefined): string {
  if (!type?.trim()) return UNKNOWN_LABEL;
  const key = type.trim() as VehicleTypeCode;
  return VEHICLE_TYPE_LABEL[key] ?? UNKNOWN_LABEL;
}

export function vehicleStatusLabel(status: string | null | undefined): string {
  if (!status?.trim()) return UNKNOWN_LABEL;
  const key = status.trim() as VehicleStatusCode;
  return VEHICLE_STATUS_LABEL[key] ?? UNKNOWN_LABEL;
}
