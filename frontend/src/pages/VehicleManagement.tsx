import { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import CoachModal from '../components/VehicleModal'; 
import ConfirmModal from '../components/ConfirmModal'; 

// --- Định nghĩa Interface cho Xe ---
interface Vehicle {
  id: string;
  license_plate: string; // Sửa licensePlate thành license_plate
  vehicle_type: string;  // Sửa type thành vehicle_type
  seat_count: number;    // Sửa capacity thành seat_count
  status: string;
  device_id: string;     // Sửa deviceId thành device_id
}

const VehicleManagement = ({ isDarkMode, setIsDarkMode }: any) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]); // Để mảng rỗng nè Rin
  const [loading, setLoading] = useState(true);

  // --- HÀM LẤY DANH SÁCH XE ---
 const fetchVehicles = async () => {
  try {
    setLoading(true);
    const response = await axios.get('http://localhost:5000/api/vehicles');
    
    // JSON của bạn bọc data trong response.data.data

    const dataBE = response.data.data || []; 
    
    setVehicles(dataBE);
  } catch (error) {
    console.error("Lỗi lấy danh sách xe:", error);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchVehicles();
  }, []);

  // Chèn thêm 3 state bộ lọc này vào ngay dưới các state cũ
  const [filterType, setFilterType] = useState('');
  const [filterCapacity, setFilterCapacity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // 2. STATE TÌM KIẾM & PHÂN TRANG
  const [searchInput, setSearchInput] = useState(''); 
  const [appliedSearch, setAppliedSearch] = useState(''); 
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; 

  // --- STATE MODAL THÊM/SỬA XE ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedCoach, setSelectedCoach] = useState<any>(null);

  // --- STATE MODAL XÁC NHẬN XÓA XE ---
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);

  // 3. LOGIC LỌC DỮ LIỆU
  // 3. LOGIC LỌC DỮ LIỆU - RIN THAY ĐOẠN NÀY NHÉ
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      // 1. Tìm kiếm theo biển số (Chấp nhận cả 43B, 43b)
      const plate = v.license_plate?.toLowerCase() || '';
      const matchSearch = plate.includes(appliedSearch.toLowerCase());
      
      // 2. Lọc theo Loại xe
      const matchType = filterType === '' || v.vehicle_type === filterType;
      
      // 3. Lọc theo Số chỗ
      const matchCapacity = filterCapacity === '' || v.seat_count?.toString() === filterCapacity;
      
      // 4. Lọc theo Trạng thái (Quan trọng: Phải khớp với 'available' của BE)
      const matchStatus = filterStatus === '' || v.status === filterStatus;
      
      // Kết hợp tất cả điều kiện bằng logic AND (&&)
      return matchSearch && matchType && matchCapacity && matchStatus;
    });
  }, [vehicles, appliedSearch, filterType, filterCapacity, filterStatus]);

  // 4. LOGIC PHÂN TRANG
  const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage);
  
  const currentVehicles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredVehicles.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredVehicles, currentPage]);

  const handleExecuteSearch = () => {
    setAppliedSearch(searchInput);
    setCurrentPage(1); 
  };

  // --- HÀM XỬ LÝ MODAL THÊM ---
  const handleOpenAddModal = () => {
    setModalMode('add');
    setSelectedCoach(null);
    setIsModalOpen(true);
  };

  // --- HÀM XỬ LÝ MODAL SỬA ---
  const handleOpenEditModal = (vehicle: Vehicle) => {
    setModalMode('edit');
    setSelectedCoach({
      id: vehicle.id,
      licensePlate: vehicle.license_plate,
      type: vehicle.vehicle_type,
      capacity: vehicle.seat_count,
      status: vehicle.status === 'maintenance' ? 'Bảo dưỡng' : 
              vehicle.status === 'available' ? 'Sẵn sàng' : 'Đang chạy', // Thêm dòng này
      deviceId: vehicle.device_id
    });
    setIsModalOpen(true);
  };

  // --- 1. Hàm Thêm và Sửa ---
const handleModalConfirm = async (formData: any) => {
  try {
    if (modalMode === 'add') {
      // Gọi API thêm xe mới
      await axios.post('http://localhost:5000/api/vehicles', formData);
    } else {
      // Gọi API sửa xe (cần ID)
      await axios.put(`http://localhost:5000/api/vehicles/${selectedCoach?.id}`, formData);
    }
    
    await fetchVehicles(); // Quan trọng: Load lại bảng ngay lập tức
    setIsModalOpen(false);
  } catch (error) {
    console.error("Lỗi thao tác xe:", error);
    alert("Không lưu được");
  }
};


