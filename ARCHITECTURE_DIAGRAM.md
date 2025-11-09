# 🏗️ RFM SYSTEM ARCHITECTURE

## 📊 High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER (Browser)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │           Angular 20 Frontend (Port 4200)                    │   │
│  │                                                               │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │   │
│  │  │  Public  │  │ Customer │  │  Admin   │  │  Canvas  │   │   │
│  │  │  Pages   │  │  Pages   │  │Dashboard │  │ Designer │   │   │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │   │
│  │       │             │              │              │          │   │
│  │       └─────────────┴──────────────┴──────────────┘          │   │
│  │                          │                                    │   │
│  │                  ┌───────▼────────┐                          │   │
│  │                  │   Services      │                          │   │
│  │                  │ (HTTP, Auth,    │                          │   │
│  │                  │  Cart, Canvas)  │                          │   │
│  │                  └───────┬────────┘                          │   │
│  │                          │                                    │   │
│  └──────────────────────────┼───────────────────────────────────┘   │
│                              │                                        │
└──────────────────────────────┼────────────────────────────────────┘
                               │
                        HTTP/REST API
                        + JWT Token
                               │
┌──────────────────────────────▼────────────────────────────────────┐
│                      SERVER LAYER (Node.js)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │      Express.js Backend API (Port 3001)                      │   │
│  │                                                               │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │              Middleware Layer                         │   │   │
│  │  │  • CORS Handler                                       │   │   │
│  │  │  • Body Parser (JSON, 50MB limit)                    │   │   │
│  │  │  • JWT Authentication (authenticateToken)            │   │   │
│  │  │  • Admin Role Check (requireAdmin)                   │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                          │                                    │   │
│  │  ┌───────────────────────▼──────────────────────────────┐   │   │
│  │  │              Route Handlers                           │   │   │
│  │  │                                                        │   │   │
│  │  │  /api/auth          - Authentication                  │   │   │
│  │  │  /api/canvas        - Canvas designs                  │   │   │
│  │  │  /api/catalog       - Product catalog                 │   │   │
│  │  │  /api/customizable-products - Design templates       │   │   │
│  │  │  /api/cart          - Shopping cart                   │   │   │
│  │  │  /api/orders        - Order management                │   │   │
│  │  │  /api/payment       - Payment processing              │   │   │
│  │  │  /api/users         - User/Employee CRUD              │   │   │
│  │  │  /api/inventory     - Stock management                │   │   │
│  │  │  /api/cloudinary    - Image upload                    │   │   │
│  │  │                                                        │   │   │
│  │  └───────────────────────┬──────────────────────────────┘   │   │
│  │                          │                                    │   │
│  │  ┌───────────────────────▼──────────────────────────────┐   │   │
│  │  │              Service Layer                            │   │   │
│  │  │                                                        │   │   │
│  │  │  • AuthService     - User authentication             │   │   │
│  │  │  • CartService     - Cart business logic             │   │   │
│  │  │  • OrderService    - Order workflows                 │   │   │
│  │  │  • PayMongoService - Payment integration             │   │   │
│  │  │  • CloudinaryService - Image management              │   │   │
│  │  │  • JwtService      - Token generation                │   │   │
│  │  │  • EmailService    - Notifications (planned)         │   │   │
│  │  │                                                        │   │   │
│  │  └───────────────────────┬──────────────────────────────┘   │   │
│  │                          │                                    │   │
│  └──────────────────────────┼───────────────────────────────────┘   │
│                              │                                        │
└──────────────────────────────┼────────────────────────────────────┘
                               │
                        SQL Queries
                               │
┌──────────────────────────────▼────────────────────────────────────┐
│                      DATABASE LAYER (MySQL)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │        MySQL 8.0+ on Aiven Cloud                            │   │
│  │        (rfmdb-euniquecorn.d.aivencloud.com:28152)           │   │
│  │                                                               │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │              Core Tables                              │   │   │
│  │  │                                                        │   │   │
│  │  │  customer_accounts      - Customer authentication     │   │   │
│  │  │  Users                  - Admin/employee accounts     │   │   │
│  │  │  catalog_clothing       - Product catalog             │   │   │
│  │  │  customizable_products  - Design templates            │   │   │
│  │  │  customizable_product_images - Product images         │   │   │
│  │  │  cart_items             - Shopping cart               │   │   │
│  │  │  orders                 - Customer orders             │   │   │
│  │  │  order_items            - Order line items            │   │   │
│  │  │  payments               - Payment tracking            │   │   │
│  │  │  canvases               - Canvas designs              │   │   │
│  │  │  texture_variants       - Texture variations          │   │   │
│  │  │  customizable_product_stock - Inventory              │   │   │
│  │  │                                                        │   │   │
│  │  └────────────────────────────────────────────────────────┘   │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
└───────────────────────────────────────────────────────────────────┘

