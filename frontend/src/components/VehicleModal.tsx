import React, { useState, useEffect } from 'react';
import axios from 'axios'; // THÊM DÒNG NÀY VÀO ĐẦU FILE
// Định nghĩa kiểu dữ liệu cho Xe khách
interface CoachData {
  id?: string;
  licensePlate: string;
  type: string;
  capacity: number;
  status: string; // Đã đổi từ optional thành bắt buộc cho form
  deviceId: string; // Đã đổi từ optional thành bắt buộc cho form
}

interface CoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  initialData?: CoachData | null;
  onConfirm: (data: CoachData) => void;
}

// 1. COMPONENT INPUT TEXT
// 1. COMPONENT INPUT TEXT (ĐÃ SỬA LỖI CÚ PHÁP)
const FormInput: React.FC<{
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean; // Thêm dòng này
}> = ({ label, name, value, onChange, error, placeholder = "", disabled = false }) => (
  <div className="mb-4">
    <label htmlFor={name} className="block text-sm font-bold text-slate-700 mb-1.5">{label}</label>
    <input
      type="text"
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled} // Gán vào thuộc tính disabled của input
      className={`w-full px-4 py-2.5 border rounded-lg text-sm transition-all outline-none ${
        disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : '' 
      } ${
        error 
          ? 'border-red-500 bg-red-50 focus:ring-red-100' 
          : 'border-slate-200 focus:border-sky-400 text-slate-800'
      }`}
    />
    {error && <p className="text-[11px] text-red-600 mt-1.5 font-bold italic animate-bounce">⚠️ {error}</p>}
  </div>
);

