import cv2
import numpy as np
import mediapipe as mp
import time
import os
import sqlite3
import uuid
import requests
import threading
from datetime import datetime
from tensorflow.keras.models import load_model

# --- XỬ LÝ ĐƯỜNG DẪN TỰ ĐỘNG (BẢN FIX CHUẨN) ---
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(CURRENT_DIR, 'database', 'local_database.sqlite')
ALERTS_FOLDER = os.path.join(CURRENT_DIR, 'captured_alerts')

# Đảm bảo thư mục lưu ảnh vi phạm tồn tại
os.makedirs(ALERTS_FOLDER, exist_ok=True)

# API ENDPOINT CỦA BACKEND
BACKEND_URL = "http://localhost:3000/api/alerts"

def send_alert_to_backend(violation_type, score):
    payload = {
        "driver_id": 1, 
        "status": "Drowsy" if violation_type == "ngu_guc" else "Warning",
        "timestamp": datetime.now().isoformat()
    }
    try:
        response = requests.post(BACKEND_URL, json=payload, timeout=2) 
        print("#################")
        print(f"Đã báo cho Backend! Code: {response.status_code}")
    except Exception as e:
        print("============")
        print(f"Lỗi gửi API qua Backend (có thể server Node chưa mở): {e}")

def log_violation_to_db(violation_type, confidence_score, frame):
    """Lưu khung hình lỗi và chèn log vô SQLite với UUID"""
    timestamp_file = datetime.now().strftime("%Y%m%d_%H%M%S")
    db_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Tên file ảnh
    img_filename = f"{violation_type}_score{int(confidence_score*100)}_{timestamp_file}.jpg"
    image_full_path = os.path.join(ALERTS_FOLDER, img_filename)
    
    # Lưu đường dẫn tương đối vô DB để dễ quản lý sau này
    db_image_path = f"captured_alerts/{img_filename}"
    
    alert_id = str(uuid.uuid4()) # Sinh UUID chuẩn
    
    cv2.imwrite(image_full_path, frame) # Lưu ảnh xuống ổ cứng
    
    try:
        conn = sqlite3.connect(DB_PATH) # Trỏ đúng đường dẫn tuyệt đối
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO offline_alerts (id, timestamp, violation_type, confidence_score, image_path, is_synced, sync_retry_count)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (alert_id, db_time, violation_type, confidence_score, db_image_path, 0, 0))
        conn.commit()
        conn.close()
        print(f"Đã chụp '{violation_type}' (ID: {alert_id[:8]}... | Tự tin: {confidence_score:.2f})")
    except Exception as e:
        print(f"Lỗi ghi DB: {e}")

print(" Đang nạp não bộ AI 100% công lực... Đợi xíu nha!")
# Load model từ thư mục 'model' nằm trong 'ai_module'
model_path = os.path.join(CURRENT_DIR, 'models', 'smartdrive_eye_model.h5')
model = load_model(model_path, compile=False)
print("Nạp não thành công! Lên hình!!!")

mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(max_num_faces=1, refine_landmarks=True)

LEFT_EYE = [362, 385, 387, 263, 373, 380]
RIGHT_EYE = [33, 160, 158, 133, 153, 144]

def crop_and_preprocess_eye(frame, landmarks, eye_indices, img_w, img_h):
    x_coords = [int(landmarks[i].x * img_w) for i in eye_indices]
    y_coords = [int(landmarks[i].y * img_h) for i in eye_indices]
    
    x_min, x_max = max(0, min(x_coords) - 10), min(img_w, max(x_coords) + 10)
    y_min, y_max = max(0, min(y_coords) - 10), min(img_h, max(y_coords) + 10)
    
    if x_max <= x_min or y_max <= y_min:
        return None
        
    eye_img = frame[y_min:y_max, x_min:x_max]
    eye_img = cv2.resize(eye_img, (64, 64))
    eye_img = cv2.cvtColor(eye_img, cv2.COLOR_BGR2GRAY)
    eye_img = eye_img / 255.0
    eye_img = np.expand_dims(eye_img, axis=-1)
    eye_img = np.expand_dims(eye_img, axis=0)
    
    return eye_img, (x_min, y_min, x_max, y_max)

def run_smartdrive_webcam():
    cap = cv2.VideoCapture(0)
    
    # Nâng số khung hình lên để chớp mắt bình thường không bị hiểu lầm là ngủ gục
    ALARM_FRAMES = 25 # Cần nhắm mắt liên tục ~1 giây mới báo
    closed_counter = 0
    last_alert_time = 0
    COOLDOWN_SECONDS = 5 

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret: break
            
        frame = cv2.flip(frame, 1)
        img_h, img_w, _ = frame.shape
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        results = face_mesh.process(rgb_frame)

        if results.multi_face_landmarks:
            for face_landmarks in results.multi_face_landmarks:
                landmarks = face_landmarks.landmark
                
                left_data = crop_and_preprocess_eye(frame, landmarks, LEFT_EYE, img_w, img_h)
                right_data = crop_and_preprocess_eye(frame, landmarks, RIGHT_EYE, img_w, img_h)
                
                if left_data and right_data:
                    left_eye_img, left_box = left_data
                    right_eye_img, right_box = right_data
                    
                    pred_left = model.predict(left_eye_img, verbose=0)[0][0]
                    pred_right = model.predict(right_eye_img, verbose=0)[0][0]
                    
                    # Trả lại logic gốc: 1.0 là MỞ, 0.0 là NHẮM
                    avg_pred = (pred_left + pred_right) / 2.0
                    
                    # Điểm tự tin ngủ gục = 1.0 - điểm mở
                    confidence_score = 1.0 - float(avg_pred)
                    
                    # Gần 0 thì là nhắm
                    if avg_pred < 0.5:
                        state = "NHAM MAT"
                        color = (0, 0, 255) 
                        closed_counter += 1
                    else:
                        state = "MO MAT"
                        color = (0, 255, 0) 
                        # Trừ lùi thật nhanh để chớp mắt không bị cộng dồn tích lũy
                        closed_counter -= 2 
                        if closed_counter < 0: closed_counter = 0
                        
                    cv2.rectangle(frame, (left_box[0], left_box[1]), (left_box[2], left_box[3]), color, 2)
                    cv2.rectangle(frame, (right_box[0], right_box[1]), (right_box[2], right_box[3]), color, 2)
                    
                    cv2.putText(frame, f"Trang thai: {state} (AI Score: {avg_pred:.2f})", (20, 40), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
                    
                    if closed_counter >= ALARM_FRAMES:
                        cv2.putText(frame, "CANH BAO: TAI XE NGU GUC!!!", (50, 100), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)
                        
                        current_time = time.time()
                        if current_time - last_alert_time > COOLDOWN_SECONDS:
                            # 1. Lưu DB + Lưu ảnh vô ổ cứng
                            log_violation_to_db("ngu_guc", confidence_score, frame)
                            
                            # 2. Xài luồng phụ (Thread) để bắn API qua Backend (Bắc buộc dùng Thread để Camera ko bị giật tung xóa chờ mạng)
                            threading.Thread(target=send_alert_to_backend, args=("ngu_guc", confidence_score)).start()
                            
                            last_alert_time = current_time

        cv2.imshow('SmartDrive - CNN Realtime Test', frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    run_smartdrive_webcam()