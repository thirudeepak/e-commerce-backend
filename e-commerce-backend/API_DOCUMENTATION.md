# E-Commerce Backend API Documentation

Base URL: `http://localhost:5000/api`

## Authentication

All protected endpoints require an HTTP `Authorization` header formatted as:
```http
Authorization: Bearer <your_jwt_token>
```

### Roles & RBAC Matrix

| Role | Description |
|---|---|
| `ADMIN` | Full administrative control across products, users, all orders, and analytics. |
| `SALES_PERSON` | Can manage and sell own products, view sales orders and seller dashboard. |
| `USER` | Customer: view products, manage cart/wishlist, checkout with Razorpay, view own orders. |

---

## 1. Authentication APIs (`/api/auth`)

### 1.1 Register User
- **Method:** `POST`
- **URL:** `/api/auth/register`
- **Access:** Public
- **Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password123!",
  "role": "USER"
}
```
*Note: `role` can be `ADMIN`, `SALES_PERSON`, or `USER` (defaults to `USER`).*

- **Success Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "e96f1837-56e6-4fa2-be91-443e26bbbb05",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "USER",
      "createdAt": "2026-11-13T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```
- **Error Responses:**
  - `409 Conflict`: `{"success": false, "message": "Email is already registered.", "data": null}`
  - `422 Unprocessable Entity`: Validation failure details.

---

### 1.2 User / Admin / Seller Login
- **Method:** `POST`
- **URL:** `/api/auth/login`
- **Access:** Public
- **Request Body:**
```json
{
  "email": "john@example.com",
  "password": "Password123!"
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "e96f1837-56e6-4fa2-be91-443e26bbbb05",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "USER",
      "createdAt": "2026-11-13T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```
- **Error Responses:**
  - `401 Unauthorized`: `{"success": false, "message": "Invalid email or password.", "data": null}`

---

### 1.3 Get Current Profile
- **Method:** `GET`
- **URL:** `/api/auth/me`
- **Access:** Authenticated (Any role)
- **Headers:** `Authorization: Bearer <token>`
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "id": "e96f1837-56e6-4fa2-be91-443e26bbbb05",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER",
    "address": "123 Indiranagar 100ft Road, Bengaluru, Karnataka 560038",
    "isActive": true,
    "createdAt": "2026-11-13T12:00:00.000Z",
    "updatedAt": "2026-11-13T12:00:00.000Z",
    "roleDetails": {
      "id": "8432a1db-e326-42bc-9d06-930438cf199c",
      "name": "USER",
      "description": "Retail Customer purchasing goods"
    }
  }
}
```

---

### 1.4 Update Current Profile & Shipping Address
- **Method:** `PUT`
- **URL:** `/api/auth/profile` *(alias: `/api/auth/me`)*
- **Access:** Authenticated (Any role; primarily used by `USER` to set default shipping address)
- **Headers:** `Authorization: Bearer <token>`
- **Request Body (all fields optional):**
```json
{
  "name": "John Doe",
  "address": "Flat 402, Green Glen Layout, Bellandur, Bengaluru, Karnataka 560103"
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "e96f1837-56e6-4fa2-be91-443e26bbbb05",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER",
    "address": "Flat 402, Green Glen Layout, Bellandur, Bengaluru, Karnataka 560103",
    "isActive": true,
    "createdAt": "2026-11-13T12:00:00.000Z",
    "updatedAt": "2026-11-14T10:30:00.000Z",
    "roleDetails": {
      "id": "8432a1db-e326-42bc-9d06-930438cf199c",
      "name": "USER",
      "description": "Retail Customer purchasing goods"
    }
  }
}
```
- **Error Responses:**
  - `422 Unprocessable Entity`: Validation failure on name length or address formatting.

---

### 1.5 View User Profile by ID
- **Method:** `GET`
- **URL:** `/api/auth/view/:id` *(alias: `/api/auth/users/:id`)*
- **Access:** Authenticated (Owner User viewing their own profile, or `ADMIN`)
- **Headers:** `Authorization: Bearer <token>`
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "id": "e96f1837-56e6-4fa2-be91-443e26bbbb05",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER",
    "address": "Flat 402, Green Glen Layout, Bellandur, Bengaluru, Karnataka 560103",
    "isActive": true,
    "createdAt": "2026-11-13T12:00:00.000Z",
    "updatedAt": "2026-11-14T10:30:00.000Z",
    "roleDetails": {
      "id": "8432a1db-e326-42bc-9d06-930438cf199c",
      "name": "USER",
      "description": "Retail Customer purchasing goods"
    }
  }
}
```
- **Error Responses:**
  - `403 Forbidden`: `{"success": false, "message": "Access denied: You can only view your own user profile.", "data": null}`
  - `404 Not Found`: `{"success": false, "message": "User not found.", "data": null}`

