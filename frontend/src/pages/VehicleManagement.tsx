import { useState, useMemo, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { AxiosError } from "axios";
import api from "@/services/api";
import VehicleModal, {
  type VehicleModalInitial,
  type VehicleStatusCode,
  type VehicleTypeCode,
} from "@/components/VehicleModal";
import ConfirmModal from "@/components/ConfirmModal";

/** Khớp entity `vehicles` từ BE */
export interface VehicleRow {
  id: string;
  license_plate: string;
  type: VehicleTypeCode;
  capacity: number;
  status: VehicleStatusCode;
  ai_camera_id: string | null;
}

function unwrapVehicleList(res: { data?: { data?: VehicleRow[] | { data?: VehicleRow[] } } }): VehicleRow[] {
  const inner = res.data?.data;
  if (Array.isArray(inner)) return inner;
  if (inner && typeof inner === "object" && Array.isArray((inner as { data?: VehicleRow[] }).data)) {
    return (inner as { data: VehicleRow[] }).data;
  }
  return [];
}

const TYPE_LABEL: Record<VehicleTypeCode, string> = {
  SEAT: "Ghế ngồi",
  SLEEPER: "Giường nằm",
};

const STATUS_LABEL: Record<VehicleStatusCode, string> = {
  AVAILABLE: "Sẵn sàng",
  IN_SERVICE: "Đang chạy",
  MAINTENANCE: "Bảo dưỡng",
  INACTIVE: "Không hoạt động",
};

/** Tách theo theme để tránh `dark:` ghi đè `bg-*` đặc (badge bị nền mờ / chữ mất tương phản). */
function statusBadgeClass(s: VehicleStatusCode, isDark: boolean): string {
  if (isDark) {
    switch (s) {
      case "AVAILABLE":
        return "bg-green-900/30 text-green-400 shadow-none";
      case "MAINTENANCE":
        return "bg-orange-900/30 text-orange-400 shadow-none";
      case "INACTIVE":
        return "bg-muted text-muted-foreground shadow-none";
      default:
        return "bg-blue-900/30 text-blue-400 shadow-none";
    }
  }
  switch (s) {
    case "AVAILABLE":
      return "bg-emerald-700 text-white shadow-sm";
    case "MAINTENANCE":
      return "bg-orange-700 text-white shadow-sm";
    case "INACTIVE":
      return "bg-slate-700 text-white shadow-sm";
    default:
      return "bg-blue-700 text-white shadow-sm";
  }
}

function getApiMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const m = error.response?.data?.message;
    if (typeof m === "string" && m.trim()) return m;
  }
  return "Đã có lỗi xảy ra.";
}

