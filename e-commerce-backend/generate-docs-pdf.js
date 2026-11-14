'use strict';

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const outputPath = path.resolve(__dirname, '../NexusMarket_FullStack_Documentation.pdf');

console.log('Generating comprehensive PDF documentation at:', outputPath);

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 40, bottom: 40, left: 45, right: 45 },
  bufferPages: true,
});

const writeStream = fs.createWriteStream(outputPath);
doc.pipe(writeStream);

// Color Palette
const PRIMARY = '#4338CA';     // Indigo 700
const SECONDARY = '#0EA5E9';   // Sky 500
const DARK = '#0F172A';        // Slate 900
const TEXT = '#334155';        // Slate 700
const MUTED = '#64748B';       // Slate 500
const LIGHT_BG = '#F8FAFC';    // Slate 50
const BORDER = '#CBD5E1';      // Slate 300
const SUCCESS = '#16A34A';     // Green 600

function addHeader(title) {
  if (doc.y > doc.page.height - 100) doc.addPage();
  doc.fontSize(15).fillColor(PRIMARY).font('Helvetica-Bold').text(title);
  doc.strokeColor(PRIMARY).lineWidth(1).moveTo(doc.x, doc.y + 3).lineTo(doc.x + 505, doc.y + 3).stroke();
  doc.moveDown(0.7);
}

function addSubHeader(subtitle) {
  if (doc.y > doc.page.height - 80) doc.addPage();
  doc.fontSize(11.5).fillColor(DARK).font('Helvetica-Bold').text(subtitle);
  doc.moveDown(0.4);
}

function addParagraph(text) {
  if (doc.y > doc.page.height - 60) doc.addPage();
  doc.fontSize(9.5).fillColor(TEXT).font('Helvetica').text(text, { lineGap: 3, align: 'justify' });
  doc.moveDown(0.5);
}

function addBullet(title, desc) {
  if (doc.y > doc.page.height - 50) doc.addPage();
  doc.fontSize(9).fillColor(PRIMARY).font('Helvetica-Bold').text('•  ' + title + ': ', { continued: true });
  doc.fillColor(TEXT).font('Helvetica').text(desc, { lineGap: 2 });
  doc.moveDown(0.3);
}

function addCodeBlock(code) {
  const lines = code.split('\n');
  const height = lines.length * 11 + 14;
  if (doc.y + height > doc.page.height - 50) doc.addPage();

  const startY = doc.y;
  doc.rect(doc.x, doc.y, 505, height).fill('#1E293B');
  doc.fillColor('#38BDF8').font('Courier').fontSize(8);

  let currentY = startY + 7;
  lines.forEach((line) => {
    doc.text(line, 55, currentY, { lineBreak: false });
    currentY += 11;
  });

  doc.y = startY + height + 8;
  doc.x = 45;
}

function addTable(headers, rows, colWidths) {
  const startX = 45;
  const rowHeight = 18;
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);

  if (doc.y + rowHeight * (rows.length + 1) > doc.page.height - 50) {
    doc.addPage();
  }

  let y = doc.y;
  doc.rect(startX, y, tableWidth, rowHeight).fill('#EEF2FF');
  doc.strokeColor(BORDER).lineWidth(0.5).rect(startX, y, tableWidth, rowHeight).stroke();

  let curX = startX;
  headers.forEach((h, i) => {
    doc.fillColor(PRIMARY).font('Helvetica-Bold').fontSize(8.5).text(h, curX + 5, y + 5, { width: colWidths[i] - 10, lineBreak: false });
    curX += colWidths[i];
  });

  y += rowHeight;

  rows.forEach((row, rIdx) => {
    if (y + rowHeight > doc.page.height - 40) {
      doc.addPage();
      y = 45;
    }
    const bg = rIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    doc.rect(startX, y, tableWidth, rowHeight).fill(bg);
    doc.strokeColor(BORDER).lineWidth(0.5).rect(startX, y, tableWidth, rowHeight).stroke();

    curX = startX;
    row.forEach((cell, cIdx) => {
      doc.fillColor(TEXT).font('Helvetica').fontSize(8).text(cell, curX + 5, y + 5, { width: colWidths[cIdx] - 10, lineBreak: false });
      curX += colWidths[cIdx];
    });
    y += rowHeight;
  });

  doc.y = y + 10;
  doc.x = startX;
}

