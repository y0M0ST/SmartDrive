# 🚍 SmartDrive - Hệ thống Giám sát & Quản lý Điều hành Xe khách

**Dự án Khóa luận Tốt nghiệp - Đại học Duy Tân (Tháng 6/2026)**  

SmartDrive là hệ thống quản lý và giám sát xe khách theo thời gian thực, kết hợp **Trí tuệ nhân tạo (AI)** để phát hiện và cảnh báo tài xế buồn ngủ nhằm nâng cao an toàn giao thông.

Hệ thống gồm:
- **Web Admin**: Quản lý và theo dõi xe theo thời gian thực.
- **AI Module**: Phát hiện trạng thái buồn ngủ của tài xế thông qua camera.

---

# 🧠 Tech Stack

## Frontend
- React.js  
- TypeScript  
- Vite  
- TailwindCSS  

## Backend
- Node.js  
- Express.js  
- TypeScript  
- Socket.io  

## Database
- PostgreSQL  

## AI Module
- Python  
- YOLOv8  
- Dlib  
- OpenCV  

---

# ⚙️ Hướng dẫn Setup Môi trường (Cho Team)

Anh em làm **đúng thứ tự các bước sau** để môi trường chạy mượt mà và tránh lỗi.

---

# 📦 Bước 1: Clone Code & Cài đặt thư viện

Dự án sử dụng **npm workspaces**, nên chỉ cần cài một lần ở **thư mục gốc (Root)**.

```bash
# Clone dự án về máy
git clone <link-repo-github-cua-nhom>

cd SmartDrive

# Cài đặt toàn bộ thư viện (KHÔNG cd vào frontend hay backend)
npm install



#🔐 Bước 2: Setup Biến môi trường (.env)

⚠️ Tuyệt đối KHÔNG push file .env lên GitHub

# Backend

cd backend

# Copy file mẫu
.env.example -> .env

# Sau đó điền thông tin cần thiết
PORT=
DATABASE_URL=
# Frontend

cd frontend

# Copy file mẫu
.env.example -> .env

# Sau đó điền API URL
VITE_API_URL=
#🗄️ Bước 3: Khởi chạy Database (PostgreSQL)

Yêu cầu máy phải có Docker.

# Đứng ở thư mục gốc project

docker-compose up -d

Lệnh này sẽ dựng container PostgreSQL cho dự án.

#🚀 Bước 4: Khởi chạy Server Web (Frontend + Backend)

Không cần mở 2 terminal.

# Đứng ở thư mục gốc

npm run dev

Sau khi chạy thành công:

Frontend: http://localhost:5173
Backend:  http://localhost:5000
🤖 Hướng dẫn chạy AI Module

AI module chạy độc lập trong thư mục ai_module.

cd ai_module

Tạo môi trường ảo:

python -m venv venv

Activate môi trường ảo:

# Mac / Linux
source venv/bin/activate
# Windows
.\venv\Scripts\activate

Cài thư viện:

pip install -r requirements.txt

Chạy AI client:

python client.py
⚠️ QUY TẮC LÀM VIỆC (GIT WORKFLOW)

🚨 Nhánh master đã được khóa bảo vệ

TUYỆT ĐỐI KHÔNG PUSH THẲNG LÊN MASTER
1️⃣ Nhận task trên Trello
2️⃣ Tạo branch mới từ master
git checkout master
git pull origin master
git checkout -b feature/ten-tinh-nang

Ví dụ:

feature/login-page
feature/realtime-map
feature/driver-alert
3️⃣ Code & Commit
git add .
git commit -m "feat: add login page"
4️⃣ Push branch lên GitHub
git push origin feature/ten-tinh-nang
5️⃣ Tạo Pull Request (PR)

Lên GitHub

Tạo Pull Request

PM sẽ Review Code

Nếu có comment thì sửa lại và push tiếp.

6️⃣ Merge

Sau khi được approve, PM sẽ merge vào master.

👨‍💻 Team Notes
- Không push .env
- Không push code lỗi
- Không merge khi chưa review
- Viết commit rõ ràng

Ví dụ commit:

feat: add login api
fix: handle socket reconnect
refactor: clean auth middleware
