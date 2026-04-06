import React, { useState, useEffect } from 'react';
import { driverApi } from "@/services/driverApi"; // Sử dụng API riêng cho Driver
import { toast } from "sonner";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as Icons from "lucide-react";

export default function DriverProfilePage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
  full_name: '', 
  phone: '', 
  license_number: '', 
  agency_id: '', // Thêm trường này vào form
  status: 'active'
});

  // 1. Lấy danh sách Hồ sơ (Drivers)
  const fetchDrivers = async () => {
    setLoading(true);
    try {
      // Gọi API lấy danh sách hồ sơ từ file driverApi mới
      const res = await driverApi.getProfiles({ search: searchQuery });
      // Dựa trên Swagger: Dữ liệu nằm trong res.data.data
      const data = res.data?.data || [];
      setDrivers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Lỗi fetch:", error);
      toast.error("Không thể tải danh sách tài xế");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, [searchQuery]);

  // 2. Lưu hồ sơ mới (Phần xác)
 const handleSave = async () => {
  try {
    const userInfo = JSON.parse(localStorage.getItem("user_info") || "{}");
    
    // LOGIC MỚI: 
    // Nếu là Agency Manager thì lấy agency_id của họ.
    // Nếu là Super Admin, Minh cần nhập/chọn 1 Agency ID. 
    // (Ở đây mình tạm thời lấy 1 Agency ID mẫu từ DB của Minh để test nhé)
    let targetAgencyId = userInfo.agency_id;

    if (userInfo.role === 'super_admin') {
      // Minh hãy thay cái chuỗi này bằng 1 ID Agency thật trong bảng 'agencies' của Minh
      // Ví dụ lấy ID của agency đầu tiên:
      targetAgencyId = "11111111-1111-1111-1111-111111111111"; 
      
      // Hoặc nếu Minh đã có ô chọn Agency trong Form thì dùng:
      // targetAgencyId = formData.agency_id; 
    }

    const payload = {
      full_name: formData.full_name,
      phone: formData.phone,
      license_number: formData.license_number || `GPLX${Date.now()}`,
      agency_id: targetAgencyId, // PHẢI LÀ ID CỦA AGENCY, KHÔNG ĐƯỢC LẤY ID CỦA ADMIN
      status: "active"
    };

    console.log("PAYLOAD GỬI ĐI:", payload);

    if (!payload.agency_id || payload.agency_id === "undefined") {
      toast.error("Lỗi: Super Admin cần chọn một Nhà xe (Agency) để gán tài xế!");
      return;
    }

    const res = await driverApi.createProfile(payload);
    
    toast.success("Tạo hồ sơ tài xế thành công!");
    setIsDialogOpen(false);
    fetchDrivers();
setFormData({ 
  full_name: '', 
  phone: '', 
  license_number: '', 
  agency_id: '', // Thêm dòng này để hết lỗi đỏ
  status: 'active' 
}); 
  } catch (error: any) {
    console.error("LỖI CHI TIẾT:", error.response?.data);
    // Hiện thông báo lỗi cụ thể từ Backend để biết thiếu trường gì
    const msg = error.response?.data?.message || "Lỗi thiếu thông tin";
    toast.error(msg);
  }
};

  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-slate-800 dark:text-white">Quản lý Hồ sơ Tài xế</h1>
        <Button 
          onClick={() => setIsDialogOpen(true)} 
          className="bg-blue-600 hover:bg-blue-700 font-bold rounded-xl shadow-lg transition-all"
        >
          <Icons.Plus className="mr-2" /> Thêm hồ sơ mới
        </Button>
      </div>

      {/* THANH TÌM KIẾM */}
      <div className="relative w-full md:w-80">
        <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <Input 
          className="pl-10 rounded-xl border-slate-200 dark:border-slate-800" 
          placeholder="Tìm tên hoặc SĐT..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* BẢNG DANH SÁCH HỒ SƠ */}
      <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white dark:bg-slate-900">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-800">
              <TableRow>
                <TableHead className="w-16 text-center font-bold">STT</TableHead>
                <TableHead className="font-bold">Họ và tên</TableHead>
                <TableHead className="font-bold">Số điện thoại</TableHead>
                <TableHead className="font-bold">Số bằng lái</TableHead>
                <TableHead className="text-center font-bold">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-400">Đang tải dữ liệu...</TableCell></TableRow>
              ) : drivers.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-400">Chưa có hồ sơ tài xế nào</TableCell></TableRow>
              ) : (
                drivers.map((d, index) => (
                  <TableRow key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <TableCell className="text-center font-medium text-slate-500">{index + 1}</TableCell>
                    <TableCell className="font-bold text-slate-800 dark:text-slate-200">{d.full_name}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400">{d.phone}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400 font-mono">{d.license_number || "---"}</TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm" className="text-blue-600 font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20">
                        <Icons.Edit3 size={16} className="mr-1" /> Sửa
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* MODAL THÊM HỒ SƠ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl bg-white dark:bg-slate-900 border-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-800 dark:text-white">Thêm hồ sơ tài xế mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 dark:text-slate-300">Họ và tên *</Label>
              <Input 
                placeholder="VD: Võ Nhất Minh"
                value={formData.full_name} 
                onChange={e => setFormData({...formData, full_name: e.target.value})} 
                className="rounded-xl border-slate-200 focus:ring-blue-500" 
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 dark:text-slate-300">Số điện thoại *</Label>
              <Input 
                placeholder="VD: 0912345678"
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})} 
                className="rounded-xl border-slate-200 focus:ring-blue-500" 
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 dark:text-slate-300">Số bằng lái (GPLX)</Label>
              <Input 
                placeholder="Nhập số bằng lái (nếu có)"
                value={formData.license_number} 
                onChange={e => setFormData({...formData, license_number: e.target.value})} 
                className="rounded-xl border-slate-200 focus:ring-blue-500" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleSave} 
              className="w-full bg-blue-600 hover:bg-blue-700 font-bold h-12 rounded-xl shadow-lg shadow-blue-200 dark:shadow-none transition-all"
            >
              Lưu hồ sơ tài xế
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}