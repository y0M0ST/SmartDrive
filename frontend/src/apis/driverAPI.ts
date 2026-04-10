import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// 1. Lấy danh sách tài xế (Ảnh 2 của Rin)
export const getDrivers = async () => {
  try {
    const response = await axios.get(`${API_URL}/drivers`);
    return response.data;
  } catch (error) {
    console.error("Lỗi lấy danh sách tài xế:", error);
    return [];
  }
};

// 2. Thêm tài xế mới (Nút + Thêm tài xế)
export const createDriver = async (driverData: any) => {
  try {
    const response = await axios.post(`${API_URL}/drivers`, driverData);
    return response.data;
  } catch (error) {
    console.error("Lỗi thêm tài xế:", error);
    throw error;
  }
};

// 3. Cập nhật thông tin tài xế (Icon Bút chì)
export const updateDriver = async (id: string, driverData: any) => {
  try {
    const response = await axios.put(`${API_URL}/drivers/${id}`, driverData);
    return response.data;
  } catch (error) {
    console.error("Lỗi cập nhật tài xế:", error);
    throw error;
  }
};

// 4. Xóa tài xế (Icon Thùng rác)
export const deleteDriver = async (id: string) => {
  try {
    const response = await axios.delete(`${API_URL}/drivers/${id}`);
    return response.data;
  } catch (error) {
    console.error("Lỗi xóa tài xế:", error);
    throw error;
  }
};