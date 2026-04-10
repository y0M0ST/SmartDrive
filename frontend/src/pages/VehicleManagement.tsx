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
  const [vehicles, setVehicles] = useState<Vehicle[]>([]); 
  const [loading, setLoading] = useState(true);

  // --- HÀM LẤY DANH SÁCH XE ---
 const fetchVehicles = async () => {
  try {
    setLoading(true);
    const token = localStorage.getItem("access_token"); // 1. Lấy token

    const response = await axios.get('http://localhost:5000/api/vehicles', {
      headers: { Authorization: `Bearer ${token}` } // 2. Gửi kèm headers
    });

    const dataBE = response.data.data || response.data; 
    setVehicles(Array.isArray(dataBE) ? dataBE : []);
  } catch (error) {
    console.error("Lỗi 401:kiểm tra lại login nhé!", error);
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
      const token = localStorage.getItem("access_token");
      await axios.delete(`http://localhost:5000/api/vehicles/${vehicleToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // TC_VEH_06: Xóa thành công
      alert("🎉 Xóa xe thành công!");
      await fetchVehicles(); // Load lại bảng ngay
      setIsConfirmOpen(false);
      setVehicleToDelete(null);
    } catch (error: any) {
      // TC_VEH_07: Xử lý lỗi khi xe đang chạy
      const msg = error.response?.data?.message || "";
      if (msg.includes("on_trip") || vehicleToDelete.status === 'on_trip') {
        alert("❌ Lỗi: Không thể xóa phương tiện đang trong hành trình!");
      } else {
        alert("❌ Lỗi: " + msg);
      }
      setIsConfirmOpen(false);
    }
  }
};
const handleDeleteClick = (vehicle: Vehicle) => {
  setVehicleToDelete(vehicle); // Lưu thông tin xe cần xóa vào kho
  setIsConfirmOpen(true);       // Mở cái bảng hỏi "Bạn có chắc không?"
};


  return (
    <div className="w-full transition-colors duration-300">
    
      {/* --- KHU VỰC NỘI DUNG CHÍNH (GIỮ NGUYÊN GIAO DIỆN GỐC) --- */}
      <div className="flex-1 flex flex-col bg-[#fcfcfd]"></div>
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
                      <option value="">Tất cả trạng thái</option>
                      <option value="available">Sẵn sàng</option>
                      <option value="on_trip">Đang chạy</option>
                      <option value="maintenance">Bảo dưỡng</option>
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
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    // --- 1. HIỆU ỨNG SKELETON KHI ĐANG LOAD ---
                    [...Array(itemsPerPage)].map((_, i) => (
                      <tr key={`skeleton-${i}`} className="h-14 animate-pulse">
                        <td className="px-6 text-center"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-8 mx-auto"></div></td>
                        <td className="px-6"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32"></div></td>
                        <td className="px-6"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24"></div></td>
                        <td className="px-6 text-center"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-10 mx-auto"></div></td>
                        <td className="px-6 text-center"><div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-full w-24 mx-auto"></div></td>
                        <td className="px-6"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20"></div></td>
                        <td className="px-6"><div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-lg w-16 mx-auto"></div></td>
                      </tr>
                    ))
                  ) : currentVehicles.length > 0 ? (
                    // --- 2. DỮ LIỆU THẬT (GIỮ NGUYÊN NỘI DUNG CỦA RIN) ---
                    currentVehicles.map((v, index) => (
                      <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors h-14 text-slate-600 dark:text-slate-300">
                        <td className="px-6 text-center text-slate-500 dark:text-slate-400 font-medium">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>
                        
                        <td className="px-6 font-bold text-blue-600 dark:text-blue-400 cursor-pointer uppercase">
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
                            (v.status === 'available' || v.status === 'Sẵn sàng') ? 'bg-[#e6f7ee] text-[#00a65a] dark:bg-green-900/30 dark:text-green-400' : 
                            (v.status === 'maintenance' || v.status === 'Bảo dưỡng') ? 'bg-orange-100 text-orange-600 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-400' : 
                            'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}>
                            {
                              (v.status === 'available' || v.status === 'Sẵn sàng') ? 'Sẵn sàng' : 
                              (v.status === 'maintenance' || v.status === 'Bảo dưỡng') ? 'Bảo dưỡng' : 
                              'Đang chạy'
                            }
                          </span>
                        </td>

                        <td className="px-6 text-slate-500 dark:text-slate-400 font-medium">
                          {v.device_id || 'N/A'}
                        </td>

                        <td className="px-6 flex items-center justify-center gap-3 h-14">
                          <button onClick={() => handleOpenEditModal(v)} className="text-amber-500 hover:text-amber-600 transition-transform hover:scale-110" title="Sửa">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button onClick={() => handleDeleteClick(v)} className="text-slate-300 dark:text-slate-600 hover:text-red-500 transition-transform hover:scale-110" title="Xóa">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    // --- 3. KHI KHÔNG CÓ DỮ LIỆU ---
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-500 dark:text-slate-400">
                        Không tìm thấy xe nào.
                      </td>
                    </tr>
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
          onConfirm={() => fetchVehicles()  } // Thay đổi ở đây
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
        
      </div>
  );
};

export default VehicleManagement;