// ══════════════════════════════════════════════════════════════════════════════
// COVER / TITLE BLOCK
// ══════════════════════════════════════════════════════════════════════════════

doc.rect(45, 40, 505, 110).fill('#1E1B4B');
doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(22).text('NexusMarket Multi-Vendor Platform', 65, 58);
doc.fillColor('#38BDF8').font('Helvetica-Bold').fontSize(11).text('Complete Full-Stack Architecture & API Specification v2.1', 65, 88);
doc.fillColor('#A5B4FC').font('Helvetica').fontSize(9).text('Angular 18 Standalone | Node.js Express 4 | MySQL Sequelize | Cloudinary | Razorpay | Nodemailer', 65, 108);

doc.y = 170;
doc.x = 45;

// ══════════════════════════════════════════════════════════════════════════════
// 1. EXECUTIVE SUMMARY
// ══════════════════════════════════════════════════════════════════════════════
addHeader('1. Executive Architecture Summary');
addParagraph('NexusMarket is an enterprise-grade multi-vendor e-commerce platform built on an isolated Role-Based Access Control (RBAC) architecture. The platform cleanly partitions capabilities across three primary user tiers:');
addBullet('System Administrator (ADMIN)', 'Platform oversight, analytics, order fulfillment transitions, RBAC provisioning, and daily settled bank balance reconciliation.');
addBullet('Retail Merchant (SALES_PERSON)', 'Dedicated seller inventory portal, Cloudinary asset uploads, item stock controls, and store-specific sales order tracking.');
addBullet('Retail Customer (USER)', 'Public marketplace storefront, reactive search & min-to-max price filters, cart & wishlist management, delivery address management, Razorpay checkout with ACID concurrency locking, and automated Nodemailer order confirmation receipts.');

// ══════════════════════════════════════════════════════════════════════════════
// 2. TECH STACK SPECIFICATION
// ══════════════════════════════════════════════════════════════════════════════
addHeader('2. Technology Stack & Design System');
addTable(
  ['Layer', 'Technology', 'Key Architectural Patterns / Libraries'],
  [
    ['Frontend', 'Angular 18', 'Standalone Components, Zero NgModules, Signals, Functional Interceptor'],
    ['Styling', 'Modular CSS3 & FontAwesome', 'CSS custom properties, CSS Grid/Flexbox, 100% split TS/HTML/CSS'],
    ['Backend', 'Node.js & Express 4.19', 'Controller-centric MVC, Joi schemas, helmet, cors, winston, bcryptjs'],
    ['Database', 'MySQL 8.0 & Sequelize 6', 'UUIDv4 PKs, Foreign Keys, Pessimistic Row Locking (SELECT FOR UPDATE)'],
    ['Cloud Media', 'Cloudinary CDN', 'Buffer stream uploads, public_id management, parallel multipart upload'],
    ['Payments', 'Razorpay Gateway', 'Paise calculation, Razorpay Checkout modal, HMAC-SHA256 signature verify'],
    ['Transactional Mail', 'Nodemailer SMTP', 'Google SMTP (smtp.gmail.com:587), App Password auth, BCC merchant copy']
  ],
  [80, 130, 295]
);

// ══════════════════════════════════════════════════════════════════════════════
// 3. ROLE-BASED ACCESS CONTROL (RBAC)
// ══════════════════════════════════════════════════════════════════════════════
addHeader('3. Role-Based Access Control Matrix');
addParagraph('Access controls are enforced at both frontend route guards (roleGuard) and backend API middlewares (allowRoles):');
addTable(
  ['Application Area / Route', 'ADMIN', 'SALES_PERSON', 'USER (Customer)'],
  [
    ['Storefront & Search Filters (/)', 'Browse Only', 'Browse Only', 'Full (Cart/Wishlist/Buy)'],
    ['Shopping Cart (/cart)', 'Blocked (403)', 'Blocked (403)', 'Allowed (Full Access)'],
    ['Wishlist (/wishlist)', 'Blocked (403)', 'Blocked (403)', 'Allowed (Full Access)'],
    ['Razorpay Payment (/payments)', 'Blocked (403)', 'Blocked (403)', 'Allowed (Full Checkout)'],
    ['My Orders (/orders/my)', 'Blocked (403)', 'Blocked (403)', 'Allowed (Personal History)'],
    ['Delivery Address Management', 'Excluded', 'Excluded', 'Editable on User Profile'],
    ['Seller Inventory (/seller/products)', 'View & Audit', 'Own Store CRUD', 'Blocked (403)'],
    ['Admin Dashboard & Bank Account', 'Full Governance', 'Blocked (403)', 'Blocked (403)'],
    ['Order Status Transition', 'Full Update Rights', 'Blocked (403)', 'Blocked (403)'],
    ['RBAC User Provisioning', 'Create Any Role', 'Blocked (403)', 'Blocked (403)']
  ],
  [185, 100, 100, 120]
);