---

### 1.6 Admin Create User (RBAC Governance)
- **Method:** `POST`
- **URL:** `/api/auth/admin/create-user`
- **Access:** Authenticated (`ADMIN` only)
- **Headers:** `Authorization: Bearer <admin_token>`
- **Request Body:**
```json
{
  "name": "Apex Partner Store",
  "email": "partner@ecommerce.com",
  "password": "Password123!",
  "role": "SALES_PERSON",
  "isActive": true
}
```
*Note: Allows Admin to register any user directly with role `ADMIN`, `SALES_PERSON`, or `USER` and link role permissions.*

- **Success Response (201 Created):**
```json
{
  "success": true,
  "message": "User created successfully with RBAC role",
  "data": {
    "id": "2d04ac35-6e01-4368-b121-eef026d2da34",
    "name": "Apex Partner Store",
    "email": "partner@ecommerce.com",
    "role": "SALES_PERSON",
    "isActive": true,
    "createdAt": "2026-11-14T00:00:00.000Z",
    "roleDetails": {
      "id": "7662c1db-d326-42bc-9d06-930438cf199c",
      "name": "SALES_PERSON",
      "description": "Retail Merchant / Shop Owner selling products"
    }
  }
}
```

---

## 2. Product Management APIs (`/api/products`)

### 2.1 List Products
- **Method:** `GET`
- **URL:** `/api/products`
- **Access:** Public
- **Query Parameters:**
  - `page` (optional, default: `1`)
  - `limit` (optional, default: `10`, max: `100`)
  - `search` (optional, case-insensitive keyword search matching across `name`, `description`, and `category`)
  - `category` (optional, filter by specific category string e.g. `Electronics`, `Audio`, or omit for all)
  - `minPrice` (optional, numeric lower bound filter: `price >= minPrice`)
  - `maxPrice` (optional, numeric upper bound filter: `price <= maxPrice`)
  - `ownerId` (optional, UUID filter to retrieve products belonging to a specific seller)
  - `sortBy` (optional, `createdAt`, `updatedAt`, `price`, `name`, `stock`, default: `createdAt`)
  - `sortOrder` (optional, `ASC` or `DESC`, default: `DESC`)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": {
    "products": [
      {
        "id": "d1d86d64-eef9-40eb-9c17-9154f3ce92a8",
        "name": "Wireless Noise Canceling Headphones",
        "description": "High fidelity over-ear headphones.",
        "price": "149.99",
        "stock": 25,
        "category": "Electronics",
        "ownerId": "f784e6ba-8b8a-4411-9a72-749e4912953e",
        "images": [
          {
            "url": "https://res.cloudinary.com/demo/image/upload/v12345/prod1.jpg",
            "publicId": "ecommerce/products/abc123xyz"
          }
        ],
        "isActive": true,
        "createdAt": "2026-11-13T12:05:00.000Z",
        "owner": {
          "id": "f784e6ba-8b8a-4411-9a72-749e4912953e",
          "name": "Seller One",
          "email": "seller@example.com"
        }
      }
    ],
    "total": 1,
    "page": 1,
    "totalPages": 1
  }
}
```

---

### 2.2 Get Single Product
- **Method:** `GET`
- **URL:** `/api/products/:id`
- **Access:** Public
- **Success Response (200 OK):** Single product object matching above schema.
- **Error Response (404 Not Found):** `{"success": false, "message": "Product not found.", "data": null}`

---

### 2.3 Create Product
- **Method:** `POST`
- **URL:** `/api/products`
- **Access:** Authenticated (`ADMIN` or `SALES_PERSON`)
- **Headers:** `Authorization: Bearer <token>`, `Content-Type: multipart/form-data`
- **Form Data:**
  - `name`: `Wireless Noise Canceling Headphones`
  - `description`: `Premium audio with 30-hour battery life.`
  - `price`: `149.99`
  - `stock`: `50`
  - `category`: `Electronics`
  - `images`: (up to 5 image files: JPEG, PNG, or WEBP)
- **Success Response (201 Created):** Returns created product with Cloudinary URLs and public IDs.

---

### 2.4 Update Product
- **Method:** `PUT`
- **URL:** `/api/products/:id`
- **Access:** Authenticated (`ADMIN` or owner `SALES_PERSON`)
- **Headers:** `Authorization: Bearer <token>`, `Content-Type: multipart/form-data`
- **Form Data (optional fields):**
  - `name`, `description`, `price`, `stock`, `category`
  - `removeImageIds`: array or JSON string of public IDs to delete from Cloudinary
  - `images`: new image files to append
- **Success Response (200 OK):** Returns updated product.

---

### 2.5 Delete Product
- **Method:** `DELETE`
- **URL:** `/api/products/:id`
- **Access:** Authenticated (`ADMIN` or owner `SALES_PERSON`)
- **Headers:** `Authorization: Bearer <token>`
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Product deleted successfully.",
  "data": null
}
```

