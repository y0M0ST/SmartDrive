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

const DriverManagement = ({ isDarkMode, setIsDarkMode }: any) => {
  // --- THAY ĐỔI TẠI ĐÂY ---
  const [drivers, setDrivers] = useState<Driver[]>([]); // Khởi tạo mảng rỗng
  const [loading, setLoading] = useState(true); // Trạng thái đợi lấy dữ liệu

  // Hàm này để gọi API lấy danh sách từ Backend
const fetchDrivers = async () => {
  try {
    const response = await axios.get('http://localhost:5000/api/drivers');
    
    // Sửa dòng này: lấy thẳng response.data.data vì nó là mảng tài xế
    const dataFromBE = response.data.data; 
    
    console.log("Rin ơi, data thực tế đây:", dataFromBE);
    setDrivers(Array.isArray(dataFromBE) ? dataFromBE : []);
  } catch (error) {
    console.error("Lỗi rồi Rin ơi:", error);
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
        // Gửi lệnh xóa lên Backend theo ID
        await axios.delete(`http://localhost:5000/api/drivers/${driverToDelete.id}`);
        
        // Xóa xong thì gọi lại hàm lấy danh sách để cập nhật giao diện
        fetchDrivers(); 
        
        setIsDeleteModalOpen(false);
        setDriverToDelete(null);
      } catch (error) {
        alert("Không xóa được rồi , kiểm tra lại Backend nhé!");
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
    setIsModalOpen(false); // Đóng modal
    fetchDrivers(); // Gọi lại API để lấy data mới nhất từ DBeaver
  };

  const isExpired = (expiryDate: string) => {
  if (!expiryDate) return false;
  const today = new Date();
  const expire = new Date(expiryDate);
  // Nếu ngày hết hạn nhỏ hơn hoặc bằng ngày hôm nay => Hết hạn
  return expire <= today; 
};

  return (
    <div className={`flex h-screen font-sans antialiased overflow-hidden ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}`}>
      
      {/* --- SIDEBAR --- */}
      <aside className={`w-[280px] flex flex-col h-full z-10 border-r ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
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
          <button className="w-full flex items-center gap-4 px-4 py-3 text-[14px] font-bold text-blue-700 bg-blue-50/80 rounded-xl transition-all">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path strokeLinecap="round" strokeLinejoin="round" d="M22 21v-2a4 4 0 0 0-3-3.87"/><path strokeLinecap="round" strokeLinejoin="round" d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
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
          <button className="w-full flex items-center gap-4 px-4 py-3 text-[14px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2m10 0a2 2 0 1 0 4 0a2 2 0 0 0-4 0zm-10 0a2 2 0 1 0 4 0a2 2 0 0 0-4 0z" /></svg>
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

      {/* --- KHU VỰC NỘI DUNG CHÍNH --- */}
      <main className="flex-1 flex flex-col h-full bg-[#fcfcfd] relative">
        <header className={`h-20 flex items-center justify-between px-10 border-b ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-3 px-4 py-2 bg-[#f8fafc] rounded-full w-96 shadow-sm border border-slate-100">
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
          onSuccess={handleSuccess} // Thêm dòng này (nhớ sửa cả code bên trong DriverModal nhé)
        />
        <ConfirmModal 
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          title="Xóa tài xế"
          message="Bạn có chắc chắn muốn xóa tài xế"
          itemName={driverToDelete?.full_name || ""}
        />
        
      </main>
    </div>
  );
};

export default DriverManagement;