import { useState, useEffect } from 'react'; // Thêm useEffect ở đây
import axios from 'axios'; // Thêm dòng này
import DriverModal from '../components/DriverModal';
import ConfirmModal from '../components/ConfirmModal';


interface Driver {
  id: string;
  full_name: string;      // Trong DB là full_name, không phải fullName
  phone: string;
  license_number: string; // Trong DB là license_number
  license_type: string;   // Trong DB là license_type (thay cho licenseClass)
  license_expiry_date: string; // Trong DB là license_expiry_date
  face_image_url: string; // Trong DB là face_image_url (thay cho avatar)
  status: string;
  safety_score: number;   // Có thêm cột này trong DB nè Rin
}

const DriverManagement = () => {
  // --- THAY ĐỔI TẠI ĐÂY ---
  const [drivers, setDrivers] = useState<Driver[]>([]); // Khởi tạo mảng rỗng
  const [loading, setLoading] = useState(true); // Trạng thái đợi lấy dữ liệu

  // Hàm này để gọi API lấy danh sách từ Backend
const fetchDrivers = async () => {
  try {
    // 1. Lấy token từ localStorage (đã lưu khi login thành công)
    const token = localStorage.getItem("access_token");

    const response = await axios.get('http://localhost:5000/api/drivers', {
      // 2. Gửi token kèm theo header "Authorization"
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    // 3. Lấy dữ liệu (nhớ check cấu trúc response.data của bạn)
    const dataFromBE = response.data.data || response.data;
    
    setDrivers(Array.isArray(dataFromBE) ? dataFromBE : []);
  } catch (error) {
    console.error("Lỗi 401 rồi, Token có vấn đề hoặc hết hạn!", error);
  } finally {
    setLoading(false);
  }
};
useEffect(() => {
  fetchDrivers();
}, []);
  // --- HẾT PHẦN THAY ĐỔI ---

  // ... (Các State tìm kiếm, Modal bên dưới giữ nguyên)

  // --- STATE TÌM KIẾM ---
  const [searchInput, setSearchInput] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');

  // --- STATE MODAL ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);

  // --- HÀM XỬ LÝ TÌM KIẾM ---
  const filteredDrivers = drivers.filter((driver) => {
    const keyword = appliedQuery.toLowerCase();
    if (!keyword) return true;
    
    // Thêm dấu ?. để nếu full_name bị null thì app không bị trắng trang
    const name = driver.full_name?.toLowerCase() || '';
    const phone = driver.phone || '';
    
    return name.includes(keyword) || phone.includes(keyword);
  });

  const handleSearch = () => {
    setAppliedQuery(searchInput);
  };

  
  // --- HÀM XỬ LÝ MODAL ---
  const handleOpenAdd = () => {
    setModalMode('add');
    setSelectedDriver(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (driver: Driver) => {
    setModalMode('edit');
    setSelectedDriver(driver);
    setIsModalOpen(true);
  };

  // --- THÊM ĐOẠN NÀY ---
  // --- SỬA LẠI ĐOẠN NÀY ---
  const handleDeleteClick = (driver: Driver) => {
    // US_05: Check nếu tài xế đang chạy thì báo lỗi luôn, không cho mở Modal xóa
    if (driver.status === 'on_trip' || driver.status === 'Đang chạy') {
      alert("⚠️ Thất bại: Tài xế đang thực hiện chuyến đi, không thể xóa hồ sơ!");
      return;
    }
    
    setDriverToDelete(driver);
    setIsDeleteModalOpen(true);
  };

  // Tìm hàm handleConfirmDelete và sửa lại như sau:
const handleConfirmDelete = async () => {
  if (driverToDelete) {
    try {
      const token = localStorage.getItem("access_token");
      await axios.delete(`http://localhost:5000/api/drivers/${driverToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Xóa thành công!");
      fetchDrivers(); // Cập nhật lại UI
      setIsDeleteModalOpen(false);
    } catch (error: any) {
      // US_05: Thông báo lỗi nếu tài xế đang thực hiện chuyến đi
      const msg = error.response?.data?.message || "Lỗi xóa tài xế";
      alert("⚠️ " + msg);
    }
  }
};
if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-blue-600 font-bold">
        Đang tải dữ liệu ...
      </div>
    );
  }

const handleSuccess = () => {
  // 1. Tuyệt đối KHÔNG dùng window.location.reload()
  // 2. Chỉ gọi hàm fetchDrivers để cập nhật State drivers
  fetchDrivers();   
  
  // 3. Đóng modal (nếu DriverModal chưa tự đóng)
  setIsModalOpen(false);
};

  const isExpired = (expiryDate: string) => {
  if (!expiryDate) return false;
  const today = new Date();
  const expire = new Date(expiryDate);
  // Nếu ngày hết hạn nhỏ hơn hoặc bằng ngày hôm nay => Hết hạn
  return expire <= today; 
};

  return (
    <div className="w-full">
   

        <div className="flex-1 p-10 overflow-y-auto">
          <div className="max-w-7xl mx-auto bg-white min-h-[600px] flex flex-col justify-between rounded-2xl shadow-sm border-[1.5px] border-slate-800 overflow-hidden">
            <div>
              <div className="p-8 pb-6 flex justify-between items-center border-b border-slate-100">
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Thông tin tài xế</h1>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <input 
                      type="text" 
                      placeholder="Nhập tên hoặc SĐT..." 
                      className="pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 w-72 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()} 
                    />
                  </div>
                  <button 
                    onClick={handleSearch}
                    className="bg-slate-800 hover:bg-slate-900 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-all shadow-sm active:scale-95"
                  >
                    Tìm kiếm
                  </button>
                </div>
              </div>

              <div className="w-full overflow-hidden">
                <table className="w-full text-left text-[14px] text-slate-600">
                  <thead className="bg-[#fdfdfd] border-b border-slate-100">
                    <tr className="text-slate-800 font-bold">
                      <th className="py-4 px-6">Mã tài xế</th>
                      <th className="py-4 px-6">Họ và tên</th>
                      <th className="py-4 px-6">Email</th>
                      <th className="py-4 px-6">Số điện thoại</th>
                      <th className="py-4 px-6 text-center">Số hạng bằng lái</th>
                      <th className="py-4 px-6 text-center">Hạng bằng lái</th>
                      <th className="py-4 px-6 text-center">Ngày hết hạn</th>
                      <th className="py-4 px-6 text-center">Chân dung</th>
                      <th className="py-4 px-6 text-center">Trạng thái</th>
                      <th className="py-4 px-6 text-center">Hành động</th> {/* Thêm cột Hành động */}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDrivers.length > 0 ? (
                      filteredDrivers.map((d) => {
                        // --- LOGIC KIỂM TRA HẾT HẠN ---
                        const today = new Date();
                        const expiryDate = d.license_expiry_date ? new Date(d.license_expiry_date) : null;
                        const isExpired = expiryDate ? expiryDate <= today : false;

                        return (
                          <tr 
                            key={d.id} 
                            // Nếu hết hạn thì dòng hơi ửng đỏ nhẹ (bg-red-50/30)
                            className={`hover:bg-slate-50 transition-colors group ${isExpired ? 'bg-red-50/50' : ''}`}
                          >
                            <td className="py-4 px-6 font-medium text-slate-800 uppercase">{d.id?.substring(0, 5)}</td>
                            <td className="py-4 px-6 font-bold text-slate-800">{d.full_name || 'Chưa rõ tên'}</td>
                            <td className="py-4 px-6 font-medium text-slate-500">N/A</td>
                            <td className="py-4 px-6 font-medium">{d.phone || 'N/A'}</td>
                            <td className="py-4 px-6 text-center font-medium">{d.license_number}</td>
                            <td className="py-4 px-6 text-center font-medium">{d.license_type}</td>
                            
                            {/* --- CỘT NGÀY HẾT HẠN (SỬA Ở ĐÂY) --- */}
                            <td className={`py-4 px-6 text-center font-bold ${isExpired ? 'text-red-600 animate-pulse' : 'text-slate-600'}`}>
                              <div className="flex items-center justify-center gap-1">
                                {isExpired && (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                )}
                                {d.license_expiry_date ? new Date(d.license_expiry_date).toLocaleDateString('vi-VN') : 'N/A'}
                              </div>
                            </td>

                            <td className="py-4 px-6 text-center">
                              {d.face_image_url ? "Có ảnh" : "N/A"}
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold bg-[#e6f7ee] text-[#00a65a]">
                                {d.status}
                              </span>
                            </td>
                            <td className="py-4 px-6 flex justify-center gap-3">
                              <button onClick={() => handleOpenEdit(d)} className="text-amber-500 hover:text-amber-600 transition-colors" title="Sửa">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              </button>
                              <button onClick={() => handleDeleteClick(d)} className="text-slate-400 hover:text-red-500 transition-colors" title="Xóa">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} className="py-16 text-center">
                           <p className="text-slate-500 font-medium">Không tìm thấy tài xế nào khớp với "{appliedQuery}"</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="p-8 bg-white border-t border-slate-100 flex justify-center gap-6">
              
              {/* Nút Thêm Tài Xế Mở Modal */}
              <button onClick={handleOpenAdd} className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-blue-600 bg-white border-[1.5px] border-blue-600 rounded-full hover:bg-blue-50 transition-all shadow-sm active:scale-95">
                <span className="text-lg leading-none font-medium">+</span> Thêm tài xế
              </button>
              
              
            </div>
            
          </div>
        </div>

        {/* GỌI MODAL RA Ở ĐÂY, TRUYỀN DỮ LIỆU */}
      <DriverModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        mode={modalMode} 
        initialData={selectedDriver} 
        onSuccess={handleSuccess} 
      />
      
      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Xóa tài xế"
        message="Bạn có chắc chắn muốn xóa tài xế"
        itemName={driverToDelete?.full_name || ""}
      />
    </div> // Đây là thẻ đóng duy nhất của div ngoài cùng ở dòng 127
  );
};

export default DriverManagement;