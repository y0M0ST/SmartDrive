import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { adminApi } from "@/services/adminApi";
import { toast } from "sonner";
import { AxiosError } from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import * as Icons from "lucide-react";
import DriverModal from "@/components/DriverModal";
import ConfirmModal from "@/components/ConfirmModal";

const PAGE_SIZE = 10;

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const msg = error.response?.data?.message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return fallback;
}

type UserStatus = "ACTIVE" | "INACTIVE" | "BLOCKED";

interface DriverAccountRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  status: UserStatus;
  driver_code?: string | null;
  license_class?: string | null;
  license_expires_at?: string | null;
  has_driver_profile?: boolean;
}

function formatDateVn(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

type LicenseExpiryState = "missing" | "expired" | "soon" | "valid";

function getLicenseExpiryState(value?: string | null): LicenseExpiryState {
  if (!value) return "missing";
  const expiresAt = new Date(value);
  if (Number.isNaN(expiresAt.getTime())) return "missing";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiresAt.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((expiresAt.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "soon";
  return "valid";
}

function statusBadge(status: UserStatus) {
  switch (status) {
    case "ACTIVE":
      return {
        label: "Hoạt động",
        className:
          "border-green-200 bg-green-50 text-green-600 ring-1 ring-green-200 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400 dark:ring-green-800/60",
      };
    case "BLOCKED":
      return {
        label: "Đã khóa",
        className:
          "border-red-200 bg-red-100 text-red-700 ring-1 ring-red-200 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-800/60",
      };
    default:
      return {
        label: "Không hoạt động",
        className:
          "border-amber-200 bg-amber-50 text-amber-600 ring-1 ring-amber-200 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-800/60",
      };
  }
}

export default function DriverManagement() {
  const [rows, setRows] = useState<DriverAccountRow[]>([]);
  const [meta, setMeta] = useState({ total: 0, currentPage: 1, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [driverRoleId, setDriverRoleId] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedDriver, setSelectedDriver] = useState<DriverAccountRow | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<DriverAccountRow | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const prevDebounced = useRef<string | null>(null);
  useEffect(() => {
    if (prevDebounced.current === null) {
      prevDebounced.current = debouncedSearch;
      return;
    }
    if (prevDebounced.current === debouncedSearch) return;
    prevDebounced.current = debouncedSearch;
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminApi.getRoles();
        const list = res.data?.data as { id: string; name: string }[] | undefined;
        const d = Array.isArray(list) ? list.find((r) => r.name === "DRIVER") : undefined;
        if (d) setDriverRoleId(d.id);
        else toast.error("Không tìm thấy vai trò tài xế trong hệ thống.");
      } catch {
        toast.error("Không tải được danh sách vai trò.");
      }
    })();
  }, []);

  const fetchList = useCallback(async () => {
    if (!driverRoleId) return;
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page,
        limit: PAGE_SIZE,
        role_id: driverRoleId,
      };
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await adminApi.getList(params);
      const payload = res.data?.data as
        | {
            data?: DriverAccountRow[];
            meta?: { total?: number; currentPage?: number; totalPages?: number };
          }
        | undefined;
      const data = Array.isArray(payload?.data) ? payload.data : [];
      const m = payload?.meta;
      setRows(
        data.map((u) => ({
          id: u.id,
          full_name: u.full_name,
          email: u.email,
          phone: u.phone,
          status: (u.status as UserStatus) || "ACTIVE",
          driver_code: u.driver_code ?? null,
          has_driver_profile: Boolean(u.has_driver_profile),
          license_class: typeof u.license_class === "string" ? u.license_class : null,
          license_expires_at:
            typeof u.license_expires_at === "string" ? u.license_expires_at : null,
        })),
      );
      setMeta({
        total: typeof m?.total === "number" ? m.total : data.length,
        currentPage: typeof m?.currentPage === "number" ? m.currentPage : page,
        totalPages:
          typeof m?.totalPages === "number"
            ? m.totalPages
            : Math.max(1, Math.ceil((m?.total ?? data.length) / PAGE_SIZE)),
      });
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Không tải được danh sách tài xế."));
      setRows([]);
      setMeta({ total: 0, currentPage: 1, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, driverRoleId]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const me = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user_info") || "{}") as { id?: string };
    } catch {
      return {};
    }
  }, []);

  const openAdd = () => {
    setModalMode("add");
    setSelectedDriver(null);
    setIsModalOpen(true);
  };

  const openEdit = (d: DriverAccountRow) => {
    setModalMode("edit");
    setSelectedDriver(d);
    setIsModalOpen(true);
  };

  const toggleStatus = async (d: DriverAccountRow) => {
    if (d.id === me.id) {
      toast.error("Bạn không thể đổi trạng thái tài khoản đang đăng nhập.");
      return;
    }
    try {
      const next: UserStatus = d.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";
      await adminApi.changeStatus(d.id, next);
      toast.success(next === "BLOCKED" ? "Đã khóa tài khoản tài xế." : "Đã mở khóa tài khoản tài xế.");
      await fetchList();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Không cập nhật được trạng thái."));
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await adminApi.delete(toDelete.id);
      toast.success("Đã xóa tài khoản khỏi danh sách.");
      setDeleteOpen(false);
      setToDelete(null);
      if (rows.length <= 1 && page > 1) setPage((p) => Math.max(1, p - 1));
      else await fetchList();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Xóa không thành công."));
    }
  };

  const from = meta.total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, meta.total);

  const editInitial =
    modalMode === "edit" && selectedDriver
      ? {
          id: selectedDriver.id,
          full_name: selectedDriver.full_name,
          email: selectedDriver.email,
          phone: selectedDriver.phone,
          status: selectedDriver.status,
          driver_code: selectedDriver.driver_code ?? null,
          has_driver_profile: selectedDriver.has_driver_profile,
        }
      : undefined;

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Tài xế &amp; tài khoản</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Quản lý tài khoản tài xế: tìm kiếm, khóa hoặc xóa. Thêm mới chỉ tạo tài khoản (mật khẩu tạm gửi qua email —
            không ai xem được mật khẩu). Hồ sơ CMND, GPLX và ảnh chân dung bổ sung sau khi bấm Sửa.
          </p>
        </div>
        <Button
          type="button"
          onClick={openAdd}
          disabled={!driverRoleId}
          className="h-11 shrink-0 rounded-xl bg-blue-600 font-bold shadow-lg hover:bg-blue-700"
        >
          <Icons.UserPlus className="mr-2 size-5" />
          Thêm tài xế
        </Button>
      </div>

      <Card className="rounded-3xl border border-border bg-card text-card-foreground shadow-sm">
        <CardHeader className="flex flex-col gap-4 border-b border-border sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-lg font-black">Danh sách tài xế</CardTitle>
            <CardDescription className="text-muted-foreground">
              Chỉ hiển thị tài khoản có vai trò tài xế trong phạm vi nhà xe của bạn.
            </CardDescription>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Icons.Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="rounded-xl border-border bg-muted pl-9"
              placeholder="Tìm theo tên hoặc email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto border-t border-border">
            <Table>
              <TableHeader className="bg-muted/50 [&_tr]:border-gray-200 dark:[&_tr]:border-gray-700">
                <TableRow className="border-gray-200 hover:bg-transparent dark:border-gray-700">
                  <TableHead className="w-14 text-center font-bold">STT</TableHead>
                  <TableHead className="font-bold">Họ và tên</TableHead>
                  <TableHead className="font-bold">Email</TableHead>
                  <TableHead className="font-bold">Điện thoại</TableHead>
                  <TableHead className="font-bold">Hồ sơ TX</TableHead>
                  <TableHead className="font-bold">Hạng bằng lái</TableHead>
                  <TableHead className="font-bold">Ngày hết hạn</TableHead>
                  <TableHead className="font-bold">Trạng thái</TableHead>
                  <TableHead className="text-center font-bold">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!driverRoleId ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                      Đang tải cấu hình…
                    </TableCell>
                  </TableRow>
                ) : loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                      Đang tải…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                      Chưa có tài xế. Bấm &quot;Thêm tài xế&quot; để tạo tài khoản và hồ sơ.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((d, i) => {
                    const sb = statusBadge(d.status);
                    const stt = (page - 1) * PAGE_SIZE + i + 1;
                    return (
                      <TableRow key={d.id} className="border-gray-200 hover:bg-muted/40 dark:border-gray-700">
                        <TableCell className="text-center text-muted-foreground">{stt}</TableCell>
                        <TableCell className="font-bold text-foreground">{d.full_name}</TableCell>
                        <TableCell className="text-muted-foreground">{d.email}</TableCell>
                        <TableCell className="text-muted-foreground">{d.phone}</TableCell>
                        <TableCell>
                          {d.has_driver_profile && d.driver_code ? (
                            <span className="font-mono text-xs font-bold text-foreground">{d.driver_code}</span>
                          ) : (
                            <Badge
                              variant="outline"
                              className="rounded-lg border-amber-300 bg-amber-50 font-bold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
                            >
                              Chưa có hồ sơ
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {d.license_class || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {(() => {
                            const expiryState = getLicenseExpiryState(d.license_expires_at);
                            const displayDate = formatDateVn(d.license_expires_at);
                            if (expiryState === "missing") return "—";
                            if (expiryState === "expired") {
                              return (
                                <span className="inline-flex items-center gap-1 font-medium text-red-600 dark:text-red-400">
                                  <Icons.AlertCircle className="size-[14px]" />
                                  {displayDate}
                                </span>
                              );
                            }
                            if (expiryState === "soon") {
                              return (
                                <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                                  <Icons.TriangleAlert className="size-[14px]" />
                                  {displayDate}
                                </span>
                              );
                            }
                            return <span>{displayDate}</span>;
                          })()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`h-6 rounded-full px-2.5 text-[12px] font-semibold ${sb.className}`}
                          >
                            {sb.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Sửa"
                              className="text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/30 dark:hover:text-amber-300"
                              onClick={() => openEdit(d)}
                            >
                              <Icons.Pencil className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title={d.status === "ACTIVE" ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                              className={
                                d.status === "ACTIVE"
                                  ? "text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
                                  : "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300"
                              }
                              onClick={() => toggleStatus(d)}
                            >
                              {d.status === "ACTIVE" ? (
                                <Icons.Lock className="size-4" />
                              ) : (
                                <Icons.Unlock className="size-4" />
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Xóa"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
                              onClick={() => {
                                setToDelete(d);
                                setDeleteOpen(true);
                              }}
                            >
                              <Icons.Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col gap-2 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              {meta.total > 0 ? (
                <>
                  {from}–{to} / {meta.total} tài xế
                </>
              ) : (
                "—"
              )}
            </span>
            <div className="flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading || !driverRoleId}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Trước
              </Button>
              <span className="text-foreground">
                Trang {page}/{meta.totalPages || 1}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= (meta.totalPages || 1) || loading || meta.total === 0}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <DriverModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        initialData={editInitial}
        onSuccess={() => {
          setIsModalOpen(false);
          void fetchList();
          if (modalMode === "add") setPage(1);
        }}
      />

      <ConfirmModal
        isOpen={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Xóa tài khoản tài xế"
        message="Bạn có chắc muốn xóa (ẩn) tài khoản"
        itemName={toDelete?.full_name || ""}
      />
    </div>
  );
}