const handleConfirmDelete = async () => {
  if (vehicleToDelete) {
    try {
      const response = await axios.delete(`http://localhost:5000/api/vehicles/${vehicleToDelete.id}`);
      
      // Nếu xóa thành công
      await fetchVehicles(); 
      setIsConfirmOpen(false);
      setVehicleToDelete(null);
      alert("🎉 Xóa xe thành công!");

    } catch (error: any) {
      // --- LOGIC KIỂM TRA XE ĐANG CHẠY (TEST CASE RÀNG BUỘC) ---
      const serverMessage = error.response?.data?.message || "";
      
      if (error.response?.status === 400 && 
         (serverMessage.includes("on_trip") || serverMessage.includes("hành trình"))) {
        
        // Hiện thông báo đúng như yêu cầu Test Case
        alert("❌ Lỗi: Không thể xóa phương tiện đang trong hành trình!");
      } else {
        alert("❌ Lỗi: Không thể xóa phương tiện đang trong hành trình!");
      }
      
      setIsConfirmOpen(false); // Đóng modal xác nhận sau khi báo lỗi
    }
  }
};
const handleDeleteClick = (vehicle: Vehicle) => {
  setVehicleToDelete(vehicle); // Lưu thông tin xe cần xóa vào kho
  setIsConfirmOpen(true);       // Mở cái bảng hỏi "Bạn có chắc không?"
};


  return (
    <div className={`flex h-screen font-sans antialiased overflow-hidden transition-colors duration-300 ${
      isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'
    }`}>
      
      {/* --- SIDEBAR (GIỮ NGUYÊN GIAO DIỆN GỐC) --- */}
      <aside className={`w-[280px] flex flex-col h-full z-10 border-r transition-colors duration-300 ${
        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
      }`}>
        <div className="h-20 flex items-center px-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-lg shadow-blue-600/30">
              <span className="text-sm tracking-wider">SD</span>
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900 italic">Safe Drive</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
          <button className="w-full flex items-center gap-4 px-4 py-3 text-[14px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
            Dashboard
          </button>
          <button className="w-full flex items-center gap-4 px-4 py-3 text-[14px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path strokeLinecap="round" strokeLinejoin="round" d="M22 21v-2a4 4 0 0 0-3-3.87"/><path strokeLinecap="round" strokeLinejoin="round" d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Quản lí tài xế
          </button>
          <button className="w-full flex items-center gap-4 px-4 py-3 text-[14px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path strokeLinecap="round" strokeLinejoin="round" d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>
            Quản lí tuyến đường
          </button>
          <button className="w-full flex items-center gap-4 px-4 py-3 text-[14px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Quản lí chuyến đi
          </button>
          <button className="w-full flex items-center gap-4 px-4 py-3 text-[14px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect width="20" height="14" x="2" y="3" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            Lịch sử vi phạm
          </button>
          <button className="w-full flex items-center gap-4 px-4 py-3 text-[14px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v5h5"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l4 2"/></svg>
            Đánh giá và xếp hạng
          </button>
          <button className="w-full flex items-center justify-start gap-4 px-4 py-3 text-[14px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all text-left">
            <svg 
              className="w-5 h-5 text-slate-400 shrink-0" // shrink-0 giúp icon không bị bóp méo
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span className="text-left leading-tight">Thống kê thu nhập & báo cáo</span>
          </button>
          <button className="w-full flex items-center gap-4 px-4 py-3 text-[14px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path strokeLinecap="round" strokeLinejoin="round" d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
            Quản lí tài khoản
          </button>
          {/* Quản lí xe (ACTIVE) */}
          <button className="w-full flex items-center gap-4 px-4 py-3 text-[14px] font-bold text-blue-700 bg-blue-50/80 rounded-xl transition-all">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2m10 0a2 2 0 1 0 4 0a2 2 0 0 0-4 0zm-10 0a2 2 0 1 0 4 0a2 2 0 0 0-4 0z" /></svg>
            Quản lí xe
          </button>
        </nav>

        <div className="p-6">
          <div className="bg-[#f8f9fc] rounded-2xl p-4 text-left border border-slate-100">
            <h3 className="font-bold text-[11px] text-slate-800 tracking-wider uppercase">SAFE DRIVE SYSTEM</h3>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Version: 1.0.0.11</p>
          </div>
        </div>
      </aside>

      {/* --- KHU VỰC NỘI DUNG CHÍNH (GIỮ NGUYÊN GIAO DIỆN GỐC) --- */}
      <main className="flex-1 flex flex-col h-full bg-[#fcfcfd]">
        
        <header className={`h-20 flex items-center justify-between px-10 border-b transition-colors duration-300 ${
          isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-3 px-4 py-2 bg-[#f8fafc] rounded-full w-96 shadow-sm border border-slate-100 opacity-60 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Global search..." className="bg-transparent outline-none text-sm text-slate-500 placeholder-slate-400 w-full" readOnly />
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
              <span>Theme</span>
              {/* Thẻ cha (Cái rãnh nút gạt) */}
                <div
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={`w-10 h-5 rounded-full flex items-center p-0.5 cursor-pointer transition-all duration-300 ${
                    isDarkMode ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  {/* Thẻ con (Hình tròn trắng) */}
                  <div 
                    className="w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300"
                    style={{
                      transform: isDarkMode ? 'translateX(20px)' : 'translateX(0px)'
                    }}
                  ></div>
                </div>
            </div>
            <div className="flex gap-4 text-slate-400">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 cursor-pointer hover:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 cursor-pointer hover:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </div>
            <div className="flex items-center gap-3 border-l border-slate-200 pl-6 cursor-pointer">
               <div className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center text-slate-400 bg-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
               </div>
               <span className="font-bold text-sm text-slate-800">Admin</span>
            </div>
          </div>
        </header>

        <div className="flex-1 px-10 py-8 overflow-y-auto">
          
          <div className="flex justify-between items-center mb-6">
             <h1 className="text-[28px] font-extrabold text-slate-800 tracking-tight">Quản lý xe</h1>
             
             <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <input 
                    type="text"
                    placeholder="Nhập biển số xe..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleExecuteSearch()} 
                    className="px-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all w-52"
                  />
                </div>

                <div className="flex items-center gap-5">
                  <button onClick={handleExecuteSearch} className="flex items-center gap-2 text-[14px] font-bold text-slate-700 hover:text-blue-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    Tìm kiếm
                  </button>
                  <div className="flex items-center gap-3">
                    {/* Lọc loại xe */}
                    <select 
                      onChange={(e) => setFilterType(e.target.value)} 
                      className={`px-3 py-2 text-xs border rounded-lg outline-none transition-colors ${
                        isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <option value="" className={isDarkMode ? 'bg-slate-800' : ''}>Loại xe</option>
                      <option value="ghe_ngoi" className={isDarkMode ? 'bg-slate-800' : ''}>Ghế ngồi</option>
                      <option value="giuong_nam" className={isDarkMode ? 'bg-slate-800' : ''}>Giường nằm</option>
                      <option value="limousine" className={isDarkMode ? 'bg-slate-800' : ''}>Limousine</option>
                    </select>

                    {/* Lọc số chỗ */}
                    <select 
                      onChange={(e) => setFilterCapacity(e.target.value)} 
                      className={`px-3 py-2 text-xs border rounded-lg outline-none transition-colors ${
                        isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <option value="" className={isDarkMode ? 'bg-slate-800' : ''}>Số chỗ</option>
                      <option value="16" className={isDarkMode ? 'bg-slate-800' : ''}>16 chỗ</option>
                      <option value="27" className={isDarkMode ? 'bg-slate-800' : ''}>27 chỗ</option>
                      <option value="29" className={isDarkMode ? 'bg-slate-800' : ''}>29 chỗ</option>
                      <option value="36" className={isDarkMode ? 'bg-slate-800' : ''}>36 chỗ</option>
                      <option value="40" className={isDarkMode ? 'bg-slate-800' : ''}>40 chỗ</option>
                      <option value="45" className={isDarkMode ? 'bg-slate-800' : ''}>45 chỗ</option>
                    </select>

                    {/* Lọc trạng thái */}
                    <select 
                      onChange={(e) => setFilterStatus(e.target.value)} 
                      className={`px-3 py-2 text-xs border rounded-lg outline-none transition-colors ${
                        isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <option value="" className={isDarkMode ? 'bg-slate-800' : ''}>Trạng thái</option>
                      <option value="available" className={isDarkMode ? 'bg-slate-800' : ''}>Sẵn sàng</option>
                      <option value="on_trip" className={isDarkMode ? 'bg-slate-800' : ''}>Đang chạy</option>
                      <option value="maintenance" className={isDarkMode ? 'bg-slate-800' : ''}>Bảo dưỡng</option>
                    </select>
                  </div>
                </div>

                <button onClick={handleOpenAddModal} className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-sm shadow-blue-600/30 ml-2">
                    <span className="text-lg leading-none">+</span> Thêm xe mới
                </button>
             </div>
          </div>

          <div className="w-full bg-white rounded-xl border-[1.5px] border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            <div className="flex-1 w-full overflow-hidden">
              <table className="w-full text-left text-[14px] text-slate-600">
                <thead className="border-b border-slate-100 bg-[#fdfdfd]">
                  <tr className="h-14">
                    <th className="py-4 px-6 w-20 text-center">STT</th>
                    <th className="py-4 px-6">Biển số xe</th>
                    <th className="py-4 px-6">Loại xe</th>
                    <th className="py-4 px-6 text-center">Số chỗ</th>
                    <th className="py-4 px-6 text-center">Trạng thái</th>
                    <th className="py-4 px-6">Mã camera</th>
                    <th className="py-4 px-6 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentVehicles.length > 0 ? (
                    currentVehicles.map((v, index) => (
                      <tr key={v.id} className="hover:bg-slate-50 transition-colors h-14 text-slate-600">
                        <td className="px-6 text-center text-slate-500 font-medium">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>
                        
                        <td className="px-6 font-bold text-blue-600 cursor-pointer uppercase">
                          {v.license_plate}
                        </td>

                        <td className="px-6 font-medium capitalize">
                          {v.vehicle_type === 'ghe_ngoi' ? 'Ghế ngồi' : 
                          v.vehicle_type === 'giuong_nam' ? 'Giường nằm' : 
                          v.vehicle_type === 'limousine' ? 'Limousine' : v.vehicle_type}
                        </td>

                        <td className="px-6 text-center font-medium">
                          {v.seat_count}
                        </td>

                        <td className="px-6 text-center">
                          <span className={`inline-flex px-3 py-1 rounded-full text-[12px] font-bold ${
                            (v.status === 'available' || v.status === 'Sẵn sàng') ? 'bg-[#e6f7ee] text-[#00a65a]' : 
                            (v.status === 'maintenance' || v.status === 'Bảo dưỡng') ? 'bg-orange-100 text-orange-600 border border-orange-200' : 
                            'bg-blue-50 text-blue-600'
                          }`}>
                            {
                              (v.status === 'available' || v.status === 'Sẵn sàng') ? 'Sẵn sàng' : 
                              (v.status === 'maintenance' || v.status === 'Bảo dưỡng') ? 'Bảo dưỡng' : 
                              'Đang chạy'
                            }
                          </span>
                        </td>

                        <td className="px-6 text-slate-500 font-medium">
                          {v.device_id || 'N/A'}
                        </td>

                        {/* ĐÂY LÀ Ô HÀNH ĐỘNG DUY NHẤT - KHÔNG ĐƯỢC LẶP */}
                        <td className="px-6 flex items-center justify-center gap-3 h-14">
                          <button onClick={() => handleOpenEditModal(v)} className="text-amber-500 hover:text-amber-600" title="Sửa">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button onClick={() => handleDeleteClick(v)} className="text-slate-300 hover:text-red-500" title="Xóa">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={7} className="py-16 text-center text-slate-500">Không tìm thấy xe nào.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* PHÂN TRANG */}
            {totalPages > 1 && (
              <div className="border-t border-slate-100 bg-[#fdfdfd] p-4 flex items-center justify-between mt-auto">
                <span className="text-sm text-slate-500 font-medium">
                  Đang hiển thị <span className="font-bold text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</span> đến <span className="font-bold text-slate-800">{Math.min(currentPage * itemsPerPage, filteredVehicles.length)}</span> của {filteredVehicles.length} xe
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button key={i + 1} onClick={() => setCurrentPage(i + 1)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${currentPage === i + 1 ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30' : 'text-slate-600 hover:bg-slate-100'}`}>
                      {i + 1}
                    </button>
                  ))}
                  <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MODAL THÊM / SỬA */}
        <CoachModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          mode={modalMode} 
          initialData={selectedCoach} 
          onConfirm={handleModalConfirm} // <-- Đảm bảo cái này đúng tên prop bên trong Modal
        />

        {/* MODAL XÁC NHẬN XÓA */}
        <ConfirmModal 
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)} // Chỉ cần 1 dòng này để đóng modal
          onConfirm={handleConfirmDelete}
          title="Xóa Xe"
          message="Bạn có chắc chắn muốn xóa xe mang biển số"
          itemName={vehicleToDelete?.license_plate || ""}
        />
        
      </main>
    </div>
  );
};

export default VehicleManagement;