// 2. COMPONENT COMBOBOX (SELECT)
const FormSelect: React.FC<{
  label: string;
  name: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { label: string; value: string | number }[];
}> = ({ label, name, value, onChange, options }) => (
  <div className="mb-4">
    <label htmlFor={name} className="block text-sm font-bold text-slate-700 mb-1.5">{label}</label>
    <select
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-sky-100 focus:border-sky-400 outline-none transition-all appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em_1em]"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")` }}
      required
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const CoachModal: React.FC<CoachModalProps> = ({ isOpen, onClose, mode, initialData, onConfirm }) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<CoachData>({
    licensePlate: '',
    type: 'Khách',
    capacity: 16,
    status: 'Sẵn sàng',
    deviceId: '',
  });

useEffect(() => {
  if (isOpen) {
    if (mode === 'edit' && initialData) {
      // Rin chú ý: initialData lấy từ bảng thường có tên là license_plate
      setFormData({
        licensePlate: (initialData as any).licensePlate || (initialData as any).license_plate || '',
        type: (initialData as any).type || (initialData as any).vehicle_type || 'Khách',
        capacity: (initialData as any).capacity || (initialData as any).seat_count || 16,
        status: (initialData as any).status === 'available' ? 'Sẵn sàng' : 
                (initialData as any).status === 'on_trip' ? 'Đang chạy' : 
                (initialData as any).status === 'maintenance' ? 'Bảo dưỡng' : 
                ((initialData as any).status || 'Sẵn sàng'),
        deviceId: (initialData as any).deviceId || (initialData as any).device_id || '',
      });
    } else {
      // Khi thêm mới thì reset trắng hết
      setFormData({
        licensePlate: '',
        type: 'Khách',
        capacity: 16,
        status: 'Sẵn sàng',
        deviceId: '',
      });
    }
    setErrors({});
  }
}, [isOpen, mode, initialData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'capacity' ? parseInt(value, 10) : value,
    }));
  };
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Regex chuẩn biển số VN: 2 số + 1 chữ + (có thể thêm 1 số) + dấu gạch ngang + 3 số + chấm + 2 số
    const plateRegex = /^[0-9]{2}[A-Z]{1,2}-[0-9]{3,5}(\.[0-9]{2})?$/i;

    if (!formData.licensePlate.trim()) {
      newErrors.licensePlate = 'Biển số xe không được bỏ trống';
    } else if (!plateRegex.test(formData.licensePlate)) {
      // Dòng chữ báo lỗi đỏ theo yêu cầu Test Case của Rin
      newErrors.licensePlate = 'Định dạng biển số không hợp lệ (VD: 43B-123.45)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!validateForm()) return;
  
  try {
    const token = localStorage.getItem("access_token");
    const apiUrl = mode === 'edit' 
      ? `http://localhost:5000/api/vehicles/${initialData?.id}` 
      : `http://localhost:5000/api/vehicles`;

    const statusMapping: Record<string, string> = {
      'Sẵn sàng': 'available',
      'Đang chạy': 'on_trip',
      'Bảo dưỡng': 'maintenance'
    };

    const bodyData = {
      // Dùng ID của dòng 3 trong bảng agencies bạn gửi (DN_B)
      agency_id: "06106255-5978-4306-b948-2f85794641b5", 
      license_plate: formData.licensePlate.trim().toUpperCase(), // Chữ hoa cho chuẩn biển số
      brand: "Thaco", 
      model: formData.type === 'Khách' ? 'Xe khách' : formData.type, 
      seat_count: parseInt(formData.capacity.toString(), 10), // Ép kiểu int4 chuẩn
      vehicle_type: "Xe khách", 
      // Lấy từ mapping, nếu không có thì giữ nguyên (phòng trường hợp value đã là tiếng Anh)
      status: statusMapping[formData.status] || formData.status, 
      registration_expiry_date: "2026-12-31", 
      insurance_expiry_date: "2026-12-31",
      // Nếu mã camera trống hoặc là "N/A" thì gửi null để tránh lỗi UNIQUE
      device_id: (formData.deviceId && formData.deviceId !== 'N/A') ? formData.deviceId.trim() : null, 
    };

    console.log("DỮ LIỆU CHUẨN GỬI LÊN:", bodyData);

    const response = await axios({
      method: mode === 'edit' ? 'PUT' : 'POST',
      url: apiUrl,
      data: bodyData,
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200 || response.status === 201) {
      alert(`🎉 ${mode === 'add' ? 'Thêm mới' : 'Cập nhật'} xe thành công!`);
      onClose();
      if (onConfirm) onConfirm(formData); 
    }
  }  catch (error: any) {
    console.error("Lỗi đầy đủ từ Axios:", error);

    let errorMessage = "Kiểm tra lại dữ liệu hoặc kết nối Server";

    if (error.response && error.response.data) {
      const data = error.response.data;
      const status = error.response.status;
      
      // Chuyển tất cả tin nhắn lỗi về chữ thường để so sánh cho chính xác
      const detail = (data.message || data.error || "").toLowerCase();

      if (status === 409) {
        // So sánh từ khóa 'license' hoặc 'plate' (vì BE thường trả về license_plate)
        if (detail.includes('license') || detail.includes('biển số')) {
          errorMessage = "❌ Lỗi: Biển số xe này đã tồn tại trong hệ thống!";
        } 
        // So sánh từ khóa 'device' hoặc 'camera'
        else if (detail.includes('device') || detail.includes('camera')) {
          errorMessage = "❌ Lỗi: Mã Camera này đã được gắn cho xe khác!";
        } 
        else {
          errorMessage = "❌ Dữ liệu bị trùng lặp trong hệ thống!";
        }
      } else if (status === 401) {
        errorMessage = "❌ Hết hạn đăng nhập, vui lòng Login lại!";
      } else {
        errorMessage = "❌ Lỗi từ Server: " + (data.message || "Dữ liệu không hợp lệ");
      }
    } 
    else if (error.request) {
      errorMessage = "❌ Không nhận được phản hồi từ Server. Rin kiểm tra lại Port 5000 nhé!";
    }

    alert(errorMessage);
  }
};

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 w-full h-full bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative w-full max-w-lg">
        <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 animate-fade-in-up">
          
          {/* Header */}
          <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">
              {mode === 'edit' ? 'Cập nhật thông tin xe' : 'Thêm xe khách mới'}
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="px-8 pt-6 pb-4">
              
              <FormInput 
                label="Biển số xe" 
                name="licensePlate" 
                value={formData.licensePlate || ''} // Đảm bảo lấy từ state formData
                onChange={handleInputChange} 
                error={errors.licensePlate}
                placeholder="Ví dụ: 92C1-123.45"
              />

              <FormSelect 
                label="Loại xe"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                options={[
                  { label: 'Xe Ghế Ngồi', value: 'Ghế ngồi' },
                  { label: 'Xe Giường nằm', value: 'Giường nằm' }
                ]}
              />

              <FormSelect 
                label="Số chỗ"
                name="capacity"
                value={formData.capacity}
                onChange={handleInputChange}
                options={[
                  { label: '16 chỗ', value: 16 },
                  { label: '27 chỗ', value: 27 },
                  { label: '29 chỗ', value: 29 },
                  { label: '36 chỗ', value: 36 },
                  { label: '40 chỗ', value: 40 },
                  { label: '45 chỗ', value: 45 }
                ]}
              />

              <FormSelect 
                label="Trạng thái"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                options={[
                  { label: 'Sẵn sàng', value: 'Sẵn sàng' },
                  { label: 'Đang chạy', value: 'Đang chạy' },
                  { label: 'Bảo dưỡng', value: 'Bảo dưỡng' }
                ]}
              />

              <FormInput 
                label="Mã Camera" 
                name="deviceId" 
                value={formData.deviceId || ''}
                onChange={handleInputChange} 
                
                placeholder="Ví dụ: CAM-01"
              />

            </div>

            {/* Footer */}
            <div className="px-8 py-6 border-t border-slate-100 flex justify-center">
              <button
                type="submit"
                className="px-12 py-3 bg-sky-500 text-white text-sm font-bold rounded-xl hover:bg-sky-600 transition-all shadow-lg shadow-sky-200 active:scale-95 uppercase"
              >
                {mode === 'edit' ? 'Cập nhật' : 'Thêm xe mới'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CoachModal;