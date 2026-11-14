# NexusMarket — Enterprise Multi-Vendor E-Commerce Platform

[![Angular 18](https://img.shields.io/badge/Frontend-Angular_18-DD0031?logo=angular)](https://angular.dev/)
[![Node.js Express](https://img.shields.io/badge/Backend-Node.js_Express-339933?logo=node.js)](https://expressjs.com/)
[![MySQL 8](https://img.shields.io/badge/Database-MySQL_8.0-4479A1?logo=mysql)](https://www.mysql.com/)
[![Sequelize ORM](https://img.shields.io/badge/ORM-Sequelize_6-52B0E7?logo=sequelize)](https://sequelize.org/)
[![Razorpay](https://img.shields.io/badge/Payments-Razorpay-02042B?logo=razorpay)](https://razorpay.com/)
[![Cloudinary](https://img.shields.io/badge/CDN-Cloudinary-3448C5?logo=cloudinary)](https://cloudinary.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A production-ready full-stack multi-vendor e-commerce platform built on an isolated tripartite **Role-Based Access Control (RBAC)** architecture.

---

## 📑 Documentation

- **Full System Specification:** [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md)
- **Backend API Reference:** [e-commerce-backend/API_DOCUMENTATION.md](e-commerce-backend/API_DOCUMENTATION.md)
- **Printable Architecture PDF:** [NexusMarket_FullStack_Documentation.pdf](NexusMarket_FullStack_Documentation.pdf)

---

## 🚀 Key Features

- **Tripartite RBAC Persona System**:
  - `ADMIN`: Platform oversight, analytics, order status updates, RBAC account provisioning, and daily settled bank balance tracking.
  - `SALES_PERSON`: Merchant portal, Cloudinary product uploads, stock management, and store-specific sales order tracking.
  - `USER`: Customer catalog, reactive keyword & min-to-max price filters, cart & wishlist, address management, Razorpay checkout, and automated email receipts.
- **ACID Transactional Checkout**:
  - Pessimistic row-locking (`SELECT ... FOR UPDATE`) prevents inventory overselling during high concurrent checkout traffic.
  - Razorpay order creation and cryptographic `HMAC-SHA256` signature verification.
- **Nodemailer Order Receipts**:
  - Transactional order confirmation receipts dispatched via Google SMTP with itemized price tables in INR and customer delivery address snapshot.
  - Store administrator automatically receives a hidden `BCC` copy for live delivery audit.
- **Angular 18 Modern Architecture**:
  - 100% Standalone Components (Zero NgModules)
  - Native Angular Signals (`signal`, `computed`)
  - Functional HTTP `authInterceptor` for automatic Bearer JWT injection
  - Clean separation of `.component.ts`, `.component.html`, and `.component.css` across all 17 components

---

## 🛠️ Tech Stack

### Frontend (`e-commerce-frontend`)
- **Framework:** Angular 18 (Standalone Components)
- **State Management:** Angular Signals
- **Styling:** Modular CSS3 with Custom Properties & FontAwesome 6 Free

### Backend (`e-commerce-backend`)
- **Runtime:** Node.js (v18+ / v24 LTS) & Express 4.19
- **Database:** MySQL 8.0 & Sequelize 6.37 ORM
- **Security & Validation:** Joi 17, Helmet, CORS, bcryptjs, Winston logger

### Cloud Integrations
- **Cloudinary CDN:** Image upload and public asset management
- **Razorpay:** Payment processing with server-side order calculation
- **Nodemailer:** Google SMTP transactional order receipts

---

## 🏁 Quickstart Guide

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/<your-repo-name>.git
cd <your-repo-name>
```

### 2. Backend Setup
```bash
cd e-commerce-backend
npm install

# Copy environment template and fill in your credentials
cp .env.example .env

# Run database seeder (populates roles, 5 test users, 30 products, demo addresses)
npm run seed

# Start Express server on http://localhost:5000
npm start
```

### 3. Frontend Setup
```bash
cd ../e-commerce-frontend
npm install

# Copy environment template
cp .env.example .env

# Start Angular development server on http://localhost:4200
npm start

# Or build for production
npm run build
```

---

## 👥 Seeded Test Credentials

All seeded accounts share the default password: `Password123!`

| Role | Email | Purpose |
|---|---|---|
| `ADMIN` | `admin@ecommerce.com` | Full governance, daily bank balance & order management |
| `SALES_PERSON` | `seller1@ecommerce.com` | Apex Electronics (10 managed products) |
| `SALES_PERSON` | `seller2@ecommerce.com` | Prime Gear (20 managed products) |
| `USER` | `alice@ecommerce.com` | Customer with seeded Bengaluru shipping address |
| `USER` | `bob@ecommerce.com` | Customer with seeded Hyderabad shipping address |

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).

