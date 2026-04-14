# BuyNow - Hệ Thống Bán Hàng Doanh Nghiệp

## Danh Mục
Web bán hàng, Full Stack

## Giới Thiệu
BuyNow là hệ thống bán hàng doanh nghiệp với frontend React (Ant Design) và backend Node.js sử dụng Prisma ORM. Hỗ trợ quản lý sản phẩm, đơn hàng và xuất báo cáo Excel.

## Chức Năng
- Quản lý sản phẩm
- Quản lý đơn hàng
- Quản lý người dùng
- Xuất báo cáo Excel
- Upload ảnh sản phẩm
- Đăng nhập / Đăng ký / Xác thực JWT

## Công Nghệ Sử Dụng
- **Frontend:** React 18, Vite, Ant Design, Zustand
- **Backend:** Node.js, Express.js, Prisma ORM
- **Database:** PostgreSQL / MySQL
- **Authentication:** JWT, Bcrypt
- **Validation:** Zod
- **Khác:** ExcelJS, Multer, Day.js

## Yêu Cầu Hệ Thống
- Node.js >= 18.x
- PostgreSQL hoặc MySQL
- npm

## Cài Đặt

### Backend
```bash
cd backend
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
```

### Frontend
```bash
cd frontend
npm install
```

## Chạy Ứng Dụng

### Backend
```bash
cd backend
npm run dev
```

### Frontend
```bash
cd frontend
npm run dev
```