// ══════════════════════════════════════════════════════════════════════════════
// 4. DATABASE ARCHITECTURE & ENTITIES
// ══════════════════════════════════════════════════════════════════════════════
addHeader('4. Database Entities & Schema Definition');
addBullet('users', 'id (UUIDv4 PK), name, email (UNIQUE), password (hashed), role (ENUM), roleId (FK), address (TEXT), isActive.');
addBullet('roles & permissions', 'RBAC matrix linked by role_permissions junction table.');
addBullet('products', 'id (UUIDv4 PK), name, description, price (DECIMAL 10,2), stock (INT), category, ownerId (FK), images (JSON array), isActive.');
addBullet('carts & cart_items', '1:1 with user, line items with quantity & unit price.');
addBullet('wishlists & wishlist_items', '1:1 with user, unique product bookmarking.');
addBullet('orders & order_items', 'id, userId, totalAmount, deliveryAddress (snapshot), paymentStatus (PAID/FAILED), orderStatus (CONFIRMED/PROCESSING/SHIPPED/DELIVERED), razorpayOrderId, razorpayPaymentId, razorpaySignature.');

// ══════════════════════════════════════════════════════════════════════════════
// 5. CRITICAL BUSINESS WORKFLOWS
// ══════════════════════════════════════════════════════════════════════════════
addHeader('5. Critical Business Workflows');
addSubHeader('5.1 ACID Transactional Checkout with Stock Locking');
addParagraph('During concurrent checkouts, inventory race conditions are prevented using Sequelize managed transactions with SELECT ... FOR UPDATE pessimistic row locking:');
addCodeBlock(
`// backend/src/controllers/payment.controller.js
await sequelize.transaction(async (t) => {
  for (const item of cart.items) {
    const product = await Product.findByPk(item.productId, { lock: t.LOCK.UPDATE, transaction: t });
    if (!product || product.stock < item.quantity) throw new Error('Insufficient stock');
    product.stock -= item.quantity;
    await product.save({ transaction: t });
  }
  const order = await Order.create({ userId, totalAmount, deliveryAddress, paymentStatus: 'PAID' }, { transaction: t });
  await CartItem.destroy({ where: { cartId: cart.id }, transaction: t });
});`
);

addSubHeader('5.2 Nodemailer Transactional Email Delivery');
addParagraph('Configured in backend/src/config/mail.js via Google SMTP (smtp.gmail.com:587) using an authenticated Google App Password. Dispatches responsive HTML order receipts containing order ID, itemized table, total amount in INR, and shipping address. Every email automatically includes a hidden BCC copy to the store administrator (SMTP_USER), ensuring instant delivery verification during testing.');

