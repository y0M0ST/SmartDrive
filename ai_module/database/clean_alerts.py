import sqlite3
import os
import glob

def get_db_path():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.dirname(current_dir)
    return os.path.join(base_dir, 'database', 'local_database.sqlite')

def get_alerts_path():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.dirname(current_dir)
    return os.path.join(base_dir, 'captured_alerts')

def clean_all_data():
    db_path = get_db_path()
    alerts_dir = get_alerts_path()
    
    # 1. DỌN DẸP Ổ CỨNG: Xóa sạch ảnh trong folder
    if os.path.exists(alerts_dir):
        image_files = glob.glob(os.path.join(alerts_dir, "*.jpg"))
        for f in image_files:
            try:
                os.remove(f)
            except Exception as e:
                pass
        print(f"Đã xoá thành công {len(image_files)} tấm ảnh rác trong thư mục captured_alerts.")
    
    # 2. DỌN DẸP DB: Xóa sạch dữ liệu trong SQLite
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Đếm thử xem có bao nhiêu anh tài nằm trong này
        cursor.execute("SELECT COUNT(*) FROM offline_alerts")
        count = cursor.fetchone()[0]
        
        # Lệnh dọn dẹp không dấu vết
        cursor.execute("DELETE FROM offline_alerts")
        conn.commit()
        conn.close()
        
        print(f"Đã xóa sạch {count} dòng báo động ngủ gục trong DB.")
        print("TRẠNG THÁI: DB LẠI SẠCH TINH TƯƠM NHƯ MỚI YÊU!")
    except Exception as e:
        print(f"Lỗi dọn dẹp DB: {e}")

if __name__ == "__main__":
    print("CẢNH BÁO: Thao tác này sẽ xóa vĩnh viễn toàn bộ lịch sử Cảnh Báo và Hình Ảnh.")
    confirm = input("Gõ chữ 'y' rồi Enter để xác nhận xoá: ")
    if confirm.lower() == 'y':
        clean_all_data()
    else:
        print("Đã hủy lệnh xóa. Dữ liệu vẫn an toàn!")