```

---

## 🔄 Authentication Flow

```
┌──────────┐                    ┌──────────┐                    ┌──────────┐
│          │                    │          │                    │          │
│  Client  │                    │  Backend │                    │ Database │
│ (Angular)│                    │ (Express)│                    │  (MySQL) │
│          │                    │          │                    │          │
└────┬─────┘                    └────┬─────┘                    └────┬─────┘
     │                               │                               │
     │  POST /api/auth/login         │                               │
     │  {email, password}            │                               │
     ├──────────────────────────────►│                               │
     │                               │                               │
     │                               │  Check customer_accounts      │
     │                               │  or Users table               │
     │                               ├──────────────────────────────►│
     │                               │                               │
     │                               │  User record + hashed password│
     │                               │◄──────────────────────────────┤
     │                               │                               │
     │                               │  bcrypt.compare(password)     │
     │                               │  ✅ Password valid            │
     │                               │                               │
     │                               │  Generate JWT token           │
     │                               │  {userId, email, role}        │
     │                               │  Expires: 24 hours            │
     │                               │                               │
     │  {success: true, token, user} │                               │
     │◄──────────────────────────────┤                               │
     │                               │                               │
     │  Store token in localStorage  │                               │
     │  Key: "authToken"             │                               │
     │                               │                               │
     │                               │                               │
     │  Subsequent API requests      │                               │
     │  Header: Authorization:       │                               │
     │         Bearer <token>        │                               │
     ├──────────────────────────────►│                               │
     │                               │                               │
     │                               │  authenticateToken middleware │
     │                               │  jwt.verify(token, JWT_SECRET)│
     │                               │  ✅ Token valid               │
     │                               │                               │
     │                               │  Attach user to req.user      │
     │                               │  Continue to route handler    │
     │                               │                               │
     │  Protected resource data      │                               │
     │◄──────────────────────────────┤                               │
     │                               │                               │
```

---

## 🛒 Shopping Cart Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                         GUEST USER                                    │
└──────────────────────────────────────────────────────────────────────┘
                               │
                               │  Add items to cart
                               ▼
                    ┌──────────────────────┐
                    │  localStorage cart    │
                    │  (temporary storage)  │
                    └──────────────────────┘
                               │
                               │  User logs in
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      AUTHENTICATED USER                               │
└──────────────────────────────────────────────────────────────────────┘
                               │
                               │  POST /api/cart/merge
                               ▼
                    ┌──────────────────────┐
                    │   Backend merges:    │
                    │   • localStorage cart │
                    │   • Database cart     │
                    └──────────────────────┘
                               │
                               │  Merged cart saved
                               ▼
                    ┌──────────────────────┐
                    │   cart_items table   │
                    │   (persistent)        │
                    └──────────────────────┘
                               │
                               │  GET /api/cart
                               ▼
                    ┌──────────────────────┐
                    │  Display cart items  │
                    └──────────────────────┘
                               │
                               │  User logs out
                               ▼
                    ┌──────────────────────┐
                    │  Clear localStorage   │
                    │  (security measure)   │
                    └──────────────────────┘
```

---

## 📦 Order Processing Flow

