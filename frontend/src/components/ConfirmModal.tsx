
import type { ReactElement } from 'react';
// Định nghĩa các props để có thể tái sử dụng cho nhiều trường hợp xóa khác nhau
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  itemName?: string; // Tên của đối tượng đang muốn xóa (VD: "Tài xế Nguyễn Văn A")
}

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Xác nhận xóa", 
  message = "Bạn có chắc chắn muốn xóa",
  itemName = "dữ liệu này"
}: ConfirmModalProps): ReactElement | null => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-[400px] max-w-[95%] overflow-hidden animate-fade-in-up p-6">
        
        {/* Phần Icon cảnh báo & Nội dung */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-500">
            {message} <span className="font-semibold text-gray-800">"{itemName}"</span>? Hành động này không thể hoàn tác.
          </p>
        </div>

        {/* Phần nút bấm */}
        <div className="mt-8 flex justify-end gap-3 w-full">
          <button 
            onClick={onClose} 
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Hủy
          </button>
          <button 
            onClick={onConfirm} 
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-sm shadow-red-600/30 transition-all active:scale-95"
          >
            Đồng ý xóa
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default ConfirmModal;