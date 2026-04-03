import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast"; 
import { Plus, Pencil, Trash2, RefreshCcw } from "lucide-react";

const PROVINCES = ["An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu", "Bắc Ninh", "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước", "Bình Thuận", "Cà Mau", "Cần Thơ", "Cao Bằng", "Đà Nẵng", "Đắk Lắk", "Đắk Nông", "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang", "Hà Nam", "Hà Nội", "Hà Tĩnh", "Hải Dương", "Hải Phòng", "Hậu Giang", "Hòa Bình", "Hưng Yên", "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu"];

export default function RouteListPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<any>(null);

  // 1. DATA STATE (Để hiển thị và thay đổi trạng thái trực tiếp)
  const [routes, setRoutes] = useState([
    {
      id: 1,
      name: 'Đà Nẵng - Huế',
      startPoint: 'Đà Nẵng',
      endPoint: 'Huế',
      distance: '100',
      duration: '2',
      durationMinutes: '45',
      status: 'Đang khai thác'
    }
  ]);

  const [formData, setFormData] = useState({
    name: '',
    startPoint: '',
    endPoint: '',
    distance: '',
    duration: '',
    durationMinutes: '0',
    status: 'Đang khai thác'
  });

  // 2. LOGIC ĐỔI TRẠNG THÁI (MỚI)
  const toggleStatus = (id: number) => {
    setRoutes(prev => prev.map(r => {
      if (r.id === id) {
        const newStatus = r.status === 'Đang khai thác' ? 'Ngưng khai thác' : 'Đang khai thác';
        toast({ title: "Cập nhật", description: `Đã chuyển sang ${newStatus}` });
        return { ...r, status: newStatus };
      }
      return r;
    }));
  };

  // 3. LOGIC LƯU (GIỮ NGUYÊN VALIDATE CỦA BẠN)
  const handleSave = () => {
    if (!formData.name || !formData.startPoint || !formData.endPoint) {
      toast({ variant: "destructive", title: "Thiếu thông tin", description: "Vui lòng nhập đầy đủ Tên tuyến, Điểm đi và Điểm đến" });
      return;
    }

    const dist = Number(formData.distance);
    const durH = Number(formData.duration);
    const durM = Number(formData.durationMinutes);

    if (dist <= 0) {
      toast({ variant: "destructive", title: "Lỗi cự ly", description: "Cự ly phải là số dương lớn hơn 0" });
      return;
    }

    if (durH < 0 || durM < 0 || (durH === 0 && durM === 0)) {
      toast({ variant: "destructive", title: "Lỗi thời gian", description: "Thời gian dự kiến không hợp lệ" });
      return;
    }

    if (formData.startPoint === formData.endPoint) {
      toast({ variant: "destructive", title: "Lỗi địa điểm", description: "Điểm đến không được trùng với Điểm xuất phát" });
      return;
    }

    // Thực hiện lưu vào danh sách
    if (editingRoute) {
      setRoutes(prev => prev.map(r => r.id === editingRoute.id ? { ...formData, id: r.id } : r));
    } else {
      setRoutes(prev => [...prev, { ...formData, id: Date.now() }]);
    }

    toast({ title: "Thành công", description: editingRoute ? "Đã cập nhật" : "Đã thêm mới" });
    setIsDialogOpen(false);
  };

  const handleEdit = (route: any) => {
    setEditingRoute(route);
    setFormData(route);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number, status: string) => {
    if (status === "Đang khai thác") {
      toast({ variant: "destructive", title: "Không thể xóa", description: "Vui lòng chuyển trạng thái sang Tạm ngưng" });
    } else {
      setRoutes(prev => prev.filter(r => r.id !== id));
      toast({ title: "Đã xóa", description: "Tuyến đường đã được loại bỏ" });
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 text-shadow-sm">Quản lý tuyến đường</h1>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if(!open) {
            setEditingRoute(null);
            setFormData({ name: '', startPoint: '', endPoint: '', distance: '', duration: '', durationMinutes: '0', status: 'Đang khai thác' });
          }
        }}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-blue-600 text-blue-600 bg-white hover:bg-blue-50 h-10 px-5 rounded-xl font-bold transition-colors">
              <Plus className="mr-2 h-4 w-4 stroke-[2.5]" /> Thêm tuyến đường mới
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-[500px] border border-slate-300 shadow-xl rounded-2xl bg-white overflow-visible">
            <DialogHeader className="border-b border-slate-100 pb-4">
              <DialogTitle className="text-2xl font-bold text-slate-800 tracking-tight">
                {editingRoute ? 'Cập nhật tuyến đường' : 'Thêm tuyến đường mới'}
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-6 py-6">
              {/* Tên tuyến */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-semibold text-slate-600">Tên tuyến</Label>
                <Input 
                  className="col-span-3 border-slate-300 h-11 transition-all bg-white" 
                  placeholder="VD: Đà Nẵng - Huế" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                />
              </div>

              {/* Điểm đi */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold text-slate-800">Điểm đi</Label>
                <div className="col-span-3">
                  <Select value={formData.startPoint} onValueChange={(v) => setFormData({...formData, startPoint: v})}>
                    <SelectTrigger className="border-2 border-slate-300 h-11 font-medium bg-white">
                      <SelectValue placeholder="Chọn điểm đi" /> 
                    </SelectTrigger>
                    <SelectContent className="bg-white border-2 border-slate-200 z-[9999]">
                      {PROVINCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Điểm đến */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold text-slate-800">Điểm đến</Label>
                <div className="col-span-3">
                  <Select value={formData.endPoint} onValueChange={(v) => setFormData({...formData, endPoint: v})}>
                    <SelectTrigger className="border-2 border-slate-300 h-11 font-medium bg-white">
                      <SelectValue placeholder="Chọn điểm đến" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-2 border-slate-200 z-[9999]">
                      {PROVINCES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Cự ly & Thời gian */}
              <div className="grid grid-cols-2 gap-6 pt-2">
                <div className="space-y-2 px-1 text-left">
                  <Label className="font-semibold text-slate-600 ml-1">Cự ly (km)</Label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      className="border-slate-300 h-11 font-bold text-slate-900 pr-10 bg-white" 
                      value={formData.distance} 
                      onChange={(e) => setFormData({...formData, distance: e.target.value})} 
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">KM</span>
                  </div>
                </div>

                <div className="space-y-2 px-1 text-left">
                  <Label className="font-semibold text-slate-600 ml-1">Thời gian dự kiến</Label>
                  <div className="flex h-11 items-center border border-slate-300 rounded-md bg-white px-2 gap-1">
                    <Input 
                      type="number" className="h-8 border-none text-center font-bold w-full p-0 focus-visible:ring-0" 
                      placeholder="00" value={formData.duration} onChange={(e) => setFormData({...formData, duration: e.target.value})}
                    />
                    <span className="text-slate-400 font-bold text-sm">h</span>
                    <span className="text-slate-200 mx-0.5">|</span>
                    <Input 
                      type="number" className="h-8 border-none text-center font-bold w-full p-0 focus-visible:ring-0" 
                      placeholder="00" value={formData.durationMinutes} onChange={(e) => setFormData({...formData, durationMinutes: e.target.value})}
                    />
                    <span className="text-slate-400 font-bold text-sm">m</span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="bg-slate-50/50 p-6 border-t border-slate-100 mt-2">
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="font-semibold text-slate-500">Hủy</Button>
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
                <TableHead className="font-bold">Thời gian</TableHead>
                <TableHead className="font-bold">Trạng thái</TableHead>
                <TableHead className="text-center font-bold">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.map((route, index) => (
                <TableRow key={route.id}>
                  <TableCell className="text-center">{index + 1}</TableCell>
                  <TableCell className="font-semibold text-blue-600">{route.name}</TableCell>
                  <TableCell>{route.startPoint}</TableCell>
                  <TableCell>{route.endPoint}</TableCell>
                  <TableCell>{route.distance}</TableCell>
                  <TableCell>{route.duration}h {route.durationMinutes}m</TableCell>
                  <TableCell>
                    {/* ĐỔI BADGE THÀNH BUTTON TƯƠNG TÁC */}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toggleStatus(route.id)}
                      className={`h-8 px-3 rounded-full font-bold transition-all duration-300 border-none ${
                        route.status === 'Đang khai thác' 
                        ? "bg-green-100 text-green-700 hover:bg-green-200" 
                        : "bg-red-100 text-red-700 hover:bg-red-200"
                      }`}
                    >
                      {route.status}
                    </Button>
                  </TableCell>
                  <TableCell className="text-center space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(route)}>
                      <Pencil className="h-4 w-4 text-amber-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(route.id, route.status)}>
                      <Trash2 className="h-4 w-4 text-slate-400" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}