# BuyNow - Hệ thống Bán hàng Doanh nghiệp

## Mô tả dự án

BuyNow là hệ thống quản lý bán hàng dành cho doanh nghiệp, cho phép nhân viên bán hàng tạo đơn hàng cho khách hàng. Hệ thống hỗ trợ quản lý sản phẩm, tồn kho, công nợ và báo cáo doanh thu.

## Thông tin doanh nghiệp

- **Tên:** NPP HÙNG THƯ
- **Điện thoại:** 0865.888.128 - 09.1234.1256
- **Địa chỉ:** Số nhà 29 đường Lưu Cơ, phố Kim Đa, TP Ninh Bình, Ninh Bình

---

## Cấu trúc dữ liệu từ File Excel

### Sheet 1: HÓA ĐƠN (Template)
```
- Ngày
- Thông tin NPP (tên, điện thoại, địa chỉ)
- Khách hàng: [Tên] | ĐT: [Số điện thoại]
- Địa chỉ: [Địa chỉ KH]
- Bảng sản phẩm:
  | STT | Tên sản phẩm | ĐVT | SL | Đơn giá | Thành tiền |
```

### Sheet 2: KHÁCH HÀNG (1416 records)
| Cột | Tên trường | Mô tả |
|-----|------------|-------|
| A | Tên khách hàng * | Bắt buộc |
| B | Mã nhóm khách hàng | DLN (Đại lý nhỏ), DLV (Đại lý vừa), dailylon... |
| C | Mã khách hàng | VD: CUZN01380 |
| D | Địa chỉ | Địa chỉ chi tiết |
| E | Điện thoại | Số điện thoại |
| F | Quận huyện | VD: Huyện Nho Quan |
| G | Phường xã | VD: Thị trấn Nho Quan |

### Sheet 3: SẢN PHẨM (665 records)
| Cột | Tên trường | Mô tả |
|-----|------------|-------|
| A | Tên sản phẩm * | Bắt buộc |
| B | Mã SKU * | Mã sản phẩm duy nhất |
| C | Đơn vị | ĐVT: gói, chai, thùng, hộp, tuýp, lọ... |
| D | PL_Giá bán buôn | Giá bán buôn |
| E | PL_ĐLy vừa | Giá cho đại lý vừa |
| F | PL_Giá ĐL lớn | Giá cho đại lý lớn |
| G | PL_Giá bán lẻ | Giá bán lẻ |

---

## Công nghệ sử dụng

### Frontend
- **Framework:** React 18
- **UI Library:** Ant Design 5
- **State Management:** Zustand
- **HTTP Client:** Axios
- **Build Tool:** Vite

### Backend
- **Runtime:** Node.js 20 LTS
- **Framework:** Express.js
- **ORM:** Prisma
- **Validation:** Zod
- **Authentication:** JWT + bcrypt

### Database
- **Primary:** MySQL 8.0

### Thư viện bổ sung
- **Excel:** exceljs (đọc/ghi file Excel)
- **PDF:** pdfkit hoặc puppeteer (xuất hóa đơn PDF)
- **Date:** dayjs

---

## Phân tích chức năng

### 1. Quản lý người dùng & Phân quyền

| Vai trò | Quyền hạn |
|---------|-----------|
| **Admin** | Toàn quyền: quản lý user, cấu hình hệ thống, xem TẤT CẢ đơn hàng, báo cáo |
| **Quản lý** | Duyệt đơn hàng, xem TẤT CẢ đơn hàng, quản lý sản phẩm/khách hàng |
| **Nhân viên bán hàng** | Tạo đơn hàng, CHỈ thấy đơn hàng DO MÌNH tạo, xem báo cáo cá nhân |

**Quy tắc phân quyền quan trọng:**
```
- Khách hàng: TẤT CẢ nhân viên đều thấy TẤT CẢ khách hàng
- Đơn hàng:
  + Nhân viên CHỈ thấy đơn hàng do MÌNH tạo
  + Quản lý/Admin thấy TẤT CẢ đơn hàng
- Mỗi đơn hàng lưu: userId (nhân viên tạo đơn)
```

**Chức năng:**
- Đăng nhập / Đăng xuất
- Quản lý tài khoản nhân viên (CRUD)
- Phân quyền theo vai trò
- Đổi mật khẩu

### 2. Quản lý nhóm khách hàng

**Các nhóm khách hàng (theo Excel):**
- DLN - Đại lý nhỏ
- DLV - Đại lý vừa
- dailylon - Đại lý lớn

**Chức năng:**
- CRUD nhóm khách hàng
- Mỗi nhóm áp dụng mức giá khác nhau

