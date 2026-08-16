# SmartDrive — Giám sát & điều hành xe khách

**Đồ án tốt nghiệp — Đại học Duy Tân (6/2026)**

Hệ thống quản lý xe khách theo thời gian thực; tích hợp **AI** phát hiện dấu hiệu buồn ngủ của tài xế qua camera.

## Thành phần

| Phần | Mô tả |
|------|--------|
| Web Admin | Theo dõi, quản lý xe realtime |
| AI Module | Nhận diện trạng thái buồn ngủ (camera) |

## Công nghệ

| Lớp | Stack |
|-----|--------|
| Frontend | React, TypeScript, Vite, Tailwind |
| Backend | Node.js, Express, TypeScript, Socket.io |
| Database | PostgreSQL |
| AI | Python, YOLOv8, Dlib, OpenCV |

## Chạy Web (Frontend + Backend)

**Yêu cầu:** Node.js, PostgreSQL đang chạy, `DATABASE_URL` khớp DB thực tế.

1. **Cài dependency** (chỉ ở thư mục gốc — npm workspaces):

   ```bash
   git clone <url-repo>
   cd <thư-mục-dự-án>
   npm install
   ```

2. **Biến môi trường** — không commit file `.env`.

   - Backend: `cp backend/.env.example backend/.env` rồi điền `PORT`, `DATABASE_URL`, JWT, v.v.
   - Frontend: `cp frontend/.env.example frontend/.env` — thường cần `VITE_API_URL` (mặc định mẫu trỏ `http://localhost:3000/api`).

3. **Chạy dev** (một lệnh từ thư mục gốc):

   ```bash
   npm run dev
   ```

   - Frontend: [http://localhost:5173](http://localhost:5173)
   - API: [http://localhost:3000](http://localhost:3000) (hoặc `PORT` trong `backend/.env`)

## AI Module

Thư mục `ai_module`, chạy riêng. Copy `ai_module/.env.example` → `.env` nếu cần.
# 🚍 SmartDrive - Hệ thống Giám sát & Quản lý Điều hành Xe khách

> **Dự án Khóa luận Tốt nghiệp - Đại học Duy Tân (Tháng 6/2026)**

SmartDrive là hệ thống quản lý và giám sát xe khách theo thời gian thực, kết hợp **Trí tuệ nhân tạo (AI)** để phát hiện và cảnh báo tài xế buồn ngủ nhằm nâng cao an toàn giao thông.

## 🌟 Thành phần hệ thống

- **Web Admin**: Quản lý và theo dõi xe theo thời gian thực.
- **AI Module**: Phát hiện trạng thái buồn ngủ của tài xế thông qua camera.

---

## 🧠 Tech Stack

| Thành phần    | Công nghệ sử dụng                          |
| :------------ | :----------------------------------------- |
| **Frontend**  | React.js, TypeScript, Vite, TailwindCSS    |
| **Backend**   | Node.js, Express.js, TypeScript, Socket.io |
| **Database**  | PostgreSQL                                 |
| **AI Module** | Python, YOLOv8, Dlib, OpenCV               |

---

## ⚙️ Hướng dẫn Setup Môi trường (Cho Team)

> **Lưu ý:** Anh em làm **đúng thứ tự các bước sau** để môi trường chạy mượt mà và tránh lỗi.

### 📦 Bước 1: Clone Code & Cài đặt thư viện

Dự án sử dụng **npm workspaces**, nên chỉ cần cài một lần ở **thư mục gốc (Root)**.

```bash
# Clone dự án về máy
git clone <link-repo-github-cua-nhom>
cd SmartDrive

# Cài đặt toàn bộ thư viện (KHÔNG cd vào frontend hay backend)
npm install
```

### 🔐 Bước 2: Setup Biến môi trường (`.env`)

> ⚠️ **TUYỆT ĐỐI KHÔNG push file `.env` lên GitHub**

**Backend:**

```bash
cd backend
cp .env.example .env
# Hoặc copy thủ công file .env.example sang .env
# Sau đó mở file .env và điền thông tin: PORT=, DATABASE_URL=
```

**Frontend:**

```bash
cd frontend
cp .env.example .env
# Hoặc copy thủ công file .env.example sang .env
# Sau đó mở file .env và điền thông tin: VITE_API_URL=
```

### 🗄️ Bước 3: Khởi chạy Database (PostgreSQL)

Yêu cầu máy phải cài đặt **Docker**. Đứng ở thư mục gốc project và chạy:

```bash
docker-compose up -d
```

_(Lệnh này sẽ dựng container PostgreSQL cho dự án)_

### 🚀 Bước 4: Khởi chạy Server Web (Frontend + Backend)

Không cần mở 2 terminal. Đứng ở thư mục gốc và chạy:

```bash
npm run dev
```

Sau khi chạy thành công:

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend**: [http://localhost:5000](http://localhost:5000)

---

## 🤖 Hướng dẫn chạy AI Module

AI module chạy độc lập trong thư mục `ai_module`.

```bash
cd ai_module

# 1. Tạo môi trường ảo
python -m venv venv
# Windows: .\venv\Scripts\activate
# macOS/Linux: source venv/bin/activate

# 2. Activate môi trường ảo
# Trên Mac / Linux:
source venv/bin/activate
# Trên Windows:
.\venv\Scripts\activate

# 3. Cài đặt thư viện
pip install -r requirements.txt

# 4. Chạy AI client
python client.py
```

## Git (nhóm)

- Nhánh `master` được bảo vệ — **không push trực tiếp lên `master`**.
- Luồng gợi ý: `master` cập nhật → tạo `feature/ten-tinh-nang` → commit → `git push` → mở PR → review → merge.

```bash
git checkout master && git pull origin master
git checkout -b feature/ten-tinh-nang
# ... code ...
git add . && git commit -m "feat: mo ta ngan"
git push -u origin feature/ten-tinh-nang
```

**Commit:** `feat:` / `fix:` / `refactor:` + mô tả ngắn (Conventional Commits).

## Lưu ý nhanh

- Không đẩy `.env` hoặc secret lên Git.
- Không merge PR khi chưa có review.
- Giữ commit nhỏ, message rõ ràng.
---

## ⚠️ Quy tắc làm việc (Git Workflow)

> 🚨 **Nhánh `master` đã được khóa bảo vệ. TUYỆT ĐỐI KHÔNG PUSH THẲNG LÊN `master`!**

1️⃣ **Nhận task** trên Trello  
2️⃣ **Tạo branch mới** từ `master`:

```bash
git checkout master
git pull origin master
git checkout -b feature/ten-tinh-nang

# Ví dụ tên branch:
# feature/login-page
# feature/realtime-map
# feature/driver-alert
```

3️⃣ **Code & Commit**:

```bash
git add .
git commit -m "feat: add login page"
```

4️⃣ **Push branch** lên GitHub:

```bash
git push origin feature/ten-tinh-nang
```

5️⃣ **Tạo Pull Request (PR)**:

- Lên GitHub tạo Pull Request.
- PM sẽ Review Code.
- Nếu có comment thì sửa lại và push tiếp.

6️⃣ **Merge**:

- Sau khi được approve, PM sẽ merge vào `master`.

---

## 👨‍💻 Team Notes

- ❌ **Không** push file `.env`
- ❌ **Không** push code lỗi
- ❌ **Không** merge khi chưa có người review
- ✅ Viết commit rõ ràng theo chuẩn:

**Ví dụ commit:**

- `feat: add login api` (Thêm tính năng mới)
- `fix: handle socket reconnect` (Sửa lỗi)
- `refactor: clean auth middleware` (Tối ưu lại code)
