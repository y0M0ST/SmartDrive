import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast"; // Hoặc thư viện báo lỗi của bạn
import { Plus, Pencil, Trash2 } from "lucide-react";

// Danh sách 34 tỉnh thành tiêu biểu (Autocomplete/Select)
const PROVINCES = ["An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu", "Bắc Ninh", "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước", "Bình Thuận", "Cà Mau", "Cần Thơ", "Cao Bằng", "Đà Nẵng", "Đắk Lắk", "Đắk Nông", "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang", "Hà Nam", "Hà Nội", "Hà Tĩnh", "Hải Dương", "Hải Phòng", "Hậu Giang", "Hòa Bình", "Hưng Yên", "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu"];

export default function RouteListPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<any>(null);

  // Form State
// Form State
  const [formData, setFormData] = useState({
    name: '',
    startPoint: '',
    endPoint: '',
    distance: '',
    duration: '', // Giờ
    durationMinutes: '0', // Thêm cái này
    status: 'Đang khai thác'
  });

  // Xử lý Lưu (Happy Path & Unhappy Path)
const handleSave = () => {
    // 1. Kiểm tra nhập liệu cơ bản (Tránh để rỗng các trường quan trọng)
    if (!formData.name || !formData.startPoint || !formData.endPoint) {
      toast({ 
        variant: "destructive", 
        title: "Thiếu thông tin", 
        description: "Vui lòng nhập đầy đủ Tên tuyến, Điểm đi và Điểm đến" 
      });
      return;
    }

    // 2. Chặn nhập số âm hoặc bằng 0 cho Cự ly và Thời gian
    const dist = Number(formData.distance);
    const durH = Number(formData.duration);
    const durM = Number(formData.durationMinutes);

    if (dist <= 0) {
      toast({ 
        variant: "destructive", 
        title: "Lỗi cự ly", 
        description: "Cự ly phải là số dương lớn hơn 0" 
      });
      return;
    }

    if (durH < 0 || durM < 0 || (durH === 0 && durM === 0)) {
      toast({ 
        variant: "destructive", 
        title: "Lỗi thời gian", 
        description: "Thời gian dự kiến không được để trống hoặc là số âm" 
      });
      return;
    }

    if (durM >= 60) {
      toast({ 
        variant: "destructive", 
        title: "Lỗi số phút", 
        description: "Số phút phải nhỏ hơn 60" 
      });
      return;
    }

    // 3. Kiểm tra trùng Điểm đi và Điểm đến
    if (formData.startPoint.trim() === formData.endPoint.trim()) {
      toast({ 
        variant: "destructive", 
        title: "Lỗi địa điểm", 
        description: "Điểm đến không được trùng với Điểm xuất phát" 
      });
      return;
    }

    // --- HAPPY PATH: Nếu vượt qua hết các check trên thì mới lưu ---
    toast({ 
      title: "Thành công", 
      description: editingRoute ? "Đã cập nhật tuyến đường" : "Đã thêm tuyến đường mới" 
    });
    
    setIsDialogOpen(false);
    setEditingRoute(null);
  };

  const handleEdit = (route: any) => {
  setEditingRoute(route);
  setFormData({
    name: route.name || '',
    startPoint: route.startPoint || '',
    endPoint: route.endPoint || '',
    distance: route.distance || '',
    duration: route.duration || '',
    durationMinutes: route.durationMinutes || '0', // Đảm bảo có cái này
    status: route.status || 'Đang khai thác'
  });
  setIsDialogOpen(true);
};

  const handleDelete = (status: string) => {
    // Luồng ngoại lệ: Xóa tuyến đang hoạt động
    if (status === "Đang khai thác") {
      toast({ 
        variant: "destructive", 
        title: "Không thể xóa", 
        description: "Không thể xóa tuyến đường đang có lịch trình hoạt động. Vui lòng chuyển trạng thái sang Tạm ngưng" 
      });
    } else {
      toast({ title: "Đã xóa", description: "Tuyến đường đã được loại bỏ" });
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 text-shadow-sm">Quản lý tuyến đường</h1>
        
        {/* Nút Thêm mới mở Pop-up */}
        <Dialog 
  open={isDialogOpen} 
  onOpenChange={(open) => { 
    setIsDialogOpen(open); 
    if(!open) {
      setEditingRoute(null);
      // Reset về trắng khi đóng modal
      setFormData({ 
        name: '', startPoint: '', endPoint: '', 
        distance: '', duration: '', durationMinutes: '0', 
        status: 'Đang khai thác' 
      });
    } 
  }}
>
          <DialogTrigger asChild>
            <Button 
  variant="outline" 
  className="border-blue-600 text-blue-600 bg-white hover:bg-blue-50 hover:text-blue-700 h-10 px-5 rounded-xl font-bold transition-colors"
>
  <Plus className="mr-2 h-4 w-4 stroke-[2.5]" /> 
  Thêm tuyến đường mới
</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] border border-slate-300 shadow-xl rounded-2xl bg-white overflow-visible">
  <DialogHeader className="border-b border-slate-100 pb-4">
    <DialogTitle className="text-2xl font-bold text-slate-800 tracking-tight">
      {editingRoute ? 'Cập nhật tuyến đường' : 'Thêm tuyến đường mới'}
    </DialogTitle>
  </DialogHeader>

  <div className="grid gap-6 py-6">
    {/* Tên tuyến - Viền mỏng hơn nhưng nét */}
    <div className="grid grid-cols-4 items-center gap-4">
      <Label className="text-right font-semibold text-slate-600">Tên tuyến</Label>
      <Input 
        className="col-span-3 border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 text-slate-900 font-medium h-11 transition-all bg-white" 
        placeholder="VD: Đà Nẵng - Huế" 
        value={formData.name} 
        onChange={(e) => setFormData({...formData, name: e.target.value})} 
      />
    </div>

   {/* Điểm đi */}
<div className="grid grid-cols-4 items-center gap-4">
  <Label className="text-right font-bold text-slate-800 dark:text-slate-200">Điểm đi</Label>
  <div className="col-span-3">
    <Select 
      value={formData.startPoint} 
      onValueChange={(v) => setFormData({...formData, startPoint: v})}
    >
      <SelectTrigger className="border-2 border-slate-300 dark:border-slate-700 h-11 font-medium bg-white dark:bg-slate-900">
        {/* Đây là chỗ hiện chữ Minh muốn */}
        <SelectValue placeholder="Chọn điểm đi" /> 
      </SelectTrigger>
      <SelectContent className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 z-[9999]">
        {PROVINCES.map(p => (
          <SelectItem key={p} value={p}>{p}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
</div>

{/* Điểm đến */}
<div className="grid grid-cols-4 items-center gap-4">
  <Label className="text-right font-bold text-slate-800 dark:text-slate-200">Điểm đến</Label>
  <div className="col-span-3">
    <Select 
      value={formData.endPoint} 
      onValueChange={(v) => setFormData({...formData, endPoint: v})}
    >
      <SelectTrigger className="border-2 border-slate-300 dark:border-slate-700 h-11 font-medium bg-white dark:bg-slate-900">
        {/* Chỗ này hiện chữ chọn điểm đến */}
        <SelectValue placeholder="Chọn điểm đến" />
      </SelectTrigger>
      <SelectContent className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 z-[9999]">
        {PROVINCES.map(p => (
          <SelectItem key={p} value={p}>{p}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
</div>

    {/* Cự ly & Thời gian - Tỉ lệ hài hòa */}
    <div className="grid grid-cols-2 gap-6 pt-2">
      <div className="space-y-2 px-1 text-left">
        <Label className="font-semibold text-slate-600 ml-1">Cự ly (km)</Label>
        <div className="relative">
          <Input 
            type="number" 
            className="border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 h-11 font-bold text-slate-900 pr-10 bg-white" 
            value={formData.distance} 
            onChange={(e) => setFormData({...formData, distance: e.target.value})} 
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">KM</span>
        </div>
      </div>

      <div className="space-y-2 px-1 text-left">
        <Label className="font-semibold text-slate-600 ml-1">Thời gian dự kiến</Label>
        <div className="flex h-11 items-center border border-slate-300 rounded-md bg-white px-2 focus-within:ring-4 focus-within:ring-blue-100 focus-within:border-blue-500 transition-all gap-1">
          <Input 
            type="number" 
            className="h-8 border-none bg-transparent text-center font-bold text-slate-900 focus-visible:ring-0 w-full p-0" 
            placeholder="00"
            value={formData.duration} 
            onChange={(e) => setFormData({...formData, duration: e.target.value})}
          />
          <span className="text-slate-400 font-bold text-sm">h</span>
          <span className="text-slate-200 mx-0.5">|</span>
          <Input 
            type="number" 
            className="h-8 border-none bg-transparent text-center font-bold text-slate-900 focus-visible:ring-0 w-full p-0" 
            placeholder="00"
            value={formData.durationMinutes} 
            onChange={(e) => setFormData({...formData, durationMinutes: e.target.value})}
          />
          <span className="text-slate-400 font-bold text-sm">m</span>
        </div>
      </div>
    </div>
  </div>

  <DialogFooter className="bg-slate-50/50 p-6 border-t border-slate-100 mt-2">
    <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="font-semibold text-slate-500 hover:text-slate-900">Hủy</Button>
    <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 font-bold px-8 text-white shadow-lg shadow-blue-200">
      Lưu tuyến đường
    </Button>
  </DialogFooter>
</DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-xl border-none rounded-2xl overflow-hidden bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-100">
              <TableRow>
                <TableHead className="w-[70px] text-center font-bold">STT</TableHead>
                <TableHead className="font-bold">Tên tuyến</TableHead>
                <TableHead className="font-bold">Điểm xuất phát</TableHead>
                <TableHead className="font-bold">Điểm đến</TableHead>
                <TableHead className="font-bold">Cự ly (km)</TableHead>
                <TableHead className="font-bold">Thời gian (h)</TableHead>
                <TableHead className="font-bold">Trạng thái</TableHead>
                <TableHead className="text-center font-bold">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Dữ liệu mẫu hiển thị */}
              <TableRow>
                <TableCell className="text-center">1</TableCell>
                <TableCell className="font-semibold text-blue-600">Đà Nẵng - Huế</TableCell>
                <TableCell>Đà Nẵng</TableCell>
                <TableCell>Huế</TableCell>
                <TableCell>100</TableCell>
                <TableCell>2</TableCell>
                <TableCell>
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Đang khai thác</Badge>
                </TableCell>
                <TableCell className="text-center space-x-2">
                  <Button 
  variant="ghost" 
  size="icon" 
  onClick={() => handleEdit({
    id: 1, // Nên có ID
    name: 'Đà Nẵng - Huế', 
    startPoint: 'Đà Nẵng', 
    endPoint: 'Huế', 
    distance: '100', 
    duration: '2', 
    durationMinutes: '45', // Thêm cái này vào dữ liệu mẫu
    status: 'Đang khai thác'
  })}
>
  <Pencil className="h-4 w-4 text-amber-500" />
</Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete("Đang khai thác")}>
                    <Trash2 className="h-4 w-4 text-slate-400" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}