// import React, { useState, useEffect } from 'react';
// import { adminApi } from "@/services/adminApi";
// import { toast } from "sonner";
// import { 
//   Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
// } from "@/components/ui/table";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { 
//   Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
// } from "@/components/ui/dialog";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { 
//   Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
// } from "@/components/ui/select";
// import * as Icons from "lucide-react";

// export default function AccountManagementPage() {
//   const [accounts, setAccounts] = useState<any[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [searchQuery, setSearchQuery] = useState("");
  
//   // Quản lý Master-Detail
//   const [selectedAgency, setSelectedAgency] = useState<any>(null);
//   const [drivers, setDrivers] = useState<any[]>([]);
//   const [loadingDrivers, setLoadingDrivers] = useState(false);

//   // Dialog states
//   const [isDialogOpen, setIsDialogOpen] = useState(false);
//   const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
//   const [editingAccount, setEditingAccount] = useState<any>(null);
//   const [accountToDelete, setAccountToDelete] = useState<any>(null);

//   // 1. Lấy thông tin user an toàn
//   const userInfo = JSON.parse(localStorage.getItem("user_info") || "{}");
//   const isSuperAdmin = userInfo.role === "super_admin";
//   const myAgencyId = userInfo.agency_id || userInfo.id; // Chốt chặn lấy ID

//   const [formData, setFormData] = useState({
//     full_name: '', 
//     email: '', 
//     phone: '', // Thêm dòng này
//     role: 'driver', 
//     agency_id: '', 
//     is_active: true
//   });

//   const fetchAccounts = async () => {
//     setLoading(true);
//     try {
//       const res = await adminApi.getList({ search: searchQuery });
//       const data = res.data?.data || res.data;
//       setAccounts(Array.isArray(data) ? data : []);
//     } catch (error) {
//       toast.error("Không thể tải danh sách");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchDriversByAgency = async (agency: any) => {
//     setSelectedAgency(agency);
//     setLoadingDrivers(true);
//     try {
//       const idToQuery = agency.agency_id || agency.id;
//       const res = await adminApi.getDrivers({ agency_id: idToQuery });
//       const data = res.data?.data || res.data;
//       setDrivers(Array.isArray(data) ? data : []);
//     } catch (error) {
//       toast.error("Lỗi tải tài xế");
//     } finally {
//       setLoadingDrivers(false);
//     }
//   };

//   useEffect(() => {
//     if (userInfo.role === 'agency_manager' && !selectedAgency) {
//       setSelectedAgency(userInfo);
//       fetchDriversByAgency(userInfo);
//     } else if (!selectedAgency) {
//       fetchAccounts();
//     }
//   }, [searchQuery, selectedAgency]);

//   // --- FIX DỨT ĐIỂM HÀM LƯU ---
//   const handleSave = async () => {
//     if (!formData.full_name || !formData.email) {
//       toast.error("Nhập đầy đủ tên và email");
//       return;
//     }

//     setLoading(true);
//     try {
//       // Ưu tiên lấy ID: 1. Từ Agency đang được chọn | 2. Từ thông tin người đăng nhập
//       const finalAgencyId = selectedAgency?.agency_id || selectedAgency?.id || myAgencyId;

//       if (formData.role === 'driver') {
//         if (!finalAgencyId) {
//           toast.error("Hệ thống chưa xác định được Agency ID!");
//           setLoading(false);
//           return;
//         }

//         // BƯỚC 1: TẠO DRIVER
// const drRes = await adminApi.createDriverProfile({
//     full_name: formData.full_name,
//   agency_id: finalAgencyId,
//   phone: formData.phone || `0${Math.floor(100000000 + Math.random() * 900000000)}`, // Nếu trống thì tạo số ngẫu nhiên để tránh trùng DB
//   status: "active"
// });

//         // BƯỚC 2: TẠO ACCOUNT
//         await adminApi.createDriverAccount({
//           driver_id: drRes.data?.data?.id,
//           email: formData.email
//         });
//         toast.success("Đã tạo tài xế thành công!");
//       } else {
//         await adminApi.create({ ...formData, agency_id: finalAgencyId });
//         toast.success("Tạo quản trị viên thành công!");
//       }

//       setIsDialogOpen(false);
//       selectedAgency ? fetchDriversByAgency(selectedAgency) : fetchAccounts();
//     } catch (error: any) {
//       toast.error(error.response?.data?.message || "Lỗi khi lưu dữ liệu (500)");
//     } finally {
//       setLoading(false);
//     }
//   };

// const confirmDelete = async () => {
//   if (!accountToDelete) return;

//   setLoading(true);
//   try {
//     if (accountToDelete.role === 'driver') {
//       // Gọi API xóa tài xế
//       await adminApi.deleteDriver(accountToDelete.id);
//     } else {
//       // Gọi API xóa Admin/Agency
//       await adminApi.delete(accountToDelete.id);
//     }

//     toast.success(`Đã xóa tài khoản ${accountToDelete.full_name || accountToDelete.username}`);
    
