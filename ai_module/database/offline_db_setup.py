import sqlite3
import os

def get_db_path():
    """Lấy đường dẫn tuyệt đối tới file database."""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.dirname(current_dir)
    # Tự động tạo thư mục database nếu chưa có
    db_folder = os.path.join(base_dir, 'database')
    os.makedirs(db_folder, exist_ok=True)
    return os.path.join(db_folder, 'local_database.sqlite')

def init_db():
    print("Đang khởi tạo bộ khung Database Offline")
    db_path = get_db_path()
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 1. BẢNG OFFLINE_ALERTS (Xài ID dạng TEXT để chứa UUID)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS offline_alerts (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                violation_type TEXT NOT NULL,
                confidence_score REAL NOT NULL,
                image_path TEXT NOT NULL,
                is_synced INTEGER DEFAULT 0,
                sync_retry_count INTEGER DEFAULT 0
            )
        ''')
        
        # 2. BẢNG DEVICE_CONFIGS 
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS device_configs (
                config_key TEXT PRIMARY KEY,
                config_value TEXT NOT NULL
            )
        ''')
        
        # Bơm sẵn cấu hình mặc định (Chống lỗi nếu chạy file 2 lần)
        default_configs = [
            ('vehicle_id', '43B-123.45'),
            ('drowsy_frames', '10'),
            ('api_endpoint', 'https://api.smartdrive.com/alerts')
        ]
        cursor.executemany('''
            INSERT OR IGNORE INTO device_configs (config_key, config_value)
            VALUES (?, ?)
        ''', default_configs)
        
        # 3. BẢNG FACE_CHECKIN_LOGS
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS face_checkin_logs (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                driver_id TEXT,
                unknown_face_path TEXT,
                is_synced INTEGER DEFAULT 0
            )
        ''')
        
        conn.commit()
        conn.close()
        
        print(f"BÙM! Khởi tạo thành công tại:\n {db_path}")
        
    except Exception as e:
        print(f"Lỗi trong quá trình khởi tạo DB: {e}")

if __name__ == "__main__":
    init_db()