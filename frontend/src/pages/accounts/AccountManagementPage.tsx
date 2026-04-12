import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { adminApi } from "@/services/adminApi";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as Icons from "lucide-react";
import { AxiosError } from "axios";
import { Link } from "react-router-dom";

const PAGE_SIZE = 10;
const FILTER_ALL = "__all__";

type UserStatus = "ACTIVE" | "INACTIVE" | "BLOCKED";

interface RoleItem {
  id: string;
  name: string;
  description?: string;
}

interface UserItem {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  status: UserStatus;
  agency_id: string | null;
  role?: { id: string; name: string };
}

interface ListMeta {
  total: number;
  currentPage: number;
  totalPages: number;
}

interface SessionUser {
  id?: string;
  role?: string;
  agency_id?: string | null;
}

/** Khớp BE: Agency Admin chỉ được tạo tài xế. */
const CREATABLE_BY_AGENCY_ADMIN = new Set(["DRIVER"]);
/** Super Admin chỉ được tạo Quản lý nhà xe qua trang này. */
const CREATABLE_BY_SUPER_ADMIN = new Set(["AGENCY_ADMIN"]);

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const msg = error.response?.data?.message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return fallback;
}

function roleBadgeLabel(roleName?: string): string {
  switch (roleName) {
    case "SUPER_ADMIN":
      return "Chủ hệ thống";
    case "AGENCY_ADMIN":
      return "Quản lý nhà xe";
    case "DISPATCHER":
      return "Điều phối";
    case "DRIVER":
      return "Tài xế";
    case "VIEWER":
      return "Người xem";
    default:
      return roleName || "—";
  }
}

function roleSelectLabel(roleName: string): string {
  return roleBadgeLabel(roleName);
}

function statusDisplay(status: UserStatus): { label: string; className: string } {
  switch (status) {
    case "ACTIVE":
      return {
        label: "Hoạt động",
        className:
          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      };
    case "BLOCKED":
      return {
        label: "Đã khóa",
        className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      };
    case "INACTIVE":
      return {
        label: "Không hoạt động",
        className:
          "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
      };
    default:
      return {
        label: status,
        className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      };
  }
}