### 3. Quản lý khách hàng (theo Excel)

**Cấu trúc khách hàng:**
```
- Mã khách hàng (code) - VD: CUZN01380
- Tên khách hàng (name) - Bắt buộc
- Mã nhóm khách hàng (customerGroupCode) - DLN, DLV, dailylon
- Địa chỉ (address)
- Điện thoại (phone)
- Quận huyện (district)
- Phường xã (ward)
```

**Chức năng:**
- CRUD khách hàng
- Import khách hàng từ Excel
- Tìm kiếm theo tên, SĐT, địa chỉ
- Lọc theo nhóm khách hàng
- Xem lịch sử mua hàng
- Theo dõi công nợ

### 4. Quản lý sản phẩm (theo Excel)

**Cấu trúc sản phẩm:**
```
- Mã SKU (sku) - Bắt buộc, duy nhất
- Tên sản phẩm (name) - Bắt buộc
- Đơn vị tính (unit) - gói, chai, thùng, hộp, tuýp, lọ...
- Giá bán buôn (wholesalePrice)
- Giá đại lý vừa (mediumDealerPrice)
- Giá đại lý lớn (largeDealerPrice)
- Giá bán lẻ (retailPrice)
- Số lượng tồn kho (stock)
- Trạng thái (active)
```

**Chức năng:**
- CRUD sản phẩm
- Import sản phẩm từ Excel
- 4 mức giá theo loại khách hàng
- Quản lý tồn kho
- Tìm kiếm, lọc sản phẩm

### 5. Quản lý đơn hàng / Hóa đơn (theo Excel template)

**Quy trình tạo đơn hàng:**
```
1. Chọn ngày tạo đơn
2. Chọn khách hàng (tự động điền ĐT, địa chỉ)
3. Hệ thống tự động áp giá theo nhóm khách hàng:
   - DLN → Giá bán buôn
   - DLV → Giá đại lý vừa
   - dailylon → Giá đại lý lớn
   - Khách lẻ → Giá bán lẻ
4. Thêm sản phẩm vào đơn hàng
   - STT (tự động)
   - Chọn sản phẩm → Tự động điền ĐVT, Đơn giá
   - Nhập số lượng
   - Tự động tính Thành tiền = SL × Đơn giá
5. Xác nhận đơn hàng
6. In hóa đơn theo template Excel
```

**Cấu trúc hóa đơn:**
```
Header:
- Ngày
- NPP HÙNG THƯ
- Điện thoại: 0865.888.128 - 09.1234.1256
- Địa chỉ: Số nhà 29 đường Lưu Cơ...

Thông tin khách:
- Khách hàng: [Tên]     ĐT: [SĐT]
- Địa chỉ: [Địa chỉ KH]

Bảng sản phẩm:
| STT | Tên sản phẩm | ĐVT | SL | Đơn giá | Thành tiền |
|-----|--------------|-----|----|---------| -----------|

Footer:
- Tổng tiền
- Đã thanh toán
- Còn nợ
- Nhân viên bán: [Tên NV tạo đơn]
```

**Lưu ý về nhân viên bán hàng:**
- Hệ thống TỰ ĐỘNG lưu nhân viên đang đăng nhập là người tạo đơn
- Nhân viên CHỈ thấy đơn hàng do MÌNH tạo trong danh sách
- Quản lý/Admin thấy TẤT CẢ đơn hàng và có thể lọc theo nhân viên

**Trạng thái đơn hàng:**
```
Mới tạo → Đã duyệt → Hoàn thành
              ↘ Hủy
```

### 6. Quản lý tồn kho

**Chức năng:**
- Xem tồn kho hiện tại
- Nhập kho (tăng tồn)
- Xuất kho (tự động khi bán hàng)
- Kiểm kê, điều chỉnh tồn kho
- Cảnh báo hết hàng
- Lịch sử nhập/xuất kho

### 7. Quản lý công nợ

**Chức năng:**
- Xem danh sách công nợ theo khách hàng
- Ghi nhận thanh toán
- Lịch sử thanh toán
- Báo cáo công nợ

### 8. Báo cáo & Thống kê

**Các loại báo cáo:**
- Doanh thu theo ngày/tuần/tháng/năm
- Doanh thu theo nhân viên
- Doanh thu theo sản phẩm
- Doanh thu theo khách hàng
- Báo cáo tồn kho
- Báo cáo công nợ
- Top sản phẩm bán chạy
- Top khách hàng mua nhiều

### 9. In hóa đơn / Xuất Excel

**Định dạng xuất:**
- PDF (để in) - theo template Excel
- Excel (để lưu trữ)

---