---

## 3. Shopping Cart APIs (`/api/cart`)

All cart endpoints require `Authorization: Bearer <token>` and are **strictly restricted to the `USER` role** via `allowRoles('USER')`. Requests made with `ADMIN` or `SALES_PERSON` tokens are denied with `403 Forbidden`.

### 3.1 Get User Cart
- **Method:** `GET`
- **URL:** `/api/cart`
- **Access:** Authenticated (`USER` only)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Cart retrieved successfully",
  "data": {
    "cartId": "48b64b15-9c94-4d1a-be00-e74f358df852",
    "userId": "e96f1837-56e6-4fa2-be91-443e26bbbb05",
    "items": [
      {
        "id": "7662c1db-d326-42bc-9d06-930438cf199c",
        "productId": "d1d86d64-eef9-40eb-9c17-9154f3ce92a8",
        "product": { ... },
        "quantity": 2,
        "price": 149.99,
        "subtotal": 299.98
      }
    ],
    "totalItems": 2,
    "subtotal": 299.98,
    "totalAmount": 299.98
  }
}
```

---

### 3.2 Add Product to Cart
- **Method:** `POST`
- **URL:** `/api/cart/add`
- **Access:** Authenticated (`USER` only)
- **Request Body:**
```json
{
  "productId": "d1d86d64-eef9-40eb-9c17-9154f3ce92a8",
  "quantity": 2
}
```
*Note: If product already exists in cart, quantity is safely incremented after validating available stock.*

---

### 3.3 Update Cart Item Quantity
- **Method:** `PUT`
- **URL:** `/api/cart/item/:id`
- **Access:** Authenticated (`USER` only)
- **Request Body:**
```json
{
  "quantity": 3
}
```

---

### 3.4 Remove Item from Cart
- **Method:** `DELETE`
- **URL:** `/api/cart/item/:id`
- **Access:** Authenticated (`USER` only)

---

### 3.5 Clear Cart
- **Method:** `DELETE`
- **URL:** `/api/cart/clear`
- **Access:** Authenticated (`USER` only)

---

## 4. Wishlist APIs (`/api/wishlist`)

All wishlist endpoints require `Authorization: Bearer <token>` and are **strictly restricted to the `USER` role** via `allowRoles('USER')`. Requests made with `ADMIN` or `SALES_PERSON` tokens are denied with `403 Forbidden`.

### 4.1 Get Wishlist
- **Method:** `GET`
- **URL:** `/api/wishlist`
- **Access:** Authenticated (`USER` only)

---

### 4.2 Add Product to Wishlist
- **Method:** `POST`
- **URL:** `/api/wishlist/add`
- **Access:** Authenticated (`USER` only)
- **Request Body:**
```json
{
  "productId": "d1d86d64-eef9-40eb-9c17-9154f3ce92a8"
}
```
*Duplicate prevention is automatically enforced (returns 409 if already in wishlist).*

---

### 4.3 Remove Product from Wishlist
- **Method:** `DELETE`
- **URL:** `/api/wishlist/item/:productId`
- **Access:** Authenticated (`USER` only)

---

### 4.4 Clear Wishlist
- **Method:** `DELETE`
- **URL:** `/api/wishlist/clear`
- **Access:** Authenticated (`USER` only)

---

## 5. Razorpay Payments (`/api/payments`)

### 5.1 Create Razorpay Order
- **Method:** `POST`
- **URL:** `/api/payments/create-order`
- **Access:** Authenticated (`USER` only)
- **Description:** Reads user's cart, calculates total from server-side database prices, verifies stock, and creates an official Razorpay Order.
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Razorpay order created successfully",
  "data": {
    "razorpayOrderId": "order_EKf345lX9500A",
    "amount": 29998,
    "currency": "INR",
    "keyId": "rzp_test_YourKeyId",
    "totalAmount": 299.98
  }
}
```