//     // Load lại danh sách tương ứng
//     selectedAgency ? fetchDriversByAgency(selectedAgency) : fetchAccounts();
//   } catch (error: any) {
//     toast.error(error.response?.data?.message || "Xóa thất bại (500)");
//   } finally {
//     setLoading(false);
//     setIsDeleteConfirmOpen(false);
//     setAccountToDelete(null);
//   }
// };const handleEdit = (acc: any) => {
//   setEditingAccount(acc);
//   setFormData({
//     full_name: acc.full_name || '',
//     email: acc.email || acc.username || '',
//     phone: acc.phone || '', // THÊM DÒNG NÀY
//     role: acc.role,
//     agency_id: acc.agency_id || '',
//     is_active: acc.is_active
//   });
//   setIsDialogOpen(true);
// };  
// const toggleStatus = async (acc: any) => {
//   // Chốt chặn bảo mật: Không cho Agency tự khóa chính mình hoặc khóa Super Admin
//   if (acc.id === userInfo.id) {
//     toast.error("Bạn không thể tự khóa chính mình!");
//     return;
//   }
//   if (acc.role === 'super_admin' && !isSuperAdmin) {
//     toast.error("Bạn không có quyền tác động đến Super Admin!");
//     return;
//   }

//   try {
//     const newStatus = !acc.is_active;
    
//     // Gọi API update (Dùng chung hàm update của adminApi)
//     await adminApi.update(acc.id, { is_active: newStatus });
    
//     toast.success(`Đã ${newStatus ? 'kích hoạt' : 'khóa'} tài khoản ${acc.full_name || acc.username}`);
    
//     // Load lại data
//     selectedAgency ? fetchDriversByAgency(selectedAgency) : fetchAccounts();
//   } catch (error: any) {
//     toast.error("Cập nhật trạng thái thất bại");
//   }
// };
//   return (
//     <div className="space-y-6 p-4">
//       {/* HEADER */}
//       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
//         <div className="flex items-center gap-3">
//           {selectedAgency && isSuperAdmin && (
//             <Button variant="ghost" size="icon" onClick={() => setSelectedAgency(null)} className="rounded-full">
//               <Icons.ChevronLeft size={24} />
//             </Button>
//           )}
//           <div>
//             <h1 className="text-3xl font-black text-slate-800 tracking-tight">
//               {selectedAgency ? `Tài xế: ${selectedAgency.full_name}` : "Quản lý Tài khoản"}
//             </h1>
//           </div>
//         </div>

//         <div className="flex items-center gap-3 w-full md:w-auto">
//           <div className="relative flex-1 md:w-80">
//             <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//             <Input 
//               className="pl-10 rounded-xl" 
//               placeholder="Tìm kiếm..." 
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//             />
//           </div>
          
//           {/* NÚT THÊM MỚI HIỆN Ở ĐÂY CHO CẢ ADMIN VÀ AGENCY */}
//           {(isSuperAdmin || selectedAgency) && (
//             <Button 
//               onClick={() => {
//                 setEditingAccount(null);
//               setFormData({
//   full_name: '', 
//   email: '', 
//   phone: '', // BẮT BUỘC THÊM DÒNG NÀY ĐỂ FIX LỖI 2345
//   role: selectedAgency ? 'driver' : 'agency_manager', 
//   agency_id: selectedAgency?.agency_id || selectedAgency?.id || '', 
//   is_active: true
// });
//                 setIsDialogOpen(true);
//               }} 
//               className="bg-blue-600 hover:bg-blue-700 font-bold rounded-xl shadow-lg"
//             >
//               <Icons.Plus className="mr-2 h-5 w-5" /> 
//               {selectedAgency ? "Thêm tài xế" : "Thêm nhà xe"}
//             </Button>
//           )}
//         </div>
//       </div>

//       <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
//         <CardContent className="p-0">
//           <Table>
//             <TableHeader className="bg-slate-50">
//               <TableRow>
//                 <TableHead className="w-16 text-center font-bold">STT</TableHead>
//                 <TableHead className="font-bold">Họ và tên</TableHead>
//                 <TableHead className="font-bold">{selectedAgency ? "Username/Email" : "Email"}</TableHead>
//                 <TableHead className="font-bold">Vai trò</TableHead>
//                 <TableHead className="text-center font-bold">Hành động</TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {(selectedAgency ? drivers : accounts).map((acc, index) => (
//                 <TableRow key={acc.id} className="hover:bg-slate-50/50 transition-colors">
//                   <TableCell className="text-center font-medium text-slate-500">{index + 1}</TableCell>
//                   <TableCell className="font-bold text-slate-800">{acc.full_name}</TableCell>
//                   <TableCell className="text-slate-500">{acc.email || acc.username}</TableCell>
//                   <TableCell>
//                     <Badge variant="outline" className={`rounded-lg font-bold ${
//                       acc.role === 'super_admin' ? "text-purple-700" :
//                       acc.role === 'agency_manager' ? "text-blue-700" : "text-orange-700"
//                     }`}>
//                       {acc.role === 'super_admin' ? 'Chủ hệ thống' : acc.role === 'agency_manager' ? 'Đại lý' : 'Tài xế'}
//                     </Badge>
//                   </TableCell>
//                   <TableCell className="text-center">
//                     <div className="flex justify-center gap-1">
//                       {acc.role === 'agency_manager' && !selectedAgency && (
//                         <Button variant="ghost" size="icon" onClick={() => fetchDriversByAgency(acc)}>
//                           <Icons.Users className="h-4 w-4 text-blue-600" />
//                         </Button>
//                       )}
//                       {/* ... Các nút edit/delete khác ... */}
//                     </div>
//                   </TableCell>
//                 </TableRow>
//               ))}
//             </TableBody>
//           </Table>
//         </CardContent>
//       </Card>
//       {/* MODAL THÊM/SỬA */}

