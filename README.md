SmartDrive - Hệ thống Giám sát & Quản lý Điều hành Xe khách
Dự án Khóa luận Tốt nghiệp - Đại học Duy Tân (Tháng 6/2026).
Hệ thống kết hợp Trí tuệ nhân tạo cảnh báo buồn ngủ và Web Admin quản lý theo thời gian thực.

Tech Stack
Frontend: React.js, TypeScript, Vite, TailwindCSS.

Backend: Node.js, Express, TypeScript, Socket.io.

Database: PostgreSQL.

AI Module: Python, YOLOv8, Dlib, OpenCV.

Hướng dẫn Setup Môi trường (Cho Team)
Anh em làm đúng thứ tự các bước sau để môi trường chạy mượt mà, không dẫm đạp lên nhau nha!

Bước 1: Clone code & Cài đặt thư viện
Dự án sử dụng npm workspaces, chỉ cần đứng ở thư mục gốc (Root) cài 1 lần là xong hết cho cả FE và BE.

Bash
# Clone dự án về máy
git clone <link-repo-github-cua-nhom>
cd SmartDrive

# Cài đặt toàn bộ thư viện (Không CD vào frontend hay backend nha!)
npm install
Bước 2: Setup Biến môi trường (.env)
Tuyệt đối KHÔNG push file .env lên GitHub. Anh em tự tạo file .env ở máy local dựa trên file mẫu:

Vào thư mục backend, copy file .env.example và đổi tên thành .env. Điền thông tin port, db,...

Vào thư mục frontend, copy file .env.example và đổi tên thành .env. Điền VITE_API_URL.

Bước 3: Khởi chạy Database (PostgreSQL)
Yêu cầu máy phải có Docker. Đứng ở thư mục gốc, chạy lệnh sau để dựng Database lên:

Bash
docker-compose up -d
Bước 4: Khởi chạy Server Web (Chạy song song FE & BE)
Khỏi cần mở 2 Terminal, chỉ cần đứng ở thư mục gốc gõ:

Bash
npm run dev
Frontend sẽ chạy tại: http://localhost:5173
Backend sẽ chạy tại: http://localhost:5000

Hướng dẫn chạy AI Module
AI làm việc độc lập trong thư mục ai_module bằng Python.

Bash
cd ai_module
python -m venv venv
# Active môi trường ảo (tùy OS)
source venv/bin/activate  # Mac/Linux
.\venv\Scripts\activate   # Windows

pip install -r requirements.txt
python client.py
⚠️ QUY TẮC LÀM VIỆC (GIT WORKFLOW) - ĐỌC KỸ!!!
Nhánh master đã được khóa bảo vệ. TUYỆT ĐỐI KHÔNG PUSH THẲNG LÊN MASTER.
Nhận task trên Trello.
Từ nhánh master, tạo nhánh mới để code: git checkout -b feature/ten-tinh-nang (VD: feature/login-page).
Code xong, commit và push lên nhánh của mình.
Lên GitHub tạo Pull Request (PR).
PM review code và bấm Merge. Bị comment thì lo sửa rồi push lại!