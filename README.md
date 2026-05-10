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

```bash
cd ai_module
python -m venv venv
# Windows: .\venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
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
