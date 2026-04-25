# realtime_test.py
# --- Load .env trước mọi import đọc biến môi trường (api_client đọc env khi được import) ---
import os
from pathlib import Path

from dotenv import load_dotenv

_ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(_ENV_PATH)

import cv2
import numpy as np
import mediapipe as mp
import time
import sqlite3
import uuid
import threading
from datetime import datetime
from tensorflow.keras.models import load_model

from api_client import send_violation

# --- XỬ LÝ ĐƯỜNG DẪN TỰ ĐỘNG (BẢN FIX CHUẨN) ---
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(CURRENT_DIR, "database", "local_database.sqlite")
ALERTS_FOLDER = os.path.join(CURRENT_DIR, "captured_alerts")

# Đảm bảo thư mục lưu ảnh vi phạm tồn tại
os.makedirs(ALERTS_FOLDER, exist_ok=True)

# ANSI: cảnh báo lỗi cấu hình trip (terminal hỗ trợ màu)
_ERR_RED = "\033[91m"
_RESET = "\033[0m"


def _env_float(name: str, default: float) -> float:
    raw = (os.getenv(name) or "").strip()
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _eye_model_high_means_open() -> bool:
    """
    Mac dinh: sigmoid cao = mat MO (nhu comment cu trong vong lap).
    Neu khi train dat nhan nguoc (1 = nham / model cao khi nham) thi mat mo se ra diem thap
    -> code tuong la NHAM MAT -> dem nham -> bao ngu guc. Khi do dat EYE_MODEL_HIGH_MEANS_OPEN=0.
    """
    raw = (os.getenv("EYE_MODEL_HIGH_MEANS_OPEN") or "").strip().lower()
    if raw in ("0", "false", "no", "off", "closed", "invert"):
        return False
    return True


def _send_async(frame, trip_id, vtype, lat, lng):
    """
    Gửi vi phạm lên backend US_20 trên luồng phụ — copy frame trong worker để tránh race với vòng lặp camera.
    """

    def _worker():
        try:
            img = frame.copy()
            send_violation(img, trip_id, vtype, lat, lng)
        except Exception as e:  # noqa: BLE001 — không làm sập luồng camera
            print(f"{_ERR_RED}[ERROR] Luồng gửi vi phạm: {e}{_RESET}")

    threading.Thread(target=_worker, daemon=True).start()


def log_violation_to_db(violation_type, confidence_score, frame):
    """Lưu khung hình lỗi và chèn log vô SQLite với UUID"""
    timestamp_file = datetime.now().strftime("%Y%m%d_%H%M%S")
    db_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Tên file ảnh
    img_filename = f"{violation_type}_score{int(confidence_score * 100)}_{timestamp_file}.jpg"
    image_full_path = os.path.join(ALERTS_FOLDER, img_filename)

    # Lưu đường dẫn tương đối vô DB để dễ quản lý sau này
    db_image_path = f"captured_alerts/{img_filename}"

    alert_id = str(uuid.uuid4())  # Sinh UUID chuẩn

    cv2.imwrite(image_full_path, frame)  # Lưu ảnh xuống ổ cứng

    try:
        conn = sqlite3.connect(DB_PATH)  # Trỏ đúng đường dẫn tuyệt đối
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO offline_alerts (id, timestamp, violation_type, confidence_score, image_path, is_synced, sync_retry_count)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (alert_id, db_time, violation_type, confidence_score, db_image_path, 0, 0),
        )
        conn.commit()
        conn.close()
        print(f"Đã chụp '{violation_type}' (ID: {alert_id[:8]}... | Tự tin: {confidence_score:.2f})")
    except Exception as e:
        print(f"Lỗi ghi DB: {e}")


print(" Đang nạp não bộ AI 100% công lực... Đợi xíu nha!")
# Load model từ thư mục 'model' nằm trong 'ai_module'
model_path = os.path.join(CURRENT_DIR, "models", "smartdrive_eye_model.h5")
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
    ALARM_FRAMES = 25  # Cần nhắm mắt liên tục ~1 giây mới báo
    closed_counter = 0
    last_alert_time = 0
    COOLDOWN_SECONDS = 5

    high_means_open = _eye_model_high_means_open()
    open_threshold = _env_float("EYE_OPEN_THRESHOLD", 0.5)
    open_threshold = min(max(open_threshold, 0.05), 0.95)
    print(
        f"[SmartDrive eye] high=open: {high_means_open} | P(mo) >= {open_threshold:.2f} => MO MAT "
        f"(chinh EYE_MODEL_HIGH_MEANS_OPEN / EYE_OPEN_THRESHOLD trong .env neu sai)"
    )

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

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

                    raw_left = float(model.predict(left_eye_img, verbose=0)[0][0])
                    raw_right = float(model.predict(right_eye_img, verbose=0)[0][0])
                    avg_raw = (raw_left + raw_right) / 2.0

                    # p_open = xac suat (hoac diem tuong duong) mat dang MO sau khi thong nhat voi cach train
                    p_open = float(avg_raw) if high_means_open else (1.0 - float(avg_raw))

                    # Diem "tu tin" khi log ngu guc: cang gan 1 = cang chac la dang nham/khong mo
                    confidence_score = 1.0 - p_open

                    eyes_closed_now = p_open < open_threshold

                    if eyes_closed_now:
                        state = "NHAM MAT"
                        color = (0, 0, 255)
                        closed_counter += 1
                    else:
                        state = "MO MAT"
                        color = (0, 255, 0)
                        # Mo mat: giam nhanh de bo dem xuong duoi nguong bao som (tranh treo chu CANH BAO)
                        closed_counter -= 10
                        if closed_counter < 0:
                            closed_counter = 0

                    # Chi hien / gui khi *dang* coi la nham: neu chi dem cao ma P(mo) da cao thi khong treo canh bao
                    drowsy_alarm_active = (closed_counter >= ALARM_FRAMES) and eyes_closed_now

                    cv2.rectangle(frame, (left_box[0], left_box[1]), (left_box[2], left_box[3]), color, 2)
                    cv2.rectangle(frame, (right_box[0], right_box[1]), (right_box[2], right_box[3]), color, 2)

                    cv2.putText(
                        frame,
                        f"Trang thai: {state} (P mo: {p_open:.2f} raw:{avg_raw:.2f})",
                        (20, 40),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.8,
                        color,
                        2,
                    )

                    if drowsy_alarm_active:
                        cv2.putText(
                            frame,
                            "CANH BAO: TAI XE NGU GUC!!!",
                            (50, 100),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            1.2,
                            (0, 0, 255),
                            3,
                        )

                        current_time = time.time()
                        if current_time - last_alert_time > COOLDOWN_SECONDS:
                            # 1. Lưu DB + Lưu ảnh vô ổ cứng (offline)
                            log_violation_to_db("ngu_guc", confidence_score, frame)

                            # 2. US_20 — ingest device API (luồng phụ, không chặn camera)
                            trip_id = (os.getenv("CURRENT_TRIP_ID") or "").strip()
                            if not trip_id:
                                print(
                                    f"{_ERR_RED}[ERROR] Chưa cấu hình trip_id, hủy gửi API!{_RESET}"
                                    " — Đặt biến môi trường CURRENT_TRIP_ID (UUID chuyến IN_PROGRESS)."
                                )
                            else:
                                _send_async(frame, trip_id, "DROWSY", None, None)

                            last_alert_time = current_time

        cv2.imshow("SmartDrive - CNN Realtime Test", frame)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    run_smartdrive_webcam()