```
┌─────────────┐
│   CUSTOMER  │
└──────┬──────┘
       │
       │  1. Add items to cart
       ▼
┌─────────────────┐
│   Shopping Cart │
└──────┬──────────┘
       │
       │  2. Proceed to checkout
       ▼
┌─────────────────┐
│  Checkout Page  │
│  • Fill address │
│  • Add notes    │
└──────┬──────────┘
       │
       │  3. POST /api/orders
       ▼
┌─────────────────────────────────────────────────────────┐
│  Backend creates order                                   │
│  • Status: payment_pending                               │
│  • Generate order_ref (ORD-20251107-001)                │
│  • Copy cart items to order_items                        │
│  • Calculate total_amount                                │
└──────┬──────────────────────────────────────────────────┘
       │
       │  4. POST /api/payment/create-link
       ▼
┌─────────────────────────────────────────────────────────┐
│  PayMongo creates payment link                          │
│  • Amount: order total                                   │
│  • Description: Order #ORD-20251107-001                 │
│  • Returns: payment link URL                             │
└──────┬──────────────────────────────────────────────────┘
       │
       │  5. Customer redirected to PayMongo
       ▼
┌─────────────────┐
│  PayMongo Page  │
│  • GCash        │
│  • PayMaya      │
│  • Cards        │
│  • Banking      │
└──────┬──────────┘
       │
       │  6. Customer completes payment
       ▼
┌─────────────────────────────────────────────────────────┐
│  Payment webhook (future implementation)                │
│  • Update order status: pending                          │
│  • Update payment status: paid                           │
└──────┬──────────────────────────────────────────────────┘
       │
       │  7. Admin verifies payment
       ▼
┌─────────────────────────────────────────────────────────┐
│  Admin Payment Verification Dashboard                    │
│  • View payment proof                                    │
│  • Approve/Reject                                        │
└──────┬──────────────────────────────────────────────────┘
       │
       │  8. Order enters production
       ▼
┌─────────────────────────────────────────────────────────┐
│  Production Workflow                                     │
│                                                           │
│  pending     → Order queued                              │
│     ↓                                                     │
│  designing   → Design team creates artwork               │
│     ↓                                                     │
│  ripping     → Screen print film creation                │
│     ↓                                                     │
│  heatpress   → Heat press application                    │
│     ↓                                                     │
│  cutting     → Fabric cutting                            │
│     ↓                                                     │
│  assembly    → Sewing and assembly                       │
│     ↓                                                     │
│  qc          → Quality control inspection                │
│     ↓                                                     │
│  done        → Ready for pickup/delivery                 │
│                                                           │
└──────┬──────────────────────────────────────────────────┘
       │
       │  9. Customer notified (future: email)
       ▼
┌─────────────────┐
│  Order Complete │
└─────────────────┘
```

---

## 🎨 Canvas Designer Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Customization Component                           │
│                    (customization.ts)                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    UI Panels (Fixed Position)                │   │
│  │                                                               │   │
│  │  ┌───────────┐  ┌──────────────┐  ┌─────────────┐          │   │
│  │  │   Tools   │  │   Product    │  │    Zoom     │          │   │
│  │  │   Panel   │  │   Info Panel │  │   Controls  │          │   │
│  │  │           │  │              │  │             │          │   │
│  │  │ • Text    │  │ • Type       │  │ • Zoom In   │          │   │
│  │  │ • Upload  │  │ • Neckline   │  │ • Zoom Out  │          │   │
│  │  │ • Graphics│  │ • Size       │  │ • Reset     │          │   │
│  │  │ • Template│  │ • Color      │  │ • %Display  │          │   │
│  │  │ • Pattern │  │ • Print Area │  │             │          │   │
│  │  │           │  │ • Cost       │  │             │          │   │
│  │  └───────────┘  └──────────────┘  └─────────────┘          │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              Canvas Container (CSS Transform)                │   │
│  │              [style.transform]="'scale(' + zoom + ')'"       │   │
│  │                                                               │   │
│  │    ┌───────────────────────────────────────────────────┐    │   │
│  │    │        Fabric.js Canvas Element                    │    │   │
│  │    │                                                     │    │   │
│  │    │  ┌─────────────────────────────────────────────┐  │    │   │
│  │    │  │          T-Shirt Print Area                 │  │    │   │
│  │    │  │                                              │  │    │   │
│  │    │  │   • Text objects                            │  │    │   │
│  │    │  │   • Image objects                           │  │    │   │
│  │    │  │   • Graphics objects                        │  │    │   │
│  │    │  │   • Background patterns                     │  │    │   │
│  │    │  │                                              │  │    │   │
│  │    │  │   All managed by Fabric.js                  │  │    │   │
│  │    │  │                                              │  │    │   │
│  │    │  └─────────────────────────────────────────────┘  │    │   │
│  │    │                                                     │    │   │
│  │    └───────────────────────────────────────────────────┘    │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│                             │                                         │
│                             ▼                                         │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Canvas Service                            │   │
│  │                  (canvas.service.ts)                         │   │
│  │                                                               │   │
│  │  • Fabric.js wrapper                                         │   │
│  │  • Object management (add, delete, modify)                   │   │
│  │  • Zoom state (BehaviorSubject)                              │   │
│  │  • Font loading (Google Fonts)                               │   │
│  │  • Export (JSON, PNG)                                        │   │
│  │  • Undo/Redo stack                                           │   │
│  │  • Event handlers                                            │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
└───────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      Data Flow                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  User Action → Component → Canvas Service → Fabric.js Canvas        │
│                                                                       │
│  Example: Add Text                                                   │
│  ┌─────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐         │
│  │ Click   │──►│Component │──►│ Service  │──►│ Fabric.js│         │
│  │ "Text"  │   │addText() │   │addText() │   │add(text) │         │
│  └─────────┘   └──────────┘   └──────────┘   └──────────┘         │
│                                                                       │
│  Example: Zoom In                                                    │
│  ┌─────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐         │
│  │ Click   │──►│Component │──►│ Service  │──►│Signal    │         │
│  │ "+Zoom" │   │zoomIn()  │   │zoomIn()  │   │update    │         │
│  └─────────┘   └──────────┘   └──────────┘   └──────────┘         │
│                                       │                               │
│                                       ▼                               │
│                              ┌──────────────┐                        │
│                              │  Observable  │                        │
│                              │canvasScale$  │                        │
│                              └──────┬───────┘                        │
│                                     │                                 │
│                                     ▼                                 │
│                              ┌──────────────┐                        │
│                              │  Component   │                        │
│                              │ subscribes   │                        │
│                              └──────┬───────┘                        │
│                                     │                                 │
│                                     ▼                                 │
│                              ┌──────────────┐                        │
│                              │ CSS transform│                        │
│                              │ applied      │                        │
│                              └──────────────┘                        │
│                                                                       │
└───────────────────────────────────────────────────────────────────┘
```

---

## 🔌 External Service Integration

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RFM Backend                                   │
└──────────────┬───────────────────────┬──────────────────────────────┘
               │                       │
               │                       │
               ▼                       ▼
    ┌──────────────────┐    ┌──────────────────┐
    │    PayMongo      │    │   Cloudinary     │
    │                  │    │                  │
    │  • Test Mode     │    │  • Cloud Name:   │
    │  • Public Key    │    │    dpvrv7btt     │
    │  • Secret Key    │    │  • Upload Preset │
    │                  │    │  • Image CDN     │
    │  Payment Methods:│    │                  │
    │  • GCash         │    │  Use Cases:      │
    │  • PayMaya       │    │  • Product images│
    │  • Cards         │    │  • User uploads  │
    │  • Banking       │    │  • Payment proof │
    │  • OTC           │    │                  │
    │                  │    │                  │
    └──────────────────┘    └──────────────────┘
```