export default function VehicleManagement() {
  const { resolvedTheme } = useTheme();
  const [themeReady, setThemeReady] = useState(false);
  useEffect(() => setThemeReady(true), []);
  const isDark = themeReady && resolvedTheme === "dark";

  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [filterCapacity, setFilterCapacity] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleModalInitial | null>(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<VehicleRow | null>(null);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/vehicles");
      setVehicles(unwrapVehicleList(response));
    } catch {
      toast.error("Không tải được danh sách xe.");
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchVehicles();
  }, [fetchVehicles]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const plate = v.license_plate?.toLowerCase() || "";
      const matchSearch = plate.includes(appliedSearch.toLowerCase());
      const matchType = filterType === "" || v.type === filterType;
      const matchCapacity = filterCapacity === "" || String(v.capacity) === filterCapacity;
      const matchStatus = filterStatus === "" || v.status === filterStatus;
      return matchSearch && matchType && matchCapacity && matchStatus;
    });
  }, [vehicles, appliedSearch, filterType, filterCapacity, filterStatus]);

  const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage) || 1;

  const currentVehicles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredVehicles.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredVehicles, currentPage]);

  const handleExecuteSearch = () => {
    setAppliedSearch(searchInput.trim());
    setCurrentPage(1);
  };

  const handleOpenAddModal = () => {
    setModalMode("add");
    setSelectedVehicle(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (vehicle: VehicleRow) => {
    setModalMode("edit");
    setSelectedVehicle({
      id: vehicle.id,
      license_plate: vehicle.license_plate,
      type: vehicle.type,
      capacity: vehicle.capacity as 16 | 29 | 45,
      status: vehicle.status,
      ai_camera_id: vehicle.ai_camera_id,
    });
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!vehicleToDelete) return;
    try {
      await api.delete(`/vehicles/${vehicleToDelete.id}`);
      toast.success("Đã xóa phương tiện.");
      await fetchVehicles();
      setIsConfirmOpen(false);
      setVehicleToDelete(null);
    } catch (error: unknown) {
      const msg = getApiMessage(error);
      if (vehicleToDelete.status === "IN_SERVICE" || msg.toLowerCase().includes("đang chạy")) {
        toast.error("Không thể xóa xe đang ở trạng thái Đang chạy.");
      } else {
        toast.error(msg);
      }
      setIsConfirmOpen(false);
    }
  };

  const handleDeleteClick = (vehicle: VehicleRow) => {
    setVehicleToDelete(vehicle);
    setIsConfirmOpen(true);
  };

  return (
    <div className="w-full space-y-6 text-foreground transition-colors duration-300">
      <div className="overflow-y-auto px-0 py-0">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-3xl font-black tracking-tight">Quản lý xe</h1>

          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Nhập biển số xe..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleExecuteSearch()}
                className="w-52 rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-5">
              <button
                type="button"
                onClick={handleExecuteSearch}
                className="flex items-center gap-2 text-[14px] font-bold text-muted-foreground transition-colors hover:text-primary"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Tìm kiếm
              </button>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none transition-colors"
                >
                  <option value="">Loại xe</option>
                  <option value="SEAT">Ghế ngồi</option>
                  <option value="SLEEPER">Giường nằm</option>
                </select>

                <select
                  value={filterCapacity}
                  onChange={(e) => setFilterCapacity(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none transition-colors"
                >
                  <option value="">Số chỗ</option>
                  <option value="16">16 chỗ</option>
                  <option value="29">29 chỗ</option>
                  <option value="45">45 chỗ</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none transition-colors"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="AVAILABLE">Sẵn sàng</option>
                  <option value="IN_SERVICE">Đang chạy</option>
                  <option value="MAINTENANCE">Bảo dưỡng</option>
                  <option value="INACTIVE">Không hoạt động</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="ml-2 flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/30 transition-all hover:bg-blue-700"
            >
              <span className="text-lg leading-none">+</span> Thêm xe mới
            </button>
          </div>
        </div>

        <div className="flex min-h-[500px] w-full flex-col overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-sm">
          <div className="w-full flex-1 overflow-hidden">
            <table className="w-full text-left text-[14px] text-muted-foreground">
              <thead className="border-b border-border bg-muted/50">
                <tr className="h-14 text-foreground">
                  <th className="w-20 px-6 py-4 text-center">STT</th>
                  <th className="px-6 py-4">Biển số xe</th>
                  <th className="px-6 py-4">Loại xe</th>
                  <th className="px-6 py-4 text-center">Số chỗ</th>
                  <th className="px-6 py-4 text-center">Trạng thái</th>
                  <th className="px-6 py-4">Mã camera</th>
                  <th className="px-6 py-4 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  [...Array(itemsPerPage)].map((_, i) => (
                    <tr key={`skeleton-${i}`} className="h-14 animate-pulse">
                      <td className="px-6 text-center">
                        <div className="mx-auto h-4 w-8 rounded bg-muted" />
                      </td>
                      <td className="px-6">
                        <div className="h-4 w-32 rounded bg-muted" />
                      </td>
                      <td className="px-6">
                        <div className="h-4 w-24 rounded bg-muted" />
                      </td>
                      <td className="px-6 text-center">
                        <div className="mx-auto h-4 w-10 rounded bg-muted" />
                      </td>
                      <td className="px-6 text-center">
                        <div className="mx-auto h-6 w-24 rounded-full bg-muted" />
                      </td>
                      <td className="px-6">
                        <div className="h-4 w-20 rounded bg-muted" />
                      </td>
                      <td className="px-6">
                        <div className="mx-auto h-8 w-16 rounded-lg bg-muted" />
                      </td>
                    </tr>
                  ))
                ) : currentVehicles.length > 0 ? (
                  currentVehicles.map((v, index) => (
                    <tr key={v.id} className="h-14 text-muted-foreground transition-colors hover:bg-muted/40">
                      <td className="px-6 text-center font-medium text-muted-foreground">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="cursor-pointer px-6 font-bold uppercase text-primary">{v.license_plate}</td>
                      <td className="px-6 font-medium">{TYPE_LABEL[v.type] ?? v.type}</td>
                      <td className="px-6 text-center font-medium">{v.capacity}</td>
                      <td className="px-6 text-center">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[12px] font-bold ${statusBadgeClass(v.status, isDark)}`}
                        >
                          {STATUS_LABEL[v.status] ?? v.status}
                        </span>
                      </td>
                      <td className="px-6 font-medium text-muted-foreground">{v.ai_camera_id || "—"}</td>
                      <td className="flex h-14 items-center justify-center gap-3 px-6">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(v)}
                          className="text-amber-500 transition-transform hover:scale-110 hover:text-amber-600"
                          title="Sửa"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(v)}
                          className="text-muted-foreground transition-transform hover:scale-110 hover:text-red-500"
                          title="Xóa"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-muted-foreground">
                      Không tìm thấy xe nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-auto flex items-center justify-between border-t border-border bg-muted/30 p-4">
              <span className="text-sm font-medium text-muted-foreground">
                Đang hiển thị{" "}
                <span className="font-bold text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> đến{" "}
                <span className="font-bold text-foreground">
                  {Math.min(currentPage * itemsPerPage, filteredVehicles.length)}
                </span>{" "}
                của {filteredVehicles.length} xe
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="flex size-8 items-center justify-center rounded-lg border border-border text-foreground transition-all hover:bg-muted disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    type="button"
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`flex size-8 items-center justify-center rounded-lg text-sm font-bold transition-all ${
                      currentPage === i + 1
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="flex size-8 items-center justify-center rounded-lg border border-border text-foreground transition-all hover:bg-muted disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <VehicleModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedVehicle(null);
        }}
        mode={modalMode}
        initialData={selectedVehicle}
        onConfirm={() => void fetchVehicles()}
      />

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => void handleConfirmDelete()}
        title="Xóa xe"
        message="Bạn có chắc chắn muốn xóa xe mang biển số"
        itemName={vehicleToDelete?.license_plate || ""}
      />
    </div>
  );
}