## Cấu trúc Database MySQL (Prisma Schema)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// ==================== USERS ====================
model User {
  id        String   @id @default(uuid())
  email     String   @unique @db.VarChar(255)
  password  String   @db.VarChar(255)
  name      String   @db.VarChar(255)
  phone     String?  @db.VarChar(20)
  role      Role     @default(SALES)
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  orders    Order[]
  stockLogs StockLog[]

  @@map("users")
}

enum Role {
  ADMIN
  MANAGER
  SALES
}

// ==================== CUSTOMER GROUP ====================
model CustomerGroup {
  id        String   @id @default(uuid())
  code      String   @unique @db.VarChar(50)  // DLN, DLV, dailylon
  name      String   @db.VarChar(255)         // Đại lý nhỏ, Đại lý vừa...
  priceType PriceType @default(WHOLESALE)     // Loại giá áp dụng
  createdAt DateTime @default(now())

  customers Customer[]

  @@map("customer_groups")
}

enum PriceType {
  WHOLESALE      // Giá bán buôn (PL_Giá bán buôn)
  MEDIUM_DEALER  // Giá đại lý vừa (PL_ĐLy vừa)
  LARGE_DEALER   // Giá đại lý lớn (PL_Giá ĐL lớn)
  RETAIL         // Giá bán lẻ (PL_Giá bán lẻ)
}