// <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
//   <DialogContent className="sm:max-w-[450px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl bg-white">
    
//     <DialogHeader className="p-5 pb-4 bg-slate-50 border-b border-slate-100">
//       <DialogTitle className="text-xl font-black text-slate-800 tracking-tight">
//         {editingAccount ? 'Cập nhật tài khoản' : 'Thêm tài khoản mới'}
//       </DialogTitle>
//     </DialogHeader>

//     <div className="p-6 pt-4 space-y-4"> 
      
//       {/* Cặp Label + Input Họ tên */}
//       <div className="space-y-1">
//         <Label className="font-bold text-slate-700 ml-1 text-sm">Họ và tên *</Label>
//         <Input 
//           value={formData.full_name} 
//           onChange={e => setFormData({...formData, full_name: e.target.value})} 
//           className="h-11 rounded-xl border-slate-200 focus:ring-blue-100" 
//           placeholder="Nhập họ tên đầy đủ" 
//         />
//       </div>

//       {/* Cặp Label + Input Email */}
//       <div className="space-y-1">
//         <Label className="font-bold text-slate-700 ml-1 text-sm">Email *</Label>
//         <Input 
//           type="email" 
//           value={formData.email} 
//           onChange={e => setFormData({...formData, email: e.target.value})} 
//           className="h-11 rounded-xl border-slate-200" 
//           placeholder="user@smartdrive.vn" 
//         />
//       </div>
//         {/* Thêm ô Số điện thoại */}
// <div className="space-y-1">
//   <Label className="font-bold text-slate-700 ml-1 text-sm">Số điện thoại *</Label>
//   <Input 
//     value={formData.phone} 
//     onChange={e => setFormData({...formData, phone: e.target.value})} 
//     className="h-11 rounded-xl border-slate-200" 
//     placeholder="0912xxxxxx" 
//   />
// </div>
//       {/* Cặp Label + Select Role */}
//       <div className="space-y-1">
//         <Label className="font-bold text-slate-700 ml-1 text-sm">Vai trò (Role) *</Label>
//         <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
//           <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
//             <SelectValue placeholder="Chọn vai trò" />
//           </SelectTrigger>
          
//           <SelectContent 
//             position="popper" 
//             sideOffset={4} 
//             className="bg-white border border-slate-200 rounded-xl shadow-xl p-1 z-[9999] w-[var(--radix-select-trigger-width)]"
//           >
//   <SelectItem value="agency_manager">Agency Manager</SelectItem>
//   {/* THÊM DÒNG NÀY */}
//   <SelectItem value="driver">Tài xế </SelectItem>
//           </SelectContent>
//         </Select>
//       </div>
//     </div>

//     {/* Footer: Dùng p-6 và h-11 để nút bấm cân đối */}
//     <DialogFooter className="p-6 pt-2 flex items-center gap-3">
//       <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="font-bold text-slate-500 rounded-xl">
//         Hủy
//       </Button>
//       <Button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-11 shadow-lg shadow-blue-100">
//         {editingAccount ? 'Lưu thay đổi' : 'Tạo tài khoản'}
//       </Button>
//     </DialogFooter>
//   </DialogContent>
// </Dialog>

//       {/* MODAL XÁC NHẬN XÓA */}
//       <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
//         <DialogContent className="sm:max-w-[400px] rounded-3xl p-8 bg-white dark:bg-slate-900 border-none shadow-2xl">
//           <div className="text-center space-y-4">
//             <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
//               <Icons.Trash2 className="text-red-500 w-8 h-8" />
//             </div>
//             <DialogTitle className="text-xl font-black text-slate-800 dark:text-white">Xác nhận xóa tài khoản?</DialogTitle>
//             <DialogDescription className="text-slate-500">
//               Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa tài khoản <strong>{accountToDelete?.name}</strong>?
//             </DialogDescription>
//           </div>
//           <div className="flex gap-3 mt-6">
//             <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} className="flex-1 border-slate-200 rounded-xl h-11 font-bold">Hủy</Button>
//             <Button onClick={confirmDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl h-11 font-bold shadow-lg shadow-red-100 dark:shadow-none">Xóa ngay</Button>
//           </div>
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// }