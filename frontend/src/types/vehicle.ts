export interface Vehicle {
  id: string;
  licensePlate: string; // Biển số xe (VD: 43B-123.45) 
  type: string;         // Loại xe (Giường nằm/Ghế ngồi) 
  capacity: number;     // Số chỗ (16/29/45) 
  status: string;       // Trạng thái (Sẵn sàng/Đang chạy/Bảo dưỡng) 
  deviceId: string;     // Mã Camera AI gắn trên xe 
}