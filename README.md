# FireflyCloud เอกสารการติดตั้ง

FireflyCloud เป็นระบบจัดเก็บและแชร์ไฟล์บนคลาวด์แบบแยกส่วนหน้าหลัง (Frontend/Backend)  
- **Backend**: Bun + Elysia + SQLite (Drizzle ORM)  
- **Frontend**: Next.js (App Router)  
- **คุณสมบัติหลัก**: รองรับการจัดเก็บไฟล์แบบ Local/R2/OneDrive/WebDAV, แชร์ไฟล์ด้วยลิงก์ตรงและ Token, การจัดการโควต้าและสถิติการใช้งาน, การส่งอีเมลผ่าน SMTP, แผงควบคุมผู้ดูแล, WebSocket สำหรับเรียลไทม์ล็อกและแจ้งเตือน

---

## 1. การติดตั้งและสภาพแวดล้อม

### เครื่องมือที่ต้องติดตั้ง
- [Bun](https://bun.sh/)  
- [Node.js](https://nodejs.org/)

### โครงสร้างโฟลเดอร์ (ตัวอย่าง)
- `backend/` : บริการฝั่ง Backend (Bun + Elysia)
  - `src/` : โค้ดหลัก (Routing, Services, Database, Utilities)
  - `netdisk.db` : ฐานข้อมูล SQLite (สามารถปรับได้จาก Environment Variable)
  - `uploads/` : โฟลเดอร์เก็บไฟล์อัปโหลด (สำหรับ Local Storage)
  - `package.json` : สคริปต์รัน Backend
- `app/` : หน้า Next.js App Router
- `components/` : Component ของ Frontend (Auth, Layout, File Management, Admin Panel)
- `lib/` : ไลบรารี Frontend (เช่น การดาวน์โหลดทั่วไป, ไอคอนไฟล์)

---

## 2. เริ่มต้นอย่างรวดเร็ว (Local Development)

### 2.1 Clone Repository และติดตั้ง Dependencies
```bash
# Clone repository
git clone https://github.com/ChuxinNeko/FireflyCloud.git
cd FireflyCloud

# ติดตั้ง Frontend dependencies
npm install

# ติดตั้ง Backend dependencies
cd backend
bun install
```

### 2.2 ตั้งค่า Environment Variables สำหรับ Backend
สร้างไฟล์ `.env` ในโฟลเดอร์ `backend`:
```bash
# จำเป็น
JWT_SECRET=replace_with_a_strong_random_string
DATABASE_URL=./netdisk.db

# ตัวเลือก
PORT=8080
LOG_LEVEL=INFO   # DEBUG, INFO, WARN, ERROR, FATAL
```
- SMTP, R2, OneDrive, WebDAV สามารถตั้งค่าผ่าน Admin Panel ได้  
- `DATABASE_URL` สามารถระบุเป็น path แบบสัมพัทธ์หรือสมบูรณ์

### 2.3 รัน Backend (โหมดพัฒนา)
```bash
cd backend
bun run dev
# เริ่มต้นที่ http://localhost:8080
```

### 2.4 รัน Frontend (โหมดพัฒนา)
สร้างไฟล์ `.env` ใน root project:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
```
แล้วรัน:
```bash
cd ..
npm run dev
# เริ่มต้นที่ http://localhost:3000
```

### 2.5 สร้างหรือรีเซ็ต Admin Account (ถ้าต้องการ)
```bash
cd backend
bun run reset-admin.js           # สร้าง/รีเซ็ต Admin
bun run reset-admin-password.js  # รีเซ็ตรหัสผ่าน Admin
```

---

## 3. การ Deploy Production

### ตัวอย่าง A: Backend + Frontend รันแยก + Reverse Proxy

1) **Backend**
```bash
cd backend
bun run build   # Build ผลลัพธ์ไปที่ backend/dist
bun run start   # รันใน Production mode
# แนะนำใช้ systemd/pm2/nssm เพื่อจัดการ process
```

2) **Frontend`
```bash
# ที่ root project
npm run build
npm run start   # Production mode
```

3) **Reverse Proxy (Nginx ตัวอย่าง)**  
แนะนำให้ใช้ subdomain แยกสำหรับ Frontend และ Backend  
- Frontend: `https://cloud.example.com`  
- Backend: `https://api.example.com`  

ตัวอย่าง `.env.production` สำหรับ Frontend:
```bash
NEXT_PUBLIC_API_URL=https://api.example.com
```

ตัวอย่าง config Nginx:
```nginx
server {
  listen 80;
  listen 443 ssl http2;
  server_name api.example.com;

  ssl_certificate     /etc/letsencrypt/live/api.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

  location / {
    proxy_pass         http://127.0.0.1:8080;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
  }
}

server {
  listen 80;
  listen 443 ssl http2;
  server_name cloud.example.com;

  ssl_certificate     /etc/letsencrypt/live/cloud.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/cloud.example.com/privkey.pem;

  location / {
    proxy_pass         http://127.0.0.1:3000;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
  }
}
```

Frontend `.env.production`:
```bash
NEXT_PUBLIC_API_URL=https://cloud.example.com/api
```

---

## 4. Environment Variables

### Backend (`backend/.env`)
- **จำเป็น**:  
  - `JWT_SECRET` : Secret สำหรับ JWT (ควรใช้ string แบบสุ่มแรง)  
  - `DATABASE_URL` : Path ของไฟล์ SQLite
- **ตัวเลือก**:  
  - `PORT` : พอร์ต backend (default 8080)  
  - `LOG_LEVEL` : ระดับ logging (`DEBUG`/`INFO`/`WARN`/`ERROR`/`FATAL`)

### Frontend (`.env.local` / `.env.production`)
- `NEXT_PUBLIC_API_URL` : URL ของ Backend API เช่น `http://localhost:8080` หรือ `https://api.example.com`

---

## 5. การตั้งค่าและจัดการระบบ

- **Admin Panel**: เข้าผ่าน “ระบบจัดการ/แผงผู้ดูแล”  
- **Site Info**: `/site-config` จะใช้โหลดชื่อและคำอธิบายของไซต์  
- **SMTP**: ตั้งค่าผ่าน Admin Panel, ทดสอบได้ที่ `/admin/test-smtp`  
- **Storage**: รองรับ Local, R2, OneDrive, WebDAV และสามารถตั้งค่าเป็น Policy  
- **Direct Link & Share**:  
  - Direct Link: `/dl/:filename?token=xxxxx`  
  - Share & Pickup: `/share` และ `/pickup`  
- **Quota & Stats**: จัดการโควต้าและสถิติการใช้งานรวม (รวมถึง R2/OneDrive)

---

## 6. การสำรองข้อมูล

- **SQLite**: แนะนำสำรอง `backend/netdisk.db` เป็นประจำ  
- **Local Uploads**: ตรวจสอบ `backend/uploads/` ให้มีการสำรอง  
- **R2/OneDrive/WebDAV**: แม้ระบบมี persistence แต่ควรสำรองไฟล์สำคัญ

---

## 7. ปัญหาที่พบบ่อย (FAQ)

- **401/403**:  
  - ตรวจสอบ `NEXT_PUBLIC_API_URL` ใน frontend  
  - ตรวจสอบ token ของผู้ใช้  
  - Admin ต้องมี `role=admin`

- **CORS**:  
  - Backend เปิด `cors()` เรียบร้อยแล้ว, production อาจต้อง config reverse proxy

- **Database path**:  
  - ตรวจสอบ `DATABASE_URL` ใน `.env` และ permission ของ process

- **ดาวน์โหลดไม่ได้ / CORS**:  
  - ใช้ direct link หรือ same-origin proxy แนะนำใน production

- **Port ถูกใช้งาน**:  
  - เปลี่ยน port ของ backend หรือ frontend หรือปรับ reverse proxy

---

## 8. คำแนะนำการดูแลระบบ

- ใช้ systemd/pm2/nssm สำหรับ backend และ frontend  
- แยก subdomain สำหรับ frontend/backend  
- ใช้ HTTPS และ redirect ไป HTTPS  
- สำรองฐานข้อมูลและ local uploads เป็นประจำ  
- ตั้งค่า log rotation และ monitoring/alert

---

## 9. คำสั่งพัฒนา

### Backend (ใน `backend/`)
```bash
bun run dev        # โหมดพัฒนา
bun run build      # Build ไป dist/
bun run start      # Production รัน dist/index.js
bun run reset-admin.js           # สร้าง/รีเซ็ต Admin
bun run reset-admin-password.js  # รีเซ็ตรหัสผ่าน Admin
```

### Frontend (root project)
```bash
npm run dev    # โหมดพัฒนา
npm run build  # Build Production
npm run start  # Production รัน
```