// ==================== CUSTOMER (theo Excel) ====================
model Customer {
  id              String   @id @default(uuid())
  code            String   @unique @db.VarChar(50)   // Mã khách hàng: CUZN01380
  name            String   @db.VarChar(255)          // Tên khách hàng *
  customerGroupId String?                            // FK -> CustomerGroup
  customerGroup   CustomerGroup? @relation(fields: [customerGroupId], references: [id])
  address         String?  @db.VarChar(500)          // Địa chỉ
  phone           String?  @db.VarChar(20)           // Điện thoại
  district        String?  @db.VarChar(100)          // Quận huyện
  ward            String?  @db.VarChar(100)          // Phường xã
  totalDebt       Decimal  @default(0) @db.Decimal(15, 0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  orders    Order[]
  payments  Payment[]

  @@index([name])
  @@index([phone])
  @@index([customerGroupId])
  @@map("customers")
}

// ==================== PRODUCT (theo Excel) ====================
model Product {
  id                 String   @id @default(uuid())
  sku                String   @unique @db.VarChar(50)   // Mã SKU *
  name               String   @db.VarChar(255)          // Tên sản phẩm *
  unit               String?  @db.VarChar(50)           // Đơn vị: gói, chai, thùng...
  wholesalePrice     Decimal  @default(0) @db.Decimal(15, 0)  // PL_Giá bán buôn
  mediumDealerPrice  Decimal  @default(0) @db.Decimal(15, 0)  // PL_ĐLy vừa
  largeDealerPrice   Decimal  @default(0) @db.Decimal(15, 0)  // PL_Giá ĐL lớn
  retailPrice        Decimal  @default(0) @db.Decimal(15, 0)  // PL_Giá bán lẻ
  stock              Int      @default(0)               // Số lượng tồn kho
  minStock           Int      @default(10)              // Ngưỡng cảnh báo
  active             Boolean  @default(true)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  orderItems OrderItem[]
  stockLogs  StockLog[]

  @@index([name])
  @@index([sku])
  @@map("products")
}

// ==================== ORDER (Hóa đơn theo Excel) ====================
model Order {
  id            String      @id @default(uuid())
  code          String      @unique @db.VarChar(50)  // Mã hóa đơn: HD001
  orderDate     DateTime    @default(now())          // Ngày
  customerId    String
  customer      Customer    @relation(fields: [customerId], references: [id])
  customerName  String      @db.VarChar(255)         // Khách hàng (lưu snapshot)
  customerPhone String?     @db.VarChar(20)          // ĐT
  customerAddress String?   @db.VarChar(500)         // Địa chỉ
  userId        String                               // Nhân viên tạo đơn
  user          User        @relation(fields: [userId], references: [id])
  priceType     PriceType                            // Loại giá áp dụng
  subtotal      Decimal     @db.Decimal(15, 0)       // Tổng tiền hàng
  discount      Decimal     @default(0) @db.Decimal(15, 0)
  total         Decimal     @db.Decimal(15, 0)       // Tổng thanh toán
  paidAmount    Decimal     @default(0) @db.Decimal(15, 0)  // Đã thanh toán
  debtAmount    Decimal     @default(0) @db.Decimal(15, 0)  // Còn nợ
  status        OrderStatus @default(PENDING)
  note          String?     @db.Text
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  items    OrderItem[]
  payments Payment[]

  @@index([orderDate])
  @@index([customerId])
  @@index([userId])
  @@index([status])
  @@map("orders")
}

enum OrderStatus {
  PENDING    // Mới tạo
  APPROVED   // Đã duyệt
  COMPLETED  // Hoàn thành
  CANCELLED  // Đã hủy
}

// ==================== ORDER ITEM (Chi tiết hóa đơn theo Excel) ====================
model OrderItem {
  id         String  @id @default(uuid())
  orderId    String
  order      Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId  String
  product    Product @relation(fields: [productId], references: [id])
  stt        Int                                    // STT
  productName String  @db.VarChar(255)              // Tên sản phẩm (snapshot)
  unit       String?  @db.VarChar(50)               // ĐVT
  quantity   Int                                    // SL
  unitPrice  Decimal  @db.Decimal(15, 0)            // Đơn giá
  total      Decimal  @db.Decimal(15, 0)            // Thành tiền = SL × Đơn giá

  @@index([orderId])
  @@map("order_items")
}

// ==================== PAYMENT (Thanh toán) ====================
model Payment {
  id          String        @id @default(uuid())
  orderId     String
  order       Order         @relation(fields: [orderId], references: [id])
  customerId  String
  customer    Customer      @relation(fields: [customerId], references: [id])
  amount      Decimal       @db.Decimal(15, 0)
  method      PaymentMethod @default(CASH)
  paymentDate DateTime      @default(now())
  note        String?       @db.VarChar(500)
  createdAt   DateTime      @default(now())

  @@index([orderId])
  @@index([customerId])
  @@map("payments")
}

enum PaymentMethod {
  CASH           // Tiền mặt
  BANK_TRANSFER  // Chuyển khoản
}

// ==================== STOCK LOG (Lịch sử kho) ====================
model StockLog {
  id         String    @id @default(uuid())
  productId  String
  product    Product   @relation(fields: [productId], references: [id])
  type       StockType
  quantity   Int                              // Số lượng thay đổi
  beforeQty  Int                              // Tồn trước
  afterQty   Int                              // Tồn sau
  orderId    String?   @db.VarChar(50)        // Mã đơn hàng (nếu xuất kho)
  userId     String
  user       User      @relation(fields: [userId], references: [id])
  note       String?   @db.VarChar(500)
  createdAt  DateTime  @default(now())

  @@index([productId])
  @@index([createdAt])
  @@map("stock_logs")
}

enum StockType {
  IMPORT  // Nhập kho
  EXPORT  // Xuất kho (bán hàng)
  ADJUST  // Điều chỉnh
}
```

---

## Cấu trúc thư mục dự án

```
BuyNow/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js              # Import dữ liệu từ Excel
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── user.controller.js
│   │   │   ├── customerGroup.controller.js
│   │   │   ├── customer.controller.js
│   │   │   ├── product.controller.js
│   │   │   ├── order.controller.js
│   │   │   ├── payment.controller.js
│   │   │   ├── stock.controller.js
│   │   │   └── report.controller.js
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js
│   │   │   └── validate.middleware.js
│   │   ├── routes/
│   │   │   └── index.js
│   │   ├── services/
│   │   │   ├── excel.service.js   # Import/Export Excel
│   │   │   ├── pdf.service.js     # Xuất hóa đơn PDF
│   │   │   └── price.service.js   # Tính giá theo nhóm KH
│   │   ├── utils/
│   │   │   └── helpers.js
│   │   └── app.js
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   └── layout/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── CustomerGroups/
│   │   │   ├── Customers/
│   │   │   ├── Products/
│   │   │   ├── Orders/
│   │   │   ├── Stock/
│   │   │   ├── Payments/
│   │   │   └── Reports/
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── store/
│   │   │   └── index.js
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── DS SẢN PHẨM.xlsx
└── claude.md
```

---

## API Endpoints

### Authentication
```
POST   /api/auth/login           - Đăng nhập
POST   /api/auth/logout          - Đăng xuất
GET    /api/auth/me              - Thông tin user hiện tại
PUT    /api/auth/change-password - Đổi mật khẩu
```

### Customer Groups
```
GET    /api/customer-groups      - Danh sách nhóm KH
POST   /api/customer-groups      - Tạo nhóm KH
PUT    /api/customer-groups/:id  - Cập nhật nhóm KH
DELETE /api/customer-groups/:id  - Xóa nhóm KH
```

### Customers
```
GET    /api/customers            - Danh sách khách hàng
POST   /api/customers            - Tạo khách hàng
GET    /api/customers/:id        - Chi tiết khách hàng
PUT    /api/customers/:id        - Cập nhật khách hàng
DELETE /api/customers/:id        - Xóa khách hàng
POST   /api/customers/import     - Import từ Excel
GET    /api/customers/:id/orders - Lịch sử đơn hàng
GET    /api/customers/:id/debt   - Công nợ khách hàng
```

### Products
```
GET    /api/products             - Danh sách sản phẩm
POST   /api/products             - Tạo sản phẩm
GET    /api/products/:id         - Chi tiết sản phẩm
PUT    /api/products/:id         - Cập nhật sản phẩm
DELETE /api/products/:id         - Xóa sản phẩm
POST   /api/products/import      - Import từ Excel
GET    /api/products/:id/price/:priceType - Lấy giá theo loại
```

### Orders
```
GET    /api/orders               - Danh sách đơn hàng
POST   /api/orders               - Tạo đơn hàng
GET    /api/orders/:id           - Chi tiết đơn hàng
PUT    /api/orders/:id           - Cập nhật đơn hàng
PUT    /api/orders/:id/status    - Cập nhật trạng thái
DELETE /api/orders/:id           - Hủy đơn hàng
GET    /api/orders/:id/print     - In hóa đơn (PDF)
GET    /api/orders/:id/export    - Xuất Excel
```

### Payments
```
GET    /api/payments             - Danh sách thanh toán
POST   /api/payments             - Ghi nhận thanh toán
GET    /api/payments/:id         - Chi tiết thanh toán
```

### Stock
```
GET    /api/stock                - Tồn kho hiện tại
POST   /api/stock/import         - Nhập kho
POST   /api/stock/adjust         - Điều chỉnh tồn kho
GET    /api/stock/logs           - Lịch sử nhập/xuất
GET    /api/stock/alerts         - Cảnh báo hết hàng
```

### Reports
```
GET    /api/reports/revenue      - Báo cáo doanh thu
GET    /api/reports/by-employee  - Doanh thu theo nhân viên
GET    /api/reports/by-product   - Doanh thu theo sản phẩm
GET    /api/reports/by-customer  - Doanh thu theo khách hàng
GET    /api/reports/stock        - Báo cáo tồn kho
GET    /api/reports/debt         - Báo cáo công nợ
```

---

## Hướng dẫn cài đặt

### 1. Cài đặt MySQL

```bash
# Windows: Tải MySQL Installer từ mysql.com
# Hoặc dùng XAMPP/Laragon

# Tạo database
mysql -u root -p
CREATE DATABASE buynow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Backend

```bash
cd backend
npm init -y
npm install express prisma @prisma/client cors dotenv bcryptjs jsonwebtoken zod exceljs pdfkit multer
npm install -D nodemon

# Khởi tạo Prisma
npx prisma init

# Cập nhật .env
# DATABASE_URL="mysql://root:password@localhost:3306/buynow"

# Chạy migration
npx prisma migrate dev --name init
npx prisma generate

# Seed data từ Excel
node prisma/seed.js
```

### 3. Frontend

```bash
cd frontend
npm create vite@latest . -- --template react
npm install antd @ant-design/icons axios zustand dayjs react-router-dom
npm install -D @types/node
```

---

## Logic tính giá theo nhóm khách hàng

```javascript
// services/price.service.js

function getPriceByCustomerGroup(product, customerGroup) {
  if (!customerGroup) {
    return product.retailPrice; // Khách lẻ
  }

  switch (customerGroup.priceType) {
    case 'WHOLESALE':
      return product.wholesalePrice;
    case 'MEDIUM_DEALER':
      return product.mediumDealerPrice;
    case 'LARGE_DEALER':
      return product.largeDealerPrice;
    case 'RETAIL':
    default:
      return product.retailPrice;
  }
}
```

---

## Ghi chú phát triển

1. **Ưu tiên phát triển:**
   - Phase 1: Auth, CustomerGroups, Customers, Products, Orders (core)
   - Phase 2: Stock management, Payments
   - Phase 3: Reports, Dashboard

2. **Import Excel:**
   - Sử dụng file `DS SẢN PHẨM.xlsx` để import:
     - Sheet "KHÁCH HÀNG" → bảng customers
     - Sheet "SẢN PHẨM" → bảng products

3. **Mapping nhóm khách hàng:**
   - DLN → WHOLESALE (Giá bán buôn)
   - DLV → MEDIUM_DEALER (Giá ĐL vừa)
   - dailylon → LARGE_DEALER (Giá ĐL lớn)

4. **Security:**
   - Hash password với bcrypt (saltRounds = 10)
   - JWT token expire sau 24h
   - Validate tất cả input từ client