// ══════════════════════════════════════════════════════════════════════════════
// 6. REST API SPECIFICATION
// ══════════════════════════════════════════════════════════════════════════════
addHeader('6. REST API Endpoint Reference');
addTable(
  ['Method & Endpoint', 'Role Access', 'Function & Request/Response Details'],
  [
    ['POST /api/auth/register', 'Public', 'Register customer or merchant; returns JWT token + user'],
    ['POST /api/auth/login', 'Public', 'Authenticates credentials; returns 24h JWT token + user info'],
    ['GET /api/auth/me', 'Authenticated', 'Current profile with address, roleDetails, and timestamps'],
    ['PUT /api/auth/profile', 'Authenticated', 'Updates name and default shipping/delivery address'],
    ['GET /api/auth/view/:id', 'Self / ADMIN', 'Fetch profile by UUID; restricted to owner or admin'],
    ['POST /api/auth/admin/create-user', 'ADMIN', 'Provision account with explicit role (ADMIN/SELLER/USER)'],
    ['GET /api/products', 'Public', 'Catalog with keyword, category, min/max price, ownerId'],
    ['GET /api/products/:id', 'Public', 'Product details with seller info, images array, stock count'],
    ['POST /api/products', 'SELLER/ADMIN', 'Create product with multipart/form-data Cloudinary uploads'],
    ['PUT /api/products/:id', 'SELLER/ADMIN', 'Update product fields, append images, or remove by publicId'],
    ['DELETE /api/products/:id', 'SELLER/ADMIN', 'Soft-delete product by marking isActive = false'],
    ['GET /api/cart', 'USER', 'Retrieve current user shopping cart items and calculated subtotal'],
    ['POST /api/cart/add', 'USER', 'Add item to cart or increment quantity; stock verified'],
    ['PUT /api/cart/item/:id', 'USER', 'Update cart item quantity; checks stock availability'],
    ['DELETE /api/cart/item/:id', 'USER', 'Remove single product line item from active cart'],
    ['DELETE /api/cart/clear', 'USER', 'Flush all items from cart'],
    ['GET /api/wishlist', 'USER', 'Retrieve user bookmarked products'],
    ['POST /api/wishlist/add', 'USER', 'Add product to wishlist; duplicate check enforced'],
    ['DELETE /api/wishlist/item/:id', 'USER', 'Remove product from wishlist'],
    ['POST /api/payments/create-order', 'USER', 'Create Razorpay order in paise from server-verified cart'],
    ['POST /api/payments/verify', 'USER', 'Verify HMAC signature, ACID stock commit, email receipt'],
    ['GET /api/orders/my', 'USER', 'Customer order history with deliveryAddress and items'],
    ['GET /api/orders/seller', 'SELLER/ADMIN', 'Merchant order line items for products owned by seller'],
    ['GET /api/orders/all', 'ADMIN', 'Platform-wide order records with customer details & address'],
    ['PUT /api/orders/:id/status', 'ADMIN', 'Update fulfillment status: CONFIRMED -> DELIVERED'],
    ['GET /api/dashboard/admin', 'ADMIN', 'Platform metrics, order breakdowns, settled bank balance'],
    ['GET /api/dashboard/sales', 'SELLER/ADMIN', 'Merchant units sold, store revenue, recent sales items'],
    ['GET /api/dashboard/user', 'USER', 'Customer personal order count, lifetime spend, recent orders']
  ],
  [145, 95, 265]
);

// ══════════════════════════════════════════════════════════════════════════════
// 7. SETUP & RUNBOOK
// ══════════════════════════════════════════════════════════════════════════════
addHeader('7. Setup & Runbook');
addSubHeader('7.1 Seeded Test Accounts (Password: Password123!)');
addBullet('admin@ecommerce.com', 'ADMIN - Platform administrator with full analytics and daily settled bank account balance.');
addBullet('seller1@ecommerce.com', 'SALES_PERSON - Apex Electronics merchant managing 10 seeded products.');
addBullet('seller2@ecommerce.com', 'SALES_PERSON - Prime Gear merchant managing 20 seeded products.');
addBullet('alice@ecommerce.com', 'USER - Customer with demo address: 123 Indiranagar 100ft Road, Bengaluru, Karnataka 560038.');
addBullet('bob@ecommerce.com', 'USER - Customer with demo address: Flat 402, Banjara Hills Road No 12, Hyderabad, Telangana 500034.');

addSubHeader('7.2 Startup Commands');
addCodeBlock(
`# Backend Server (Port 5000)
cd backend
npm install
npm run seed     # Populates 30 products, 5 RBAC accounts, and demo addresses
npm start        # Starts Express API at http://localhost:5000

# Frontend Angular Application (Port 4200)
cd frontend
npm install
npm start        # Starts Angular SPA at http://localhost:4200
npm run build    # Production build compiled to frontend/dist/`
);

// Page Numbers Footer
const totalPages = doc.bufferedPageRange().count;
for (let i = 0; i < totalPages; i++) {
  doc.switchToPage(i);
  doc.fontSize(8).fillColor(MUTED).font('Helvetica');
  doc.text(
    `NexusMarket Full-Stack Documentation | Page ${i + 1} of ${totalPages}`,
    45,
    doc.page.height - 30,
    { align: 'center', width: 505 }
  );
}

doc.end();

writeStream.on('finish', () => {
  const stats = fs.statSync(outputPath);
  console.log('PDF documentation generated successfully!');
  console.log('Path:', outputPath);
  console.log('Size:', stats.size, 'bytes');
  console.log('Total Pages:', totalPages);
});

