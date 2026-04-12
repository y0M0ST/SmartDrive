import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { toast } from "sonner";
import { AxiosError } from "axios";
import { agenciesApi, type Agency, type AgencyStatus } from "@/services/agenciesApi";
import { adminApi } from "@/services/adminApi";

function errorMessage(e: unknown, fb: string): string {
  if (e instanceof AxiosError) {
    const m = e.response?.data?.message;
    if (typeof m === "string" && m.trim()) return m;
  }
  return fb;
}

const PAGE_SIZE = 10;

export default function SuperAdminAgenciesPage() {
  const [rows, setRows] = useState<Agency[]>([]);
  const [meta, setMeta] = useState({ total: 0, currentPage: 1, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editAgency, setEditAgency] = useState<Agency | null>(null);
  /** null = đóng; "pick" = chọn đại lý; Agency = form tạo admin */
  const [accountAgency, setAccountAgency] = useState<Agency | null | "pick">(null);
  const [pickAgencyId, setPickAgencyId] = useState("");
  /** true nếu mở từ nút header (có bước chọn); false nếu từ hàng "Tạo Admin" */
  const [accountViaPicker, setAccountViaPicker] = useState(false);

  const [createForm, setCreateForm] = useState({ code: "", name: "", address: "", phone: "" });
  const [editForm, setEditForm] = useState({ name: "", address: "", phone: "" });
  const [accountForm, setAccountForm] = useState({ full_name: "", email: "", phone: "" });
  const [agencyAdminRoleId, setAgencyAdminRoleId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await agenciesApi.getList({
        page,
        limit: PAGE_SIZE,
        ...(debounced ? { search: debounced } : {}),
      });
      const payload = res.data?.data as
        | { data?: Agency[]; meta?: { total?: number; currentPage?: number; totalPages?: number } }
        | undefined;
      const data = Array.isArray(payload?.data) ? payload.data : [];
      const m = payload?.meta;
      setRows(data);
      setMeta({
        total: m?.total ?? data.length,
        currentPage: m?.currentPage ?? page,
        totalPages: m?.totalPages ?? Math.max(1, Math.ceil((m?.total ?? data.length) / PAGE_SIZE)),
      });
    } catch (e) {
      toast.error(errorMessage(e, "Không tải được danh sách đại lý."));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, debounced]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await adminApi.getRoles();
        const list = res.data?.data as { id: string; name: string }[] | undefined;
        const r = Array.isArray(list) ? list.find((x) => x.name === "AGENCY_ADMIN") : undefined;
        if (r) setAgencyAdminRoleId(r.id);
      } catch {
        /* noop */
      }
    };
    run();
  }, []);

  const openCreate = () => {
    setCreateForm({ code: "", name: "", address: "", phone: "" });
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    if (!createForm.code.trim() || !createForm.name.trim()) {
      toast.error("Mã và tên đại lý là bắt buộc.");
      return;
    }
    setSaving(true);
    try {
      await agenciesApi.create({
        code: createForm.code.trim(),
        name: createForm.name.trim(),
        address: createForm.address.trim() || undefined,
        phone: createForm.phone.trim() || undefined,
      });
      toast.success("Đã tạo đại lý.");
      setCreateOpen(false);
      setPage(1);
      await load();
    } catch (e) {
      toast.error(errorMessage(e, "Tạo đại lý thất bại."));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (a: Agency) => {
    setEditAgency(a);
    setEditForm({
      name: a.name || "",
      address: (a.address as string) || "",
      phone: (a.phone as string) || "",
    });
  };

  const submitEdit = async () => {
    if (!editAgency) return;
    setSaving(true);
    try {
      await agenciesApi.update(editAgency.id, {
        name: editForm.name.trim(),
        address: editForm.address.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
      });
      toast.success("Đã cập nhật đại lý.");
      setEditAgency(null);
      await load();
    } catch (e) {
      toast.error(errorMessage(e, "Cập nhật thất bại."));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (a: Agency) => {
    const next: AgencyStatus = a.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await agenciesApi.changeStatus(a.id, next);
      toast.success(next === "ACTIVE" ? "Đã kích hoạt đại lý." : "Đã vô hiệu hóa đại lý.");
      await load();
    } catch (e) {
      toast.error(errorMessage(e, "Đổi trạng thái thất bại."));
    }
  };

  const openAccountPicker = () => {
    if (!rows.length) {
      toast.message("Chưa có đại lý", { description: "Hãy tạo đại lý mới trước." });
      return;
    }
    setAccountForm({ full_name: "", email: "", phone: "" });
    setPickAgencyId(rows[0]?.id || "");
    setAccountViaPicker(true);
    setAccountAgency("pick");
  };

  const openAccountForAgency = (a: Agency) => {
    setAccountForm({ full_name: "", email: "", phone: "" });
    setAccountViaPicker(false);
    setAccountAgency(a);
  };

  const confirmPickAgency = () => {
    const a = rows.find((r) => r.id === pickAgencyId);
    if (!a) {
      toast.error("Chọn một đại lý hợp lệ.");
      return;
    }
    setAccountAgency(a);
  };

  const submitAccount = async () => {
    if (!accountAgency || accountAgency === "pick") return;
    if (!agencyAdminRoleId) {
      toast.error("Chưa tải được cấu hình vai trò. Thử lại sau.");
      return;
    }
    if (!accountForm.full_name.trim() || !accountForm.email.trim() || !accountForm.phone.trim()) {
      toast.error("Nhập đủ họ tên, email, số điện thoại.");
      return;
    }
    setSaving(true);
    try {
      await adminApi.create({
        full_name: accountForm.full_name.trim(),
        email: accountForm.email.trim(),
        phone: accountForm.phone.trim(),
        role_id: agencyAdminRoleId,
        agency_id: accountAgency.id,
      });
      toast.success("Đã tạo tài khoản Quản lý nhà xe. Mật khẩu tạm đã gửi email.");
      setAccountAgency(null);
    } catch (e) {
      toast.error(errorMessage(e, "Tạo tài khoản thất bại."));
    } finally {
      setSaving(false);
    }
  };

  const from = meta.total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, meta.total);

  return (
    <div className="space-y-8 text-foreground">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Quản lý đại lý</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Tạo nhà xe, cập nhật thông tin, bật hoặc tạm dừng hoạt động và cấp tài khoản quản lý cho từng nhà xe
            tương ứng.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={openCreate}
            className="h-11 rounded-xl bg-blue-600 font-bold shadow-lg hover:bg-blue-700"
          >
            <Icons.Plus className="mr-2 size-5" />
            Tạo đại lý mới
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl border-border font-bold"
            onClick={openAccountPicker}
          >
            <Icons.UserPlus className="mr-2 size-5" />
            Tạo tài khoản cho đại lý
          </Button>
        </div>
      </div>

      <Card className="rounded-3xl border-border bg-card shadow-sm">
        <CardHeader className="flex flex-col gap-4 border-b border-border sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-lg font-black">Danh sách đại lý</CardTitle>
            <CardDescription className="mt-1 text-muted-foreground">
              Tìm theo mã hoặc tên; thao tác trên từng dòng để sửa thông tin, thay đổi trạng thái hoặc tạo tài khoản
              quản lý.
            </CardDescription>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Icons.Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="rounded-xl border-border bg-muted pl-9"
              placeholder="Tìm theo mã hoặc tên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto border-t border-border">
            <Table>
              <TableHeader className="bg-muted/50 [&_tr]:border-border">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Mã</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>Số điện thoại</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                      Đang tải…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                      Không có đại lý.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((a) => (
                    <TableRow key={a.id} className="border-border">
                      <TableCell className="font-mono font-bold">{a.code}</TableCell>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell className="text-muted-foreground">{a.phone || "—"}</TableCell>
                      <TableCell>
                        <span
                          className={
                            a.status === "ACTIVE"
                              ? "font-bold text-emerald-600 dark:text-emerald-400"
                              : "font-bold text-amber-700 dark:text-amber-400"
                          }
                        >
                          {a.status === "ACTIVE" ? "Hoạt động" : "Ngưng"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-lg border-border"
                            onClick={() => openEdit(a)}
                          >
                            Sửa
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-lg border-border"
                            onClick={() => toggleStatus(a)}
                          >
                            {a.status === "ACTIVE" ? "Vô hiệu" : "Kích hoạt"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="rounded-lg bg-blue-600 font-bold hover:bg-blue-700"
                            onClick={() => openAccountForAgency(a)}
                          >
                            Tạo Admin
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col gap-2 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              {meta.total > 0 ? (
                <>
                  {from}–{to} / {meta.total} đại lý
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
                disabled={page <= 1 || loading}
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md rounded-3xl border-border bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle>Tạo đại lý mới</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Mã đại lý phải là duy nhất trong hệ thống.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>Mã *</Label>
              <Input
                className="mt-1 border-border bg-background"
                value={createForm.code}
                onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                placeholder="VD: AGENCY_11"
              />
            </div>
            <div>
              <Label>Tên *</Label>
              <Input
                className="mt-1 border-border bg-background"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Địa chỉ</Label>
              <Input
                className="mt-1 border-border bg-background"
                value={createForm.address}
                onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
              />
            </div>
            <div>
              <Label>Số điện thoại</Label>
              <Input
                className="mt-1 border-border bg-background"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              Hủy
            </Button>
            <Button type="button" disabled={saving} onClick={submitCreate}>
              {saving ? "Đang lưu…" : "Tạo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editAgency} onOpenChange={(o) => !o && setEditAgency(null)}>
        <DialogContent className="max-w-md rounded-3xl border-border bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle>Cập nhật đại lý</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editAgency?.code} — {editAgency?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>Tên</Label>
              <Input
                className="mt-1 border-border bg-background"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Địa chỉ</Label>
              <Input
                className="mt-1 border-border bg-background"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              />
            </div>
            <div>
              <Label>Số điện thoại</Label>
              <Input
                className="mt-1 border-border bg-background"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setEditAgency(null)}>
              Hủy
            </Button>
            <Button type="button" disabled={saving} onClick={submitEdit}>
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={accountAgency !== null}
        onOpenChange={(o) => {
          if (!o) setAccountAgency(null);
        }}
      >
        <DialogContent className="max-w-md rounded-3xl border-border bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle>Tạo tài khoản quản lý nhà xe</DialogTitle>
            {accountAgency !== "pick" && accountAgency && (
              <DialogDescription className="text-muted-foreground">
                Đại lý: <strong className="text-foreground">{accountAgency.name}</strong>
              </DialogDescription>
            )}
            {accountAgency === "pick" && (
              <DialogDescription className="text-muted-foreground">
                Chọn đại lý trong danh sách trang hiện tại, sau đó nhập thông tin tài khoản.
              </DialogDescription>
            )}
          </DialogHeader>

          {accountAgency === "pick" && (
            <div className="grid gap-3 py-2">
              <Label>Đại lý</Label>
              <Select value={pickAgencyId} onValueChange={setPickAgencyId}>
                <SelectTrigger className="border-border bg-background">
                  <SelectValue placeholder="Chọn nhà xe" />
                </SelectTrigger>
                <SelectContent className="border-border bg-popover text-popover-foreground">
                  {rows.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {accountAgency !== "pick" && accountAgency && (
            <>
              <div className="grid gap-3 py-2">
                <div>
                  <Label>Họ tên *</Label>
                  <Input
                    className="mt-1 border-border bg-background"
                    value={accountForm.full_name}
                    onChange={(e) => setAccountForm({ ...accountForm, full_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    className="mt-1 border-border bg-background"
                    value={accountForm.email}
                    onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Số điện thoại *</Label>
                  <Input
                    className="mt-1 border-border bg-background"
                    value={accountForm.phone}
                    onChange={(e) => setAccountForm({ ...accountForm, phone: e.target.value })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Tài khoản có quyền quản lý nhà xe được chọn. Mật khẩu tạm được gửi qua email sau khi tạo thành công.
                </p>
              </div>
              <DialogFooter>
                {accountViaPicker ? (
                  <Button type="button" variant="ghost" onClick={() => setAccountAgency("pick")}>
                    Quay lại
                  </Button>
                ) : (
                  <Button type="button" variant="ghost" onClick={() => setAccountAgency(null)}>
                    Hủy
                  </Button>
                )}
                <Button type="button" disabled={saving} onClick={submitAccount}>
                  {saving ? "Đang tạo…" : "Tạo tài khoản"}
                </Button>
              </DialogFooter>
            </>
          )}

          {accountAgency === "pick" && (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={() => setAccountAgency(null)}>
                Hủy
              </Button>
              <Button type="button" className="font-bold" onClick={confirmPickAgency}>
                Tiếp tục
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
