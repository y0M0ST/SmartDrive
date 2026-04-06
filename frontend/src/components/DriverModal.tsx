import { useState, useEffect } from 'react';

// 1. COMPONENT INPUT & SELECT DÙNG CHUNG
interface FloatingInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  type?: string;
  readOnly?: boolean;
}

const FloatingInput = ({ label, value, onChange, error, placeholder = '', type = 'text', readOnly = false }: FloatingInputProps) => (
  <div className="relative mt-6">
    <label className={`absolute -top-2.5 left-3 bg-white px-1 text-[13px] font-medium z-10 transition-colors ${error ? 'text-red-500' : 'text-slate-600'}`}>
      {label} <span className="text-red-500">*</span>
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`w-full px-4 py-3 border rounded-lg outline-none text-sm text-slate-800 transition-all ${
        error ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-100' : 'border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-100'
      } ${readOnly ? 'bg-slate-50' : 'bg-white'}`}
    />
    {error && <p className="text-xs text-red-500 mt-1.5 ml-1 font-medium">{error}</p>}
  </div>
);

// --- COMPONENT CHÍNH ---
interface DriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  initialData?: any;
}

const DriverModal = ({ isOpen, onClose, mode, initialData }: DriverModalProps) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    licenseNumber: '',
    licenseClass: '',
    expiryDate: '',
    avatar: '',
    status: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        // Đổ dữ liệu từ hàng (Row) đang chọn vào các ô Input
        setFormData({ 
          ...initialData,
          // Đảm bảo format ngày yyyy-MM-dd để ô input date hiểu được
          expiryDate: initialData.expiryDate ? initialData.expiryDate.split('T')[0] : ''
        });
        setPreviewUrl(initialData.face_image_url || null);
      } else {
        // Reset form nếu là thêm mới
        setFormData({ fullName: '', email: '', phone: '', licenseNumber: '', licenseClass: '', expiryDate: '', avatar: '', status: '' });
        setPreviewUrl(null);
      }
      setErrors({});
    }
  }, [isOpen, mode, initialData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // --- CHỈ KIỂM TRA LỖI KHI Ở CHẾ ĐỘ THÊM MỚI ---
    if (mode === 'add') {
      if (!formData.licenseNumber.trim()) newErrors.licenseNumber = 'Số hạng bằng lái không được bỏ trống';
      if (!formData.fullName.trim()) newErrors.fullName = 'Họ và tên không được bỏ trống';
      if (!formData.email.trim()) newErrors.email = 'Email không được bỏ trống';
      if (!formData.phone.trim()) {
        newErrors.phone = 'Số điện thoại không được bỏ trống';
      } else if (!/^\d+$/.test(formData.phone.trim())) {
        newErrors.phone = 'Số điện thoại chỉ được chứa chữ số';
      }
      if (!formData.status.trim()) newErrors.status = 'Vui lòng chọn trạng thái';
      if (!previewUrl) {
        newErrors.avatar = 'Bắt buộc phải có hình ảnh để hệ thống AI nhận diện';
      }
    }
      
    // --- CÁC TRƯỜNG DÙNG CHUNG (CẢ THÊM VÀ SỬA) ---
    if (!formData.licenseClass.trim()) newErrors.licenseClass = 'Vui lòng chọn hạng bằng lái';
    if (!formData.expiryDate.trim()) {
      newErrors.expiryDate = 'Ngày hết hạn không được bỏ trống';
    } else {
      const selectedDate = new Date(formData.expiryDate);
      
      // Nếu ngày nhập vào nhỏ hơn hoặc bằng ngày hôm nay => Báo lỗi
      if (selectedDate <= today) {
        newErrors.expiryDate = 'Ngày hết hạn không hợp lệ (Phải là ngày trong tương lai)';
      }
    }
    

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      try {
        const apiUrl = mode === 'edit' 
          ? `http://localhost:5000/api/drivers/${initialData.id}` 
          : `http://localhost:5000/api/drivers`;

        // Tạo object dữ liệu sạch để gửi đi
        const dataToSend = {
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          license_number: formData.licenseNumber,
          license_class: formData.licenseClass,
          expiry_date: formData.expiryDate,
          status: formData.status,
          face_image_url: previewUrl // Gửi cái ảnh chân dung đang hiển thị
        };

        console.log("Dữ liệu thực tế gửi đi:", dataToSend);

        const response = await fetch(apiUrl, {
          method: mode === 'edit' ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dataToSend),
        });

        if (response.ok) {
          alert(`Hệ thống: ${mode === 'edit' ? 'Cập nhật' : 'Thêm'} thành công!`);
          onClose(); 
          // Quan trọng: Đợi 1 chút cho DB kịp ghi rồi mới reload
          setTimeout(() => {
            window.location.reload();
          }, 500); 
        } else {
          const errorData = await response.json();
          alert("Lỗi từ Server: " + (errorData.message || "Không thể lưu"));
        }

      } catch (error) {
        console.error("Lỗi kết nối:", error);
        alert("Lỗi: Không kết nối được với Server. Rin kiểm tra xem Port 5000 đã chạy chưa?");
      }
    }
  };
  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: '' });
  };

  const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.face_image_url || null);
  const [isDragging, setIsDragging] = useState(false); // Để đổi màu ô upload khi kéo ảnh vào
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFile = (file: File) => {
    // 1. Kiểm tra định dạng (Chỉ cho phép jpg, jpeg, png)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert("❌ Lỗi: Chỉ chấp nhận định dạng .jpg, .png !");
      return;
    }

    // 2. Kiểm tra dung lượng (5MB = 5 * 1024 * 1024 bytes)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("❌ Lỗi: File quá lớn! Vui lòng chọn ảnh dưới 5MB.");
      return;
    }

    // 3. Nếu mọi thứ OK thì mới tiến hành Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
      setErrors({ ...errors, avatar: '' }); // Xóa lỗi đỏ nếu có
    };
    reader.readAsDataURL(file);
    setSelectedFile(file); // Lưu file thật để gửi đi
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-[500px] max-h-[95vh] flex flex-col relative animate-fade-in-up">
        
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-500 transition-colors z-10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="pt-8 pb-2 px-8 text-center">
          <h2 className="text-[22px] font-bold text-slate-800 tracking-tight uppercase">
            {mode === 'add' ? 'Thêm tài xế' : 'Cập nhật tài xế'}
          </h2>
        </div>

        <div className="px-10 pb-10 overflow-y-auto">
          <form onSubmit={handleSubmit} className="flex flex-col">
            
            {/* NHÓM CÁC Ô CHỈ HIỆN KHI THÊM TÀI XẾ */}
            {mode === 'add' && (
              <>
                <FloatingInput label="Họ và tên" value={formData.fullName} onChange={(val) => handleChange('fullName', val)} error={errors.fullName} />
                <FloatingInput label="Email" value={formData.email} onChange={(val) => handleChange('email', val)} error={errors.email} type="email" />
                <FloatingInput label="Số điện thoại" value={formData.phone} onChange={(val) => handleChange('phone', val)} error={errors.phone} />
                
                {/* Ô Số hạng bằng lái đã được đưa vào đây để ẩn khi Cập nhật */}
                <FloatingInput label="Số hạng bằng lái" value={formData.licenseNumber} onChange={(val) => handleChange('licenseNumber', val)} error={errors.licenseNumber} />
              </>
            )}

            {/* NHÓM CÁC Ô HIỆN Ở CẢ 2 CHẾ ĐỘ */}
            <div className="relative mt-6">
              <label className={`absolute -top-2.5 left-3 bg-white px-1 text-[13px] font-medium z-10 ${errors.licenseClass ? 'text-red-500' : 'text-slate-600'}`}>
                Hạng bằng lái <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.licenseClass}
                onChange={(e) => handleChange('licenseClass', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg outline-none text-sm text-slate-800 appearance-none bg-white transition-all ${
                  errors.licenseClass ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-sky-500'
                }`}
              >
                <option value="">Chọn hạng bằng</option>
                {['B1', 'B2', 'C', 'D', 'FC', 'FD', 'E'].map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            
            <FloatingInput label="Ngày hết hạn" value={formData.expiryDate} onChange={(val) => handleChange('expiryDate', val)} error={errors.expiryDate} placeholder="dd/mm/yyyy" />

            {/* PHẦN CHỈ HIỆN KHI THÊM (Trạng thái và Chân dung) */}
            {mode === 'add' && (
              <>
                {/* --- 1. COMBOBOX TRẠNG THÁI (MỚI) --- */}
                <div className="relative mt-6">
                  <label className={`absolute -top-2.5 left-3 bg-white px-1 text-[13px] font-medium z-10 transition-colors ${errors.status ? 'text-red-500' : 'text-slate-600'}`}>
                    Trạng thái tài xế <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={formData.status}
                      onChange={(e) => handleChange('status', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg outline-none text-sm text-slate-800 appearance-none bg-white transition-all pr-10 ${
                        errors.status ? 'border-red-500 focus:border-red-500' : 'border-slate-300 focus:border-sky-500'
                      }`}
                    >
                      <option value="">Chọn trạng thái</option>
                      <option value="active">Active (Hoạt động)</option>
                      <option value="banned">Banned (Tạm khóa)</option>
                    </select>
                    {/* Icon mũi tên cho Select */}
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {errors.status && <p className="text-xs text-red-500 mt-1.5 ml-1 font-medium">{errors.status}</p>}
                </div>

                {/* --- 2. KHU VỰC CHÂN DUNG (THU NHỎ GỌN GÀNG) --- */}
                {/* --- KHU VỰC CHÂN DUNG CÓ BÁO LỖI --- */}
                <div className="relative mt-6">
                  <label className={`absolute -top-2.5 left-3 bg-white px-1 text-[13px] font-medium z-10 transition-colors ${errors.avatar ? 'text-red-500' : 'text-slate-600'}`}>
                    Chân dung tài xế <span className="text-red-500">*</span>
                  </label>
                  
                  <div 
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files[0];
                      if (file) handleFile(file);
                    }}
                    // Sửa Class: Nếu có lỗi (errors.avatar) thì hiện viền đỏ rực
                    className={`relative border-2 border-dashed rounded-xl p-3 transition-all flex flex-col items-center justify-center min-h-[120px] ${
                      errors.avatar 
                        ? 'border-red-500 bg-red-50 animate-pulse' // Hiệu ứng đỏ nhấp nháy khi lỗi
                        : isDragging ? 'border-sky-500 bg-sky-50' : 'border-slate-300 bg-slate-50'
                    }`}
                  >
                    {previewUrl ? (
                      <div className="relative group">
                        <img 
                          src={previewUrl} 
                          alt="Preview" 
                          className="w-24 h-24 object-cover rounded-xl border-2 border-white shadow-md" 
                        />
                        <button 
                          type="button"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setPreviewUrl(null); 
                            setFormData({...formData, avatar: ''});
                            // Xóa lỗi ngay khi người dùng bấm xóa ảnh để chọn lại
                            setErrors({...errors, avatar: ''}); 
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg scale-90"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="text-center cursor-pointer group w-full py-2" onClick={() => document.getElementById('fileInput')?.click()}>
                        <div className={`mx-auto h-8 w-8 transition-colors ${errors.avatar ? 'text-red-400' : 'text-slate-300'}`}>
                          <svg fill="none" stroke="currentColor" viewBox="0 0 48 48">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <p className={`mt-1 text-[13px] font-bold ${errors.avatar ? 'text-red-500' : 'text-slate-500'}`}>
                          {errors.avatar ? "Chưa có ảnh!" : "Kéo thả ảnh"}
                        </p>
                        <input id="fileInput" type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                      </div>
                    )}
                  </div>

                  {/* --- DÒNG THÔNG BÁO LỖI ĐỎ CHÓT (QUAN TRỌNG NHẤT) --- */}
                  {errors.avatar && (
                    <p className="text-[11px] text-red-600 mt-2 ml-1 font-bold italic animate-bounce">
                      ⚠️ {errors.avatar}
                    </p>
                  )}
                </div>
              </>
            )}

            <div className="mt-8 flex justify-center">
              <button 
                type="submit" 
                className="bg-sky-500 hover:bg-sky-600 text-white font-bold px-12 py-3 rounded-xl shadow-lg shadow-sky-100 transition-all active:scale-95"
              >
                {mode === 'add' ? 'Thêm tài xế' : 'Cập nhật tài xế'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default DriverModal;