export default function AccountManagementPage() {
  const userInfo = useMemo((): SessionUser => {
    try {
      return JSON.parse(localStorage.getItem("user_info") || "{}") as SessionUser;
    } catch {
      return {};
    }
  }, []);

  const isSuperAdmin = userInfo.role === "SUPER_ADMIN";
  const userAgencyId = userInfo.agency_id ?? null;

  const [accounts, setAccounts] = useState<UserItem[]>([]);
  const [meta, setMeta] = useState<ListMeta>({
    total: 0,
    currentPage: 1,
    totalPages: 0,
  });
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>(FILTER_ALL);
  const [statusFilter, setStatusFilter] = useState<string>(FILTER_ALL);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<UserItem | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<UserItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    role_id: "",
    agency_id: "",
  });

  const rolesForForm = useMemo(() => {
    if (isSuperAdmin) return roles.filter((r) => CREATABLE_BY_SUPER_ADMIN.has(r.name));
    return roles.filter((r) => CREATABLE_BY_AGENCY_ADMIN.has(r.name));
  }, [roles, isSuperAdmin]);

  /** Khi sửa, luôn hiển thị được role hiện tại (có thể là bản ghi cũ / test). */
  const rolesForSelect = useMemo(() => {
    if (!editingAccount?.role?.id) return rolesForForm;
    const cur = roles.find((r) => r.id === editingAccount.role?.id);
    if (!cur) return rolesForForm;
    if (rolesForForm.some((r) => r.id === cur.id)) return rolesForForm;
    return [...rolesForForm, cur];
  }, [editingAccount, roles, rolesForForm]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = searchInput.trim();
      setDebouncedSearch((prev) => (prev === next ? prev : next));
    }, 400);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const prevDebouncedSearch = useRef<string | null>(null);
  useEffect(() => {
    if (prevDebouncedSearch.current === null) {
      prevDebouncedSearch.current = debouncedSearch;
      return;
    }
    if (prevDebouncedSearch.current === debouncedSearch) return;
    prevDebouncedSearch.current = debouncedSearch;
    setPage(1);
  }, [debouncedSearch]);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page,
        limit: PAGE_SIZE,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (roleFilter !== FILTER_ALL) params.role_id = roleFilter;
      if (statusFilter !== FILTER_ALL) params.status = statusFilter;
      if (!isSuperAdmin && userAgencyId) {
        params.agency_id = userAgencyId;
      }

      const res = await adminApi.getList(params);
      const payload = res.data?.data as
        | { data?: UserItem[]; meta?: Partial<ListMeta> }
        | undefined;

      const rows = Array.isArray(payload?.data) ? payload.data : [];
      const m = payload?.meta;
      setAccounts(rows);
      setMeta({
        total: typeof m?.total === "number" ? m.total : rows.length,
        currentPage: typeof m?.currentPage === "number" ? m.currentPage : page,
        totalPages:
          typeof m?.totalPages === "number"
            ? m.totalPages
            : Math.max(1, Math.ceil((m?.total ?? rows.length) / PAGE_SIZE)),
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể tải danh sách tài khoản."));
      setAccounts([]);
      setMeta({ total: 0, currentPage: 1, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, roleFilter, statusFilter, isSuperAdmin, userAgencyId]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await adminApi.getRoles();
        const roleData = res.data?.data;
        setRoles(Array.isArray(roleData) ? roleData : []);
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Không thể tải danh sách vai trò."));
      }
    };
    fetchRoles();
  }, []);

  const openCreateModal = () => {
    setEditingAccount(null);
    const list = rolesForForm.length ? rolesForForm : roles;
    const defaultRole =
      (isSuperAdmin
        ? list.find((r) => r.name === "AGENCY_ADMIN")?.id
        : list.find((r) => r.name === "DRIVER")?.id) ||
      list[0]?.id ||
      "";
    setFormData({
      full_name: "",
      email: "",
      phone: "",
      role_id: defaultRole,
      agency_id: userAgencyId || "",
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (acc: UserItem) => {
    setEditingAccount(acc);
    setFormData({
      full_name: acc.full_name || "",
      email: acc.email || "",
      phone: acc.phone || "",
      role_id: acc.role?.id || "",
      agency_id: acc.agency_id || userAgencyId || "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.full_name?.trim()) {
      toast.error("Vui lòng nhập họ tên.");
      return;
    }
    if (!formData.email?.trim()) {
      toast.error("Vui lòng nhập email.");
      return;
    }
    if (!formData.phone?.trim()) {
      toast.error("Vui lòng nhập số điện thoại.");
      return;
    }

    if (!editingAccount) {
      if (!formData.role_id) {
        toast.error("Vui lòng chọn vai trò.");
        return;
      }
      if (isSuperAdmin) {
        const uuidRe =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!formData.agency_id?.trim() || !uuidRe.test(formData.agency_id.trim())) {
          toast.error("Super Admin tạo Quản lý nhà xe: nhập Agency ID (UUID) hợp lệ.");
          return;
        }
      }
    }

    setSaving(true);
    try {
      if (editingAccount) {
        const updatePayload: Record<string, string> = {
          full_name: formData.full_name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
        };
        if (formData.role_id && editingAccount.role?.id !== formData.role_id) {
          updatePayload.role_id = formData.role_id;
        }
        await adminApi.update(editingAccount.id, updatePayload);
        toast.success("Cập nhật tài khoản thành công.");
      } else {
        const createPayload: Record<string, string | null> = {
          full_name: formData.full_name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          role_id: formData.role_id,
          agency_id: isSuperAdmin
            ? formData.agency_id?.trim() || null
            : userAgencyId,
        };
        await adminApi.create(createPayload);
        toast.success(
          "Tạo tài khoản thành công. Mật khẩu tạm đã được gửi qua email cho người dùng.",
        );
        setPage(1);
      }

      setIsDialogOpen(false);
      await fetchAccounts();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể lưu tài khoản."));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (acc: UserItem) => {
    if (acc.id === userInfo.id) {
      toast.error("Bạn không thể tự đổi trạng thái tài khoản đang đăng nhập.");
      return;
    }

    try {
      const nextStatus: UserStatus = acc.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";
      await adminApi.changeStatus(acc.id, nextStatus);
      toast.success(
        nextStatus === "BLOCKED"
          ? "Đã khóa tài khoản. Phiên đăng nhập hiện tại (nếu có) sẽ bị hủy."
          : "Đã mở khóa tài khoản.",
      );
      await fetchAccounts();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể cập nhật trạng thái."));
    }
  };

  const confirmDelete = async () => {
    if (!accountToDelete) return;

    try {
      await adminApi.delete(accountToDelete.id);
      toast.success("Đã ẩn tài khoản khỏi danh sách (xóa mềm).");
      setIsDeleteConfirmOpen(false);
      setAccountToDelete(null);
      if (accounts.length <= 1 && page > 1) {
        setPage((p) => Math.max(1, p - 1));
      } else {
        await fetchAccounts();
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Xóa thất bại."));
    }
  };

  const from = meta.total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, meta.total);

  const canManageAccounts =
    userInfo.role === "SUPER_ADMIN" || userInfo.role === "AGENCY_ADMIN";

  if (!canManageAccounts) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
        <p className="text-center text-muted-foreground">
          Bạn không có quyền truy cập trang quản lý tài khoản.
        </p>
        <Button type="button" asChild className="rounded-xl font-bold">
          <Link to="/admin/dashboard">Về Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <h1 className="text-3xl font-black tracking-tight text-foreground">Quản lý tài khoản</h1>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Icons.Search
              className="absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              className="rounded-xl pl-10"
              placeholder="Tìm theo tên hoặc email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Tìm kiếm tài khoản"
            />
          </div>

          <Select
            value={roleFilter}
            onValueChange={(v) => {
              setRoleFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-10 w-full rounded-xl border-border sm:w-[200px]">
              <SelectValue placeholder="Vai trò" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              sideOffset={4}
              className="z-[9999] rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-xl"
            >
              <SelectItem value={FILTER_ALL}>Tất cả vai trò</SelectItem>
              {roles.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {roleSelectLabel(r.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-10 w-full rounded-xl border-border sm:w-[180px]">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              sideOffset={4}
              className="z-[9999] rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-xl"
            >
              <SelectItem value={FILTER_ALL}>Tất cả trạng thái</SelectItem>
              <SelectItem value="ACTIVE">Hoạt động</SelectItem>
              <SelectItem value="BLOCKED">Đã khóa</SelectItem>
              <SelectItem value="INACTIVE">Không hoạt động</SelectItem>
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl font-bold"
            onClick={() => fetchAccounts()}
            disabled={loading}
          >
            <Icons.RefreshCw
              className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`}
            />
            Làm mới
          </Button>

          <Button
            type="button"
            onClick={openCreateModal}
            className="h-10 rounded-xl bg-blue-600 font-bold shadow-lg hover:bg-blue-700"
            disabled={!roles.length && !rolesForForm.length}
          >
            <Icons.Plus className="mr-2 size-5" />
            Thêm tài khoản mới
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50 [&_tr]:border-border">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-14 text-center font-bold">STT</TableHead>
                  <TableHead className="font-bold">Họ và tên</TableHead>
                  <TableHead className="font-bold">Email</TableHead>
                  <TableHead className="min-w-[120px] font-bold">Số điện thoại</TableHead>
                  <TableHead className="font-bold">Vai trò</TableHead>
                  <TableHead className="font-bold">Trạng thái</TableHead>
                  <TableHead className="text-center font-bold">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-12 text-center text-muted-foreground"
                    >
                      Đang tải dữ liệu...
                    </TableCell>
                  </TableRow>
                ) : accounts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-12 text-center text-muted-foreground"
                    >
                      Không có tài khoản phù hợp bộ lọc.
                    </TableCell>
                  </TableRow>
                ) : (
                  accounts.map((acc, index) => {
                    const stt = (page - 1) * PAGE_SIZE + index + 1;
                    const sd = statusDisplay(acc.status);
                    return (
                      <TableRow
                        key={acc.id}
                        className="border-border transition-colors hover:bg-muted/40"
                      >
                        <TableCell className="text-center font-medium text-muted-foreground">
                          {stt}
                        </TableCell>
                        <TableCell className="font-bold text-foreground">{acc.full_name}</TableCell>
                        <TableCell className="text-muted-foreground">{acc.email}</TableCell>
                        <TableCell className="text-muted-foreground">{acc.phone}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-lg font-bold">
                            {roleBadgeLabel(acc.role?.name)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`rounded-lg font-bold ${sd.className}`}>
                            {sd.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Chỉnh sửa"
                              onClick={() => handleEdit(acc)}
                            >
                              <Icons.Pencil className="size-4 text-amber-500" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title={acc.status === "ACTIVE" ? "Khóa tài khoản" : "Mở khóa"}
                              onClick={() => toggleStatus(acc)}
                            >
                              {acc.status === "ACTIVE" ? (
                                <Icons.Lock className="size-4 text-red-500" />
                              ) : (
                                <Icons.Unlock className="size-4 text-green-500" />
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Xóa mềm"
                              onClick={() => {
                                setAccountToDelete(acc);
                                setIsDeleteConfirmOpen(true);
                              }}
                            >
                              <Icons.Trash2 className="size-4 text-red-500" />
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

          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              {meta.total > 0 ? (
                <>
                  Hiển thị <span className="font-bold text-foreground">{from}</span>–
                  <span className="font-bold text-foreground">{to}</span> /{" "}
                  <span className="font-bold text-foreground">{meta.total}</span> tài khoản
                </>
              ) : (
                "Không có bản ghi"
              )}
            </p>
            <div className="flex items-center justify-center gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl font-bold"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <Icons.ChevronLeft className="mr-1 size-4" />
                Trước
              </Button>
              <span className="min-w-[100px] text-center font-medium">
                Trang {meta.currentPage || page}
                {meta.totalPages > 0 ? ` / ${meta.totalPages}` : ""}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl font-bold"
                disabled={page >= (meta.totalPages || 1) || loading || meta.total === 0}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau
                <Icons.ChevronRight className="ml-1 size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="overflow-hidden rounded-3xl border border-border bg-card p-0 text-card-foreground shadow-2xl sm:max-w-[450px]">
          <DialogHeader className="border-b border-border bg-muted/40 p-5 pb-4">
            <DialogTitle className="text-xl font-black tracking-tight text-foreground">
              {editingAccount ? "Cập nhật tài khoản" : "Thêm tài khoản mới"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 p-6 pt-4">
            {!editingAccount && (
              <p className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                Hệ thống tạo mật khẩu tạm và gửi qua email cho người dùng sau khi tạo tài khoản thành công.
              </p>
            )}
            <div className="space-y-1">
              <Label className="ml-1 text-sm font-bold text-foreground">
                Họ và tên <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="h-11 rounded-xl border-border bg-background"
                placeholder="Nhập họ tên đầy đủ"
                autoComplete="name"
              />
            </div>
            <div className="space-y-1">
              <Label className="ml-1 text-sm font-bold text-foreground">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-11 rounded-xl border-border bg-background"
                placeholder="user@smartdrive.vn"
                autoComplete="email"
              />
            </div>
            <div className="space-y-1">
              <Label className="ml-1 text-sm font-bold text-foreground">
                Số điện thoại <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="h-11 rounded-xl border-border bg-background"
                placeholder="0912345678"
                inputMode="tel"
                autoComplete="tel"
              />
            </div>
            <div className="space-y-1">
              <Label className="ml-1 text-sm font-bold text-foreground">
                Vai trò <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.role_id}
                onValueChange={(v) => setFormData({ ...formData, role_id: v })}
              >
                <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                  <SelectValue placeholder="Chọn vai trò" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  sideOffset={4}
                  className="z-[9999] w-[var(--radix-select-trigger-width)] rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-xl"
                >
                  {rolesForSelect.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {roleSelectLabel(r.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isSuperAdmin && (
              <div className="space-y-1">
                <Label className="ml-1 text-sm font-bold text-foreground">
                  Agency ID (UUID) <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.agency_id}
                  onChange={(e) => setFormData({ ...formData, agency_id: e.target.value })}
                  className="h-11 rounded-xl border-border bg-background"
                  placeholder="UUID nhà xe — bắt buộc khi tạo Quản lý nhà xe"
                />
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center gap-3 p-6 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsDialogOpen(false)}
              className="rounded-xl font-bold text-muted-foreground"
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="h-11 flex-1 rounded-xl bg-blue-600 font-bold text-white shadow-lg shadow-blue-100 hover:bg-blue-700 dark:shadow-none"
            >
              {saving ? "Đang lưu..." : editingAccount ? "Lưu thay đổi" : "Tạo tài khoản"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="rounded-3xl border border-border bg-card p-8 text-card-foreground shadow-2xl sm:max-w-[400px]">
          <div className="space-y-4 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
              <Icons.Trash2 className="size-8 text-red-500" />
            </div>
            <DialogTitle className="text-xl font-black text-foreground">
              Xác nhận xóa tài khoản?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Tài khoản <strong>{accountToDelete?.full_name}</strong> sẽ bị ẩn khỏi danh sách (xóa
              mềm, dữ liệu lịch sử được giữ trên server). Bạn có chắc chắn?
            </DialogDescription>
          </div>
          <div className="mt-6 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="h-11 flex-1 rounded-xl border-border font-bold"
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={confirmDelete}
              className="h-11 flex-1 rounded-xl bg-red-500 font-bold text-white shadow-lg shadow-red-100 hover:bg-red-600 dark:shadow-none"
            >
              Xóa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
