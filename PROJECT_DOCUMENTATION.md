# NexusMarket - Enterprise Multi-Vendor E-Commerce Platform
## Architectural Specification & Full-Stack System Documentation

> **Document Version:** 2.1.0  
> **Target OS:** Cross-Platform (Windows / Linux / macOS)  
> **PDF Export:** [NexusMarket_FullStack_Documentation.pdf](file:///C:/Users/thiru/Downloads/E-Commerce/NexusMarket_FullStack_Documentation.pdf)

---

## 1. Executive Summary

**NexusMarket** is a production-ready, full-stack multi-vendor e-commerce platform built on modern cloud technologies. It features an isolated tripartite **Role-Based Access Control (RBAC)** architecture designed for three distinct personas:
1. **System Administrators (ADMIN)**: Governance, daily settled bank balance tracking, order status updates, and user RBAC provisioning.
2. **Retail Merchants (SALES_PERSON)**: Dedicated merchant portal to manage inventory, upload Cloudinary product images, and track store sales orders.
3. **Retail Customers (USER)**: Multi-vendor catalog discovery, reactive keyword & min-to-max price filtering, synchronized shopping cart & wishlist, Razorpay checkout with ACID concurrency locking, delivery address management, and automated Nodemailer email receipts.

---

## 2. Technology Stack

### Frontend (Single Page Application)
- **Framework:** Angular 18 (Standalone Components, Zero NgModules)
- **State Management:** Native Angular Signals (`signal`, `computed`)
- **HTTP Client:** Angular `HttpClient` with functional `authInterceptor` (Automatic Bearer Token injection)
- **Styling:** Modular CSS3 with Custom Properties (variables) and responsive grid design
- **Iconography:** FontAwesome 6 Free SVG & Webfonts
- **Separation of Concerns:** 100% clean file separation (`.component.ts`, `.component.html`, `.component.css`) across all 17 components

### Backend (REST API Service)
- **Runtime:** Node.js (v18+ / v24 LTS)
- **Framework:** Express.js 4.19
- **Database:** MySQL 8.0 with Sequelize 6.37 ORM
- **Request Validation:** Joi 17 (Inline controller-centric validation schemas)
- **Security:** Helmet HTTP headers, CORS with pre-flight options, bcryptjs (Salt 12)
- **Logging:** Winston logger with timestamped debug/info output

### Third-Party Cloud Integrations
- **Cloudinary CDN:** Direct buffer upload stream for product images
- **Razorpay Payment Gateway:** Server-side order creation in paise, client-side checkout popup modal, and cryptographic `HMAC-SHA256` signature verification
- **Nodemailer SMTP:** Transactional order confirmation receipts dispatched via Gmail SMTP with responsive HTML layout and automatic merchant BCC copy

---

## 3. Role-Based Access Control (RBAC) Matrix

Mutating operations are enforced at both frontend Angular route guards and backend Express middlewares:

| Feature / Page | `ADMIN` | `SALES_PERSON` | `USER` (Customer) |
|---|:---:|:---:|:---:|
| **Public Storefront (`/`)** | View Catalog | View Catalog | View, Cart & Wishlist |
| **Search & Price Filters** | Yes | Yes | Yes |
| **Add to Cart / Cart (`/cart`)** | ❌ Blocked | ❌ Blocked | ✅ Allowed |
| **Save to Wishlist (`/wishlist`)** | ❌ Blocked | ❌ Blocked | ✅ Allowed |
| **Razorpay Checkout** | ❌ Blocked | ❌ Blocked | ✅ Allowed |
| **My Orders (`/orders/my`)** | ❌ Blocked | ❌ Blocked | ✅ Allowed |
| **Shipping Address on Profile** | ❌ Excluded | ❌ Excluded | ✅ Included & Editable |
| **Seller Inventory (`/seller/products`)** | ✅ View/Audit | ✅ Own Store CRUD | ❌ Blocked |
| **Seller Analytics (`/seller/dashboard`)** | ✅ View/Audit | ✅ Own Store Stats | ❌ Blocked |
| **Admin Dashboard (`/admin/dashboard`)** | ✅ Full Access | ❌ Blocked | ❌ Blocked |
| **Daily Settled Bank Account** | ✅ Full Access | ❌ Blocked | ❌ Blocked |
| **Platform Orders (`/admin/orders`)** | ✅ Update Statuses | ❌ Blocked | ❌ Blocked |
| **RBAC Provisioning (`/admin/users`)** | ✅ Create Accounts | ❌ Blocked | ❌ Blocked |

---

## 4. Database Entity-Relationship Model

```
 ┌─────────────┐       1:N       ┌────────────────────────┐
 │    roles    ├────────────────►│         users          │
 └──────┬──────┘                 └───────────┬────────────┘
        │                                    │
        │ N:M (role_permissions)             │
        ▼                                    ├── 1:1 ──► carts ── 1:N ──► cart_items
 ┌─────────────┐                             │
 │ permissions │                             ├── 1:1 ──► wishlists ── 1:N ──► wishlist_items
 └─────────────┘                             │
                                             ├── 1:N ──► products (ownerId)
                                             │
                                             └── 1:N ──► orders ── 1:N ──► order_items
```

### Table Definitions
1. **`users`**: `id` (UUIDv4 PK), `name`, `email` (Unique), `password` (Hashed), `role` (ENUM), `roleId` (FK), `address` (TEXT), `isActive` (BOOLEAN).
2. **`roles` & `permissions`**: RBAC permissions matrix connected by `role_permissions` junction.
3. **`products`**: `id` (UUID PK), `name`, `description`, `price` (DECIMAL 10,2), `stock` (INT), `category`, `ownerId` (FK -> users), `images` (JSON array of `{url, publicId}`), `isActive`.
4. **`carts` & `cart_items`**: `cartId`, `productId`, `quantity`.
5. **`wishlists` & `wishlist_items`**: `wishlistId`, `productId`.
6. **`orders` & `order_items`**: `id`, `userId`, `totalAmount`, `deliveryAddress` (TEXT snapshot), `paymentStatus` (PAID/FAILED), `orderStatus` (CONFIRMED/PROCESSING/SHIPPED/DELIVERED), `razorpayOrderId`, `razorpayPaymentId`, `razorpaySignature`.

---

## 5. Critical System Workflows

### 5.1 ACID Transactional Checkout with Stock Locking
To prevent race conditions and overselling during high concurrent checkout traffic:
1. Client calls `POST /api/payments/create-order` to compute cart totals and receive `razorpayOrderId`.
2. Client completes payment in Razorpay modal and receives signature `razorpayPaymentId` & `razorpaySignature`.
3. Client submits `POST /api/payments/verify`.
4. Backend opens a managed transaction (`sequelize.transaction`).
5. Product rows are locked using pessimistic lock:
   ```javascript
   const product = await Product.findByPk(item.productId, {
     lock: t.LOCK.UPDATE, // SELECT ... FOR UPDATE
     transaction: t,
   });
   ```
6. Validates sufficient stock, decrements inventory, creates `Order` with `deliveryAddress`, creates `OrderItems`, flushes `CartItem`, and commits the transaction atomically.
7. Dispatches asynchronous order confirmation receipt via Nodemailer with customer delivery address.

### 5.2 Nodemailer Transactional Email Delivery
- **Service Configuration**: `backend/src/config/mail.js`
- **Authentication**: Authenticated via Google SMTP (`smtp.gmail.com:587`) using a 16-character Google App Password.
- **Recipient Handling**: Sent directly to customer's email with automatic `BCC` copy to merchant/store administrator (`SMTP_USER`), guaranteeing instant verification during tests.
- **Content**: Clean HTML email containing order ID, date, payment status, itemized table with prices in INR, total amount, and delivery address.

---

## 6. Complete REST API Reference

All routes are prefixed with `/api`.

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register customer or merchant account |
| `POST` | `/auth/login` | Public | Authenticate user and receive 24h JWT token |
| `GET` | `/auth/me` | Authenticated | Fetch current user profile with address & role details |
| `PUT` | `/auth/profile` | Authenticated | Update user name and delivery address |
| `GET` | `/auth/view/:id` | Self / ADMIN | Fetch user account profile by UUID |
| `POST` | `/auth/admin/create-user` | ADMIN | Provision new account with explicit RBAC role |

### Products (`/api/products`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/products` | Public | Paginated catalog with keyword, category, min/max price |
| `GET` | `/products/:id` | Public | Single product details with seller info & images |
| `POST` | `/products` | SALES_PERSON, ADMIN | Create product with Cloudinary image uploads |
| `PUT` | `/products/:id` | SALES_PERSON, ADMIN | Update product details and replace images |
| `DELETE` | `/products/:id` | SALES_PERSON, ADMIN | Soft-delete product from marketplace |

### Cart & Wishlist (`/api/cart`, `/api/wishlist`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/cart` | USER | View shopping cart items with subtotals |
| `POST` | `/cart/add` | USER | Add item or increment quantity in cart |
| `PUT` | `/cart/item/:id` | USER | Update item quantity |
| `DELETE` | `/cart/item/:id` | USER | Remove single item from cart |
| `DELETE` | `/cart/clear` | USER | Clear all items from cart |
| `GET` | `/wishlist` | USER | Retrieve bookmarked products |
| `POST` | `/wishlist/add` | USER | Add product to wishlist |
| `DELETE` | `/wishlist/item/:id`| USER | Remove item from wishlist |

### Payments & Orders (`/api/payments`, `/api/orders`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/payments/create-order` | USER | Initialize Razorpay order in paise |
| `POST` | `/payments/verify` | USER | Verify signature, commit order, dispatch receipt email |
| `GET` | `/orders/my` | USER | View personal customer order history and statuses |
| `GET` | `/orders/seller` | SALES_PERSON, ADMIN | View store-specific sales order line items |
| `GET` | `/orders/all` | ADMIN | View all platform orders with customer info |
| `PUT` | `/orders/:id/status` | ADMIN | Update fulfillment status (CONFIRMED -> DELIVERED) |

### Analytics & Dashboard (`/api/dashboard`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/dashboard/admin` | ADMIN | Platform metrics, order breakdowns, and settled daily bank balance |
| `GET` | `/dashboard/sales` | SALES_PERSON, ADMIN | Merchant units sold, revenues, and inventory counts (alias: `/dashboard/seller`) |
| `GET` | `/dashboard/user` | USER | Customer personal order count, lifetime spend, and recent orders |

---

## 7. Setup & Runbook

### 7.1 Prerequisites
- Node.js 18+ or 24 LTS
- MySQL Server 8.0 running on port 3306
- Active internet connection for Cloudinary, Razorpay, and Nodemailer SMTP

### 7.2 Backend Configuration (`e-commerce-backend/.env`)
```ini
PORT=5000
NODE_ENV=development

# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=ecommerce_db

# JSON Web Token Secret
JWT_SECRET=super_secret_jwt_key_here
JWT_EXPIRES_IN=24h

# Cloudinary CDN (Image Storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Razorpay Payment Gateway (Test Mode)
RAZORPAY_KEY_ID=rzp_test_YourKeyId
RAZORPAY_KEY_SECRET=YourRazorpaySecret
RAZORPAY_WEBHOOK_SECRET=YourWebhookSecret

# Nodemailer Google SMTP Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_char_google_app_password
EMAIL_FROM="NexusMarket Support" <your_email@gmail.com>
```

### 7.3 Frontend Configuration (`e-commerce-frontend/.env`)
```ini
# Backend API Base URL
API_URL=http://localhost:5000/api

# Razorpay Checkout Client Key
RAZORPAY_KEY_ID=rzp_test_YourKeyId

# Build Configuration
PRODUCTION=false
```

### 7.4 Backend Execution
```bash
cd e-commerce-backend
npm install
cp .env.example .env  # Configure your credentials
npm run seed          # Populates 30 products, 5 RBAC accounts, demo addresses
npm start             # Runs Express API on http://localhost:5000
```

### 7.5 Frontend Execution
```bash
cd e-commerce-frontend
npm install
cp .env.example .env  # Configure client API settings
npm start             # Runs Angular SPA on http://localhost:4200
npm run build         # Compiles production distribution in e-commerce-frontend/dist/
```

### 7.6 Seeded Accounts (Password for all: `Password123!`)
1. **System Administrator:** `admin@ecommerce.com` (`ADMIN`)
2. **Retailer 1 (Apex Electronics):** `seller1@ecommerce.com` (`SALES_PERSON` - 10 products)
3. **Retailer 2 (Prime Gear):** `seller2@ecommerce.com` (`SALES_PERSON` - 20 products)
4. **Customer 1 (Alice):** `alice@ecommerce.com` (`USER` - Demo Address in Indiranagar, Bengaluru)
5. **Customer 2 (Bob):** `bob@ecommerce.com` (`USER` - Demo Address in Banjara Hills, Hyderabad)

