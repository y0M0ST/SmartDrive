import cv2
import mediapipe as mp
import time

# Khởi tạo thư viện xịn xò của Google
mp_face_detection = mp.solutions.face_detection
mp_drawing = mp.solutions.drawing_utils

def run_camera():
    # Bật Webcam (số 0 là cam mặc định của laptop)
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("Lỗi! Không mở được Webcam, check lại quyền!")
        return

    print("Webcam đã lên nòng! Nhấn phím 's' để chụp ảnh, nhấn phím 'q' để thoát.")

    # Set up Face Detection (độ tự tin 0.5 tức là chắc chắn 50% là cái mặt thì mới vẽ khung)
    with mp_face_detection.FaceDetection(model_selection=0, min_detection_confidence=0.5) as face_detection:
        p_time = 0
        while True:
            success, image = cap.read()
            if not success:
                print("❌ Không đọc được khung hình!")
                break

            # Đảo ngược ảnh cho nó giống gương (bà nhìn vô màn hình sẽ k bị ngược tay)
            image = cv2.flip(image, 1)
            
            # MediaPipe xài hệ màu RGB, OpenCV xài BGR nên phải convert qua lại xíu
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Bắt đầu cho AI nhận diện mặt
            results = face_detection.process(image_rgb)

            # Nếu tìm thấy mặt -> Vẽ cái khung vuông vô mặt
            if results.detections:
                for detection in results.detections:
                    mp_drawing.draw_detection(image, detection)

            # Tính toán FPS
            c_time = time.time()
            fps = 1 / (c_time - p_time) if p_time != 0 else 0
            p_time = c_time
                    
            # Ghi dòng chữ xanh lá cây lên góc màn hình cho nó ra dáng phim sci-fi =)))
            cv2.putText(image, "AI Edge Module - Status: Active", (20, 40), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            cv2.putText(image, "Face Detected", (20, 70), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            cv2.putText(image, f"FPS: {int(fps)}", (20, 100), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)  # In FPS màu vàng

            # Show cái màn hình camera lên
            cv2.imshow('SmartDrive - AI Camera Test', image)

            # Bắt sự kiện bàn phím (đợi 1 millisecond)
            key = cv2.waitKey(1) & 0xFF
            
            # Nhấn 's' để chụp hình (save)
            if key == ord('s'):
                timestamp = time.strftime("%Y%m%d-%H%M%S")
                filename = f"ai_flex_{timestamp}.jpg"
                cv2.imwrite(filename, image)
                print(f"Đã lưu ảnh '{filename}' thành công.")
            
            # Nhấn 'q' để thoát (quit)
            elif key == ord('q'):
                print("Đã tắt cam")
                break

    # Dọn dẹp chiến trường, trả lại Webcam cho máy tính
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    run_camera()