---

## 💾 Database Relationships

```
customer_accounts (1) ────┬──── (N) cart_items
                          │
                          └──── (N) orders
                                   │
                                   ├──── (N) order_items
                                   │
                                   └──── (1) payments


Users (1) ────── (N) payments.verified_by


catalog_clothing (1) ────┬──── (N) cart_items
                         │
                         └──── (N) order_items


customizable_products (1) ────┬──── (N) customizable_product_images
                              │
                              ├──── (N) texture_variants
                              │
                              └──── (N) customizable_product_stock


┌────────────────────────────────────────────────────────────────┐
│  Foreign Key Constraints                                        │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  cart_items.customer_id       → customer_accounts.CustomerId   │
│  cart_items.product_id        → catalog_clothing.product_id    │
│                                                                  │
│  orders.customer_id           → customer_accounts.CustomerId   │
│  orders.payment_id            → payments.payment_id            │
│                                                                  │
│  order_items.order_id         → orders.order_id                │
│  order_items.product_id       → catalog_clothing.product_id    │
│                                                                  │
│  payments.order_id            → orders.order_id                │
│  payments.verified_by         → Users.UserId                   │
│                                                                  │
│  customizable_product_images  → customizable_products.id       │
│  texture_variants             → customizable_products.id       │
│  customizable_product_stock   → customizable_products.id       │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Security Layers                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  1. Transport Security                                               │
│     • SSL/TLS (Aiven MySQL requires SSL certificate)                │
│     • HTTPS (production deployment)                                  │
│                                                                       │
│  2. Authentication                                                   │
│     • JWT tokens (HS256 algorithm)                                   │
│     • Token expiration: 24 hours                                     │
│     • Bcrypt password hashing (10 rounds)                            │
│                                                                       │
│  3. Authorization                                                    │
│     • Role-based access control (customer vs employee)               │
│     • Route guards (AuthGuard, AdminGuard)                           │
│     • Middleware checks (authenticateToken, requireAdmin)            │
│                                                                       │
│  4. Data Validation                                                  │
│     • Input sanitization                                             │
│     • Email format validation                                        │
│     • Password strength requirements (min 6 chars)                   │
│     • SQL injection prevention (parameterized queries)               │
│                                                                       │
│  5. CORS Policy                                                      │
│     • Whitelisted origins only                                       │
│     • Credentials allowed for authenticated requests                 │
│                                                                       │
│  6. Session Management                                               │
│     • Token stored in localStorage (client-side)                     │
│     • Automatic token refresh (planned)                              │
│     • Logout clears all client data                                  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

**Created:** November 7, 2025  
**Purpose:** Visual architecture reference for RFM project  
**Related Docs:** PROJECT_COMPREHENSIVE_OVERVIEW.md