---

### 5.2 Verify Payment & Place Order
- **Method:** `POST`
- **URL:** `/api/payments/verify`
- **Access:** Authenticated (`USER` only)
- **Request Body:**
```json
{
  "razorpayOrderId": "order_EKf345lX9500A",
  "razorpayPaymentId": "pay_29QQoUBcxQtv4w",
  "razorpaySignature": "9ef4ff4d844aa47719d9407702f23246816008ab9d0ec0e722a4f494950e309f",
  "deliveryAddress": "Flat 402, Green Glen Layout, Bengaluru 560103"
}
```
*Note: `deliveryAddress` is optional. If provided in the request body, it is stored on the order snapshot. If omitted, the backend automatically retrieves and attaches the user's registered delivery address from their profile.*

- **Description:**
  1. Computes `HMAC-SHA256(razorpayOrderId + "|" + razorpayPaymentId, RAZORPAY_KEY_SECRET)`
  2. Verifies cryptographic signature.
  3. Executes an ACID database transaction:
     - Locks product rows (`SELECT ... FOR UPDATE`)
     - Confirms stock and decrements inventory
     - Resolves shipping address (from request or fallback to user's saved profile address)
     - Creates `Order` with `paymentStatus = "PAID"`, `orderStatus = "CONFIRMED"`, and `deliveryAddress` snapshot
     - Creates immutable `OrderItem` snapshots with `sellerId`, `productName`, `price`, `subtotal`
     - Clears the user's cart
  4. Triggers asynchronous **Nodemailer** order confirmation email:
     - Formats responsive HTML email receipt with order details, itemized table, totals in INR, and delivery address.
     - Sends directly to customer's email address.
     - Automatically appends a hidden `BCC` copy to the store administrator (`SMTP_USER`) to guarantee instant delivery visibility during testing.
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Payment verified and order placed successfully",
  "data": {
    "id": "7b88df12-2c67-4e92-a160-5a39626b9112",
    "userId": "e96f1837-56e6-4fa2-be91-443e26bbbb05",
    "totalAmount": 299.98,
    "deliveryAddress": "Flat 402, Green Glen Layout, Bengaluru 560103",
    "paymentStatus": "PAID",
    "orderStatus": "CONFIRMED",
    "razorpayOrderId": "order_EKf345lX9500A",
    "razorpayPaymentId": "pay_29QQoUBcxQtv4w",
    "createdAt": "2026-11-14T10:35:00.000Z",
    "items": [
      {
        "id": "cf6d9341-3b7c-47bc-86f7-b8f9e6129841",
        "orderId": "7b88df12-2c67-4e92-a160-5a39626b9112",
        "productId": "d1d86d64-eef9-40eb-9c17-9154f3ce92a8",
        "sellerId": "f784e6ba-8b8a-4411-9a72-749e4912953e",
        "productName": "Wireless Noise Canceling Headphones",
        "quantity": 2,
        "price": 149.99,
        "subtotal": 299.98
      }
    ]
  }
}
```

---

### 5.3 Webhook Handling
- **Method:** `POST`
- **URL:** `/api/payments/webhook`
- **Headers:** `x-razorpay-signature: <signature>`
- **Access:** Public (cryptographically verified with `RAZORPAY_WEBHOOK_SECRET`)

---

## 6. Order Management APIs (`/api/orders`)

### 6.1 View My Orders
- **Method:** `GET`
- **URL:** `/api/orders/my?page=1&limit=10`
- **Access:** Authenticated Customer (`USER` only)
- **Description:** Returns paginated list of orders placed by the authenticated customer, including `deliveryAddress`, line items, and payment/fulfillment statuses.

---

### 6.2 View Seller-Related Orders
- **Method:** `GET`
- **URL:** `/api/orders/seller?page=1&limit=10`
- **Access:** Authenticated `SALES_PERSON` or `ADMIN`
- **Description:** Returns line items and parent order metadata (including shipping address) for products owned by this seller.

---

### 6.3 View All Orders (Platform-Wide)
- **Method:** `GET`
- **URL:** `/api/orders/all?page=1&limit=10&orderStatus=CONFIRMED&paymentStatus=PAID`
- **Access:** Authenticated `ADMIN`
- **Description:** Returns all orders across all customers with user profiles, shipping addresses, and full item snapshots.

---

### 6.4 View Single Order by ID
- **Method:** `GET`
- **URL:** `/api/orders/:id`
- **Access:** Authenticated (Owner User, Seller who has items in it, or Admin)
- **Returns:** Single order object containing `deliveryAddress`, line items, seller details, and customer info.

---

### 6.5 Update Order Status
- **Method:** `PUT`
- **URL:** `/api/orders/:id/status`
- **Access:** Authenticated `ADMIN`
- **Request Body:**
```json
{
  "status": "PROCESSING"
}
```
*Allowed statuses: `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`.*

---

## 7. Role-Based Dashboards (`/api/dashboard`)

### 7.1 Admin Dashboard
- **Method:** `GET`
- **URL:** `/api/dashboard/admin`
- **Access:** Authenticated `ADMIN`
- **Returns:**
  - `totalUsers`
  - `totalSalesPersons`
  - `totalProducts`
  - `totalOrders`
  - `totalRevenue` (sum of paid orders)
  - `bankAccount`:
    - `dailyBankBalance`: Today's settled/paid order revenue
    - `totalBankBalance`: Cumulative platform settled revenue
    - `pendingSettlements`: Unsettled pending volume
    - `currency`: Currency code (`INR`)
    - `lastSettlementCheck`: Timestamp
  - `statusSummary` (breakdown by orderStatus)
  - `recentOrders` (last 5 orders with items, buyers, and delivery addresses)

---

### 7.2 Sales Person Dashboard
- **Method:** `GET`
- **URL:** `/api/dashboard/sales` *(alias: `/api/dashboard/seller`)*
- **Access:** Authenticated `SALES_PERSON` (or `ADMIN`)
- **Returns:**
  - `totalProductsOwned`
  - `totalItemsSold`
  - `totalSalesRevenue` (revenue generated by their products)
  - `recentSoldItems`

---

### 7.3 User Dashboard
- **Method:** `GET`
- **URL:** `/api/dashboard/user`
- **Access:** Authenticated (Customer)
- **Returns:**
  - `totalOrders`
  - `totalSpent`
  - `recentOrders`

