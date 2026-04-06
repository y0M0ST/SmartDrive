import React, { useEffect, useState } from 'react'; // Thêm useEffect
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner"; 
import { routeApi } from "@/services/routeApi";

const PROVINCES = ["An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu", "Bắc Ninh", "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước", "Bình Thuận", "Cà Mau", "Cần Thơ", "Cao Bằng", "Đà Nẵng", "Đắk Lắk", "Đắk Nông", "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang", "Hà Nam", "Hà Nội", "Hà Tĩnh", "Hải Dương", "Hải Phòng", "Hậu Giang", "Hòa Bình", "Hưng Yên", "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu"];

export default function RouteListPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [routes, setRoutes] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    startPoint: '',
    endPoint: '',
    distance: '',
    duration: '',
    durationMinutes: '0',
    status: true 
  });

  // 1. FETCH DATA
  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const res = await routeApi.getList();
      const data = res.data?.data || res.data;
      setRoutes(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Không thể tải danh sách tuyến đường");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  // 2. TOGGLE STATUS
  const toggleStatus = async (route: any) => {
    try {
      await routeApi.update(route.id, { is_active: !route.is_active });
      toast.success("Đã cập nhật trạng thái");
      fetchRoutes();
    } catch (error) {
      toast.error("Lỗi khi cập nhật trạng thái");
    }
  };

  // 3. SAVE (CREATE/UPDATE)
  const handleSave = async () => {
    if (!formData.name || !formData.startPoint || !formData.endPoint) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }

    const totalMinutes = (Number(formData.duration) * 60) + Number(formData.durationMinutes);
    const payload = {
      name: formData.name,
      origin: formData.startPoint,
      destination: formData.endPoint,
      distance_km: Number(formData.distance),
      estimated_duration_min: totalMinutes,
      is_active: formData.status
    };

    try {
      if (editingRoute) {
        await routeApi.update(editingRoute.id, payload);
        toast.success("Cập nhật thành công");
      } else {
        await routeApi.create(payload);
        toast.success("Thêm mới thành công");
      }
      setIsDialogOpen(false);
      fetchRoutes();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi lưu dữ liệu");
    }
  };

  // 4. DELETE
  const handleDelete = async (route: any) => {
    if (route.is_active) {
      toast.error("Ngưng khai thác trước khi xóa!");
      return;
    }
    if (confirm(`Xóa tuyến ${route.name}?`)) {
      try {
        await routeApi.delete(route.id);
        toast.success("Xóa tuyến đường thành công");
        fetchRoutes();
      } catch (error) {
        toast.error("Xóa thất bại");
      }
    }
  };

  const handleEdit = (route: any) => {
    setEditingRoute(route);
    const h = Math.floor(route.estimated_duration_min / 60);
    const m = route.estimated_duration_min % 60;
    setFormData({
      name: route.name,
      startPoint: route.origin,
      endPoint: route.destination,
      distance: route.distance_km.toString(),
      duration: h.toString(),
      durationMinutes: m.toString(),
      status: route.is_active
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Quản lý tuyến đường</h1>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-blue-400 hover:bg-blue-700 rounded-xl font-bold">
          <Plus className="mr-2 h-4 w-4" /> Thêm tuyến đường mới
        </Button>
      </div>

      <Card className="shadow-xl border-none rounded-2xl overflow-hidden bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-100">
              <TableRow>
                <TableHead className="w-[70px] text-center font-bold">STT</TableHead>
                <TableHead className="font-bold">Tên tuyến</TableHead>
                <TableHead className="font-bold">Điểm đi</TableHead>
                <TableHead className="font-bold">Điểm đến</TableHead>
                <TableHead className="font-bold">Cự ly</TableHead>
                <TableHead className="font-bold">Thời gian</TableHead>
                <TableHead className="font-bold">Trạng thái</TableHead>
                <TableHead className="text-center font-bold">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10">Đang tải...</TableCell></TableRow>
              ) : routes.map((route, index) => (
                <TableRow key={route.id}>
                  <TableCell className="text-center">{index + 1}</TableCell>
                  <TableCell className="font-semibold text-blue-600">{route.name}</TableCell>
                  <TableCell>{route.origin}</TableCell>
                  <TableCell>{route.destination}</TableCell>
                  <TableCell>{route.distance_km} km</TableCell>
                  <TableCell>
                    {Math.floor(route.estimated_duration_min / 60)}h {route.estimated_duration_min % 60}m
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toggleStatus(route)}
                      className={`h-8 px-3 rounded-full font-bold border-none ${
                        route.is_active 
                        ? "bg-green-100 text-green-700 hover:bg-green-200" 
                        : "bg-red-100 text-red-700 hover:bg-red-200"
                      }`}
                    >
                      {route.is_active ? 'Đang khai thác' : 'Tạm ngưng'}
                    </Button>
                  </TableCell>
                  <TableCell className="text-center space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(route)}>
                      <Pencil className="h-4 w-4 text-amber-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(route)}>
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog giữ nguyên cấu trúc của bạn, chỉ cần gọi handleSave */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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

                      {PROVINCES.map(p => <SelectItem key={p} value={p}
                      className="cursor-pointer transition-colors focus:bg-blue-50 focus:text-blue-700 hover:bg-blue-50 hover:text-blue-700 py-3 rounded-lg font-medium"
                      >{p}</SelectItem>)}

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

                      {PROVINCES.map(p => <SelectItem key={p} value={p}
                      className="cursor-pointer transition-colors focus:bg-blue-50 focus:text-blue-700 hover:bg-blue-50 hover:text-blue-700 py-3 rounded-lg font-medium"
                      >{p}</SelectItem>)}

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
  );
}