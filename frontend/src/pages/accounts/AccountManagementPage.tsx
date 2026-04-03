import React, { useState, useMemo } from 'react';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import * as Icons from "lucide-react";

const INITIAL_ACCOUNTS = [
  { id: 1, name: "Nguyễn Văn A", email: "a@gmail.com", phone: "0912345678", role: "Admin", status: "Active" },
  { id: 2, name: "Trần Thị B", email: "b@gmail.com", phone: "0987654321", role: "Staff", status: "Blocked" },
];

export default function AccountManagementPage() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState(INITIAL_ACCOUNTS);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [accountToDelete, setAccountToDelete] = useState<any>(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', role: '', status: 'Active'
  });

  // --- LOGIC TÌM KIẾM THEO KÍ TỰ ---
  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => 
      acc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      acc.phone.includes(searchQuery)
    );
  }, [accounts, searchQuery]);

  // --- LOGIC VALIDATE EMAIL ---
  const isEmailValid = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.endsWith("@gmail.com");
  };

  // Check xem form đã hợp lệ chưa để disable/enable nút Lưu
  const isFormValid = formData.name.trim() !== "" && 
                      isEmailValid(formData.email) && 
                      formData.role !== "" && 
                      formData.phone.length >= 10;

  const handleAddNew = () => {
    setEditingAccount(null);
    setFormData({ name: '', email: '', phone: '', role: '', status: 'Active' });
    setIsDialogOpen(true);
  };

  const handleEdit = (account: any) => {
    setEditingAccount(account);
    setFormData(account);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    // Check lại một lần nữa cho chắc (Unhappy Path)
    if (!isFormValid) {
      toast({ 
        variant: "destructive", 
        title: "Dữ liệu không hợp lệ", 
        description: "Vui lòng kiểm tra lại họ tên, vai trò và email (phải có @gmail.com)" 
      });
      return;
    }

    // Check trùng Email/SĐT
    const isDuplicate = accounts.find(acc => 
      (acc.email === formData.email || acc.phone === formData.phone) && acc.id !== editingAccount?.id
    );
    if (isDuplicate) {
      toast({ variant: "destructive", title: "Lỗi trùng lặp", description: "Email hoặc Số điện thoại này đã tồn tại!" });
      return;
    }

    if (editingAccount) {
      setAccounts(accounts.map(acc => acc.id === editingAccount.id ? { ...formData, id: acc.id } : acc));
    } else {
      setAccounts([{ ...formData, id: Date.now() }, ...accounts]);
    }

    toast({ title: "Thành công", description: "Dữ liệu tài khoản đã được lưu." });
    setIsDialogOpen(false);
  };

  const handleToggleBlock = (account: any) => {
    const newStatus = account.status === "Active" ? "Blocked" : "Active";
    setAccounts(accounts.map(acc => acc.id === account.id ? { ...acc, status: newStatus } : acc));
    toast({ 
      title: newStatus === "Blocked" ? "Đã khóa" : "Đã mở khóa", 
      description: `Tài khoản ${account.name} đã thay đổi trạng thái.` 
    });
  };

  const confirmDelete = () => {
    if (accountToDelete?.name === "Nguyễn Văn A") {
      toast({ variant: "destructive", title: "Cảnh báo", description: "Không thể xóa tài khoản quản trị mặc định!" });
    } else {
      setAccounts(accounts.filter(acc => acc.id !== accountToDelete.id));
      toast({ title: "Đã xóa", description: "Tài khoản đã bị loại bỏ." });
    }
    setIsDeleteConfirmOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* HEADER & SEARCH TOOLBAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Quản lí tài khoản</h1>
        <div className="flex items-center gap-3 w-full md:w-auto">
           <div className="relative flex-1 md:w-80 group">
              <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600" size={18} />
              <Input 
                className="pl-10 border-slate-200 rounded-xl bg-white focus:ring-4 focus:ring-blue-100 transition-all" 
                placeholder="Tìm tên hoặc số điện thoại..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
           </div>
           <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 font-bold px-6 rounded-xl shadow-lg shadow-blue-200 dark:shadow-none transition-all">
             <Icons.Plus className="mr-2 h-5 w-5" /> Thêm tài khoản
           </Button>
        </div>
      </div>

      {/* TABLE SECTION */}
      <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white dark:bg-slate-900">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
              <TableRow className="border-b border-slate-100">
                <TableHead className="w-16 text-center font-bold">STT</TableHead>
                <TableHead className="font-bold">Họ và tên</TableHead>
                <TableHead className="font-bold">Email</TableHead>
                <TableHead className="font-bold">Số điện thoại</TableHead>
                <TableHead className="font-bold">Vai trò</TableHead>
                <TableHead className="font-bold">Trạng thái</TableHead>
                <TableHead className="text-center font-bold">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.length > 0 ? (
                filteredAccounts.map((acc, index) => (
                  <TableRow key={acc.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="text-center font-medium text-slate-500">{index + 1}</TableCell>
                    <TableCell className="font-bold text-slate-800 dark:text-slate-200">{acc.name}</TableCell>
                    <TableCell className="text-slate-500">{acc.email}</TableCell>
                    <TableCell className="text-slate-500 font-medium">{acc.phone}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-lg border-slate-200 text-slate-600">{acc.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={acc.status === 'Active' ? "bg-green-100 text-green-700 border-none" : "bg-red-100 text-red-700 border-none"}>
                        {acc.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleToggleBlock(acc)} title={acc.status === 'Active' ? "Khóa" : "Mở khóa"}>
                          {acc.status === 'Active' ? <Icons.Unlock className="h-4 w-4 text-blue-500" /> : <Icons.Lock className="h-4 w-4 text-red-500" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(acc)}>
                          <Icons.Pencil className="h-4 w-4 text-amber-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setAccountToDelete(acc); setIsDeleteConfirmOpen(true); }}>
                          <Icons.Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-400">Không tìm thấy tài khoản nào phù hợp.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* MODAL THÊM/SỬA */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-900">
          <DialogHeader className="p-8 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100">
            <DialogTitle className="text-2xl font-black text-slate-800 dark:text-white">
              {editingAccount ? 'Cập nhật tài khoản' : 'Thêm tài khoản mới'}
            </DialogTitle>
          </DialogHeader>
          <div className="p-8 space-y-5">
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Họ và tên *</Label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                className="h-12 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 transition-all" 
                placeholder="Nhập họ tên đầy đủ" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Email *</Label>
                <Input 
                  type="email" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  className={`h-12 border-slate-200 rounded-xl ${formData.email && !isEmailValid(formData.email) ? 'border-red-500 focus:ring-red-100' : ''}`} 
                  placeholder="user@gmail.com" 
                />
                {formData.email && !isEmailValid(formData.email) && (
                  <p className="text-[10px] text-500">Sai định dạng @gmail.com</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Số điện thoại *</Label>
                <Input 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})} 
                  className="h-12 border-slate-200 rounded-xl" 
                  placeholder="09xxxx" 
                  maxLength={11}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Vai trò (Role) *</Label>
              <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                <SelectTrigger className="h-12 border-slate-200 rounded-xl">
                  <SelectValue placeholder="Chọn vai trò" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Staff">Staff</SelectItem>
                  <SelectItem value="Driver">Driver</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="p-8 pt-0 flex gap-3">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="font-bold text-slate-400 rounded-xl h-12">Hủy</Button>
            <Button 
              onClick={handleSave} 
              disabled={!isFormValid}
              className={`flex-1 font-bold rounded-xl h-12 shadow-lg transition-all ${isFormValid ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}
            >
              {editingAccount ? 'Lưu thay đổi' : 'Tạo tài khoản'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL XÁC NHẬN XÓA */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl p-8 bg-white dark:bg-slate-900 border-none shadow-2xl">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
              <Icons.Trash2 className="text-red-500 w-8 h-8" />
            </div>
            <DialogTitle className="text-xl font-black text-slate-800 dark:text-white">Xác nhận xóa tài khoản?</DialogTitle>
            <DialogDescription className="text-slate-500">
              Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa tài khoản <strong>{accountToDelete?.name}</strong>?
            </DialogDescription>
          </div>
          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} className="flex-1 border-slate-200 rounded-xl h-11 font-bold">Hủy</Button>
            <Button onClick={confirmDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl h-11 font-bold shadow-lg shadow-red-100 dark:shadow-none">Xóa ngay</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}