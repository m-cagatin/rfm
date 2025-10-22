# Customer Ordering System - Hybrid Cart Implementation

## Overview

Build end-to-end customer ordering with **hybrid cart strategy**: Guest users use localStorage, logged-in users get database-backed cart with cross-device persistence and cart merging on login.

## Prerequisites ✅

- Customer accounts table and auth system
- Product catalog with real products (2+ items)
- Admin product management working
- Cloudinary image integration

---

## Hybrid Cart Strategy

```
GUEST USER (Not Logged In):
├─ Cart stored in localStorage only
├─ Temporary, browser-specific
└─ On login → Merge to database

LOGGED-IN USER:
├─ Cart stored in database (cart_items table)
├─ Syncs across devices
├─ Persists even after logout
└─ At checkout → Convert to order, clear cart
```

---

## Complete System Data Flow Diagram

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                    GUEST USER FLOW (Not Logged In)                        ║
╚═══════════════════════════════════════════════════════════════════════════╝

Step 1: BROWSE PRODUCTS
┌──────────────┐      GET /api/catalog      ┌──────────────┐      ┌──────────┐
│ Guest User   │ ────────────────────────> │   Backend    │ ───> │ Database │
│  /apparel    │                             │     API      │      │ catalog_ │
│              │ <──────────────────────── │              │ <─── │ clothing │
└──────────────┘   Returns: Product List    └──────────────┘      └──────────┘
                   [                                               (2 products)
                     {
                       product_id: 1,
                       product_name: "Plain White T-shirt",
                       base_price: 120.00,
                       image_url: "cloudinary..."
                     },
                     {
                       product_id: 2,
                       product_name: "black t-shirt",
                       base_price: 130.00
                     }
                   ]

                              ↓

Step 2: ADD TO CART (Guest - localStorage only)
┌──────────────┐   Click "Add to Cart"      ┌──────────────┐
│ Guest User   │ ────────────────────────> │ Cart Service │
│              │                             │  (Frontend)  │
└──────────────┘                            └──────────────┘
                                                   ↓
                                            Check: isLoggedIn? → NO
                                                   ↓
                                            ┌──────────────────┐
                                            │  localStorage    │
                                            │  'guestCart'     │
                                            └──────────────────┘
                                            [
                                              {
                                                product_id: 1,
                                                product_name: "Plain White T-shirt",
                                                quantity: 2,
                                                size: "L",
                                                unit_price: 120.00,
                                                customization: {...}
                                              }
                                            ]

                              ↓

Step 3: GUEST TRIES TO CHECKOUT
┌──────────────┐   Click "Checkout"         ┌──────────────┐
│ Guest User   │ ────────────────────────> │   Checkout   │
│              │                             │  Component   │
└──────────────┘                            └──────────────┘
                                                   ↓
                                            Check: isLoggedIn? → NO
                                                   ↓
                                            ┌──────────────────┐
                                            │  Redirect to     │
                                            │  /login          │
                                            └──────────────────┘
                                            "Please login to checkout"

═══════════════════════════════════════════════════════════════════════════

╔═══════════════════════════════════════════════════════════════════════════╗
║                    USER LOGS IN (Cart Merge)                              ║
╚═══════════════════════════════════════════════════════════════════════════╝

Step 4: LOGIN & CART MERGE
┌──────────────┐   POST /api/auth/login     ┌──────────────┐
│    User      │   { email, password }      │   Backend    │
│  /login      │ ────────────────────────> │   Auth API   │
└──────────────┘                            └──────────────┘
                                                   ↓
                                            Verify credentials
                                                   ↓
┌──────────────┐   Returns: Success         ┌──────────────┐
│ Login Page   │ <──────────────────────── │              │
│              │   { token, user }          │              │
└──────────────┘   customer_id: 5           └──────────────┘
       ↓
   Save user & token
       ↓
┌──────────────────────────────────────────────────────────────┐
│  Cart Merge Logic (Frontend)                                 │
│  1. Check localStorage for 'guestCart'                       │
│  2. If exists → POST /api/cart/merge                         │
└──────────────────────────────────────────────────────────────┘
       ↓
┌──────────────┐   POST /api/cart/merge     ┌──────────────┐
│ Cart Service │   { items: [...] }         │   Backend    │
│              │ ────────────────────────> │   Cart API   │
└──────────────┘                            └──────────────┘
                                                   ↓
                                            ┌─────────────────────────┐
                                            │ For each guest item:    │
                                            │ INSERT INTO cart_items  │
                                            │   customer_id: 5        │
                                            │   product_id: 1         │
                                            │   quantity: 2           │
                                            │   size: "L"             │
                                            │   customization: {...}  │
                                            └─────────────────────────┘
                                                   ↓
┌──────────────┐   Returns: Success         ┌──────────────┐
│ Cart Service │ <──────────────────────── │   Backend    │
│              │   { merged: true }         │              │
└──────────────┘                            └──────────────┘
       ↓
   Clear localStorage 'guestCart'
   Load cart from database

═══════════════════════════════════════════════════════════════════════════

╔═══════════════════════════════════════════════════════════════════════════╗
║                    LOGGED-IN USER FLOW                                    ║
╚═══════════════════════════════════════════════════════════════════════════╝

Step 5: ADD TO CART (Logged In - Database)
┌──────────────┐   Click "Add to Cart"      ┌──────────────┐
│ Logged User  │ ────────────────────────> │ Cart Service │
│ customer_id:5│                             │  (Frontend)  │
└──────────────┘                            └──────────────┘
                                                   ↓
                                            Check: isLoggedIn? → YES
                                                   ↓
                  POST /api/cart
                  {
                    product_id: 2,
                    quantity: 3,
                    size: "XL",
                    color: "Black",
                    unit_price: 130.00,
                    customization_data: {...}
                  }
                                                   ↓
                                            ┌──────────────┐      ┌──────────┐
                                            │   Backend    │ ───> │ Database │
                                            │   Cart API   │      │  cart_   │
                                            │              │      │  items   │
                                            └──────────────┘      └──────────┘
                                                                  INSERT:
                                                                  customer_id: 5
                                                                  product_id: 2
                                                                  quantity: 3

                              ↓

Step 6: VIEW CART (Synced Across Devices)
┌──────────────┐   GET /api/cart            ┌──────────────┐      ┌──────────┐
│ Logged User  │ ────────────────────────> │   Backend    │ ───> │ Database │
│ Any device   │                             │   Cart API   │      │  cart_   │
│              │ <──────────────────────── │              │ <─── │  items   │
└──────────────┘   Returns: Cart Items      └──────────────┘      └──────────┘
   /cart page      [                                              WHERE
                     {                                            customer_id=5
                       cart_item_id: 1,
                       product_id: 1,
                       product_name: "Plain White T-shirt",
                       quantity: 2,
                       unit_price: 120.00,
                       subtotal: 240.00
                     },
                     {
                       cart_item_id: 2,
                       product_id: 2,
                       product_name: "black t-shirt",
                       quantity: 3,
                       unit_price: 130.00,
                       subtotal: 390.00
                     }
                   ]
                   Total: 630.00

                              ↓

Step 7: CHECKOUT
┌──────────────┐   Navigate to /checkout    ┌──────────────┐
│ Logged User  │ ────────────────────────> │   Checkout   │
│              │                             │  Component   │
└──────────────┘                            └──────────────┘
                                                   ↓
                                            Check: isLoggedIn? → YES
                                                   ↓
                                            ┌──────────────────────────┐
                                            │ Multi-Step Form:         │
                                            │ 1. Contact Info (prefill)│
                                            │    - Name: "Juan D.C."   │
                                            │    - Email: "juan@..."   │
                                            │    - Phone: "+639..."    │
                                            │ 2. Delivery Address      │
                                            │ 3. Order Review          │
                                            │    Show cart items       │
                                            │    Total: 630.00         │
                                            │ 4. Place Order Button    │
                                            └──────────────────────────┘

                              ↓

Step 8: CREATE ORDER
┌──────────────┐   POST /api/orders         ┌──────────────┐
│   Checkout   │ ────────────────────────> │   Backend    │
│  Component   │   {                        │  Order API   │
└──────────────┘     customer_id: 5,        └──────────────┘
                     customer_name: "...",          ↓
                     customer_email: "...",   ┌──────────────┐
                     customer_address: "...", │ Order Service│
                     total_amount: 630.00     └──────────────┘
                   }                                 ↓
                                            generateOrderRef()
                                            → "ORD-001"
                                                     ↓
                                            ┌────────────────────────────────┐
                                            │   DATABASE TRANSACTIONS:       │
                                            │                                │
                                            │ 1. Fetch cart_items            │
                                            │    WHERE customer_id = 5       │
                                            │                                │
                                            │ 2. INSERT into orders:         │
                                            │    order_ref: "ORD-001"        │
                                            │    customer_id: 5              │
                                            │    status: "pending"           │
                                            │    total_amount: 630.00        │
                                            │    → order_id: 1               │
                                            │                                │
                                            │ 3. For each cart_item:         │
                                            │    INSERT into order_items:    │
                                            │    - order_id: 1               │
                                            │    - product_id: 1             │
                                            │    - quantity: 2               │
                                            │    - unit_price: 120.00        │
                                            │    - subtotal: 240.00          │
                                            │    - customization_data: {...} │
                                            │                                │
                                            │ 4. DELETE from cart_items      │
                                            │    WHERE customer_id = 5       │
                                            │    (Clear cart after order)    │
                                            └────────────────────────────────┘
                                                     ↓
┌──────────────┐   Returns: Success         ┌──────────────┐
│ Confirmation │ <──────────────────────── │   Backend    │
│     Page     │   {                        │     API      │
└──────────────┘     order_ref: "ORD-001",  └──────────────┘
                     order_id: 1,
  "Order ORD-001       status: "pending"
   successfully        }
   placed!"

═══════════════════════════════════════════════════════════════════════════

╔═══════════════════════════════════════════════════════════════════════════╗
║                    ADMIN PRODUCTION MANAGEMENT                            ║
╚═══════════════════════════════════════════════════════════════════════════╝

Step 9: ADMIN VIEWS ORDERS (Kanban Board)
┌──────────────┐   GET /api/orders          ┌──────────────┐      ┌──────────┐
│    Admin     │ ────────────────────────> │   Backend    │ ───> │ Database │
│  /admin/     │                             │  Order API   │      │  orders  │
│   orders     │ <──────────────────────── │              │ <─── │  JOIN    │
└──────────────┘   Returns: All Orders       └──────────────┘      │order_items
                   [                                               └──────────┘
                     {
                       order_ref: "ORD-001",
                       customer_name: "Juan Dela Cruz",
                       status: "pending",
                       qty: 5,  // Sum of all items
                       total_amount: 630.00,
                       order_date: "2025-10-21"
                     }
                   ]
                              ↓
                              
        KANBAN BOARD DISPLAY (Production Flow)
        ┌──────────────────────────────────────────────────────────────────┐
        │Pending│Designing│Ripping│Heatpress│Cutting│Assembly│ QC │ Done │
        ├───────┼─────────┼───────┼─────────┼───────┼────────┼────┼──────┤
        │       │         │       │         │       │        │    │      │
        │ORD-001│         │       │         │       │        │    │      │
        │Juan DC│         │       │         │       │        │    │      │
        │Qty: 5 │         │       │         │       │        │    │      │
        │₱630   │         │       │         │       │        │    │      │
        │       │         │       │         │       │        │    │      │
        └───────┴─────────┴───────┴─────────┴───────┴────────┴────┴──────┘

                              ↓

Step 10: ADMIN MOVES ORDER (Drag & Drop)
┌──────────────┐   Drag "ORD-001" card      ┌──────────────┐
│    Admin     │   from "Pending"           │   Kanban     │
│              │   to "Designing"           │  Component   │
│              │ ────────────────────────> │  onDrop()    │
└──────────────┘                            └──────────────┘
                                                   ↓
                  PATCH /api/orders/1/status
                  { status: "designing" }
                                                   ↓
                                            ┌──────────────┐      ┌──────────┐
                                            │   Backend    │ ───> │ Database │
                                            │  Order API   │      │  orders  │
                                            │              │      │  UPDATE  │
                                            └──────────────┘      └──────────┘
                                                                  SET status
                                                                  = "designing"
                                                                  WHERE
                                                                  order_id = 1

═══════════════════════════════════════════════════════════════════════════

╔═══════════════════════════════════════════════════════════════════════════╗
║                    CUSTOMER TRACKS ORDER                                  ║
╚═══════════════════════════════════════════════════════════════════════════╝

Step 11: VIEW ORDER STATUS
┌──────────────┐   GET /api/orders/         ┌──────────────┐      ┌──────────┐
│   Customer   │   customer/5               │   Backend    │ ───> │ Database │
│  /my-orders  │ ────────────────────────> │  Order API   │      │  orders  │
│              │                             │              │      │  JOIN    │
│              │ <──────────────────────── │              │ <─── │order_items
└──────────────┘   Returns: Order History   └──────────────┘      └──────────┘
                   [                                               WHERE
                     {                                             customer_id=5
                       order_ref: "ORD-001",
                       status: "designing",  ← Updated status!
                       order_date: "2025-10-21",
                       total_amount: 630.00,
                       items: [
                         {
                           product_name: "Plain White T-shirt",
                           quantity: 2,
                           unit_price: 120.00
                         },
                         {
                           product_name: "black t-shirt",
                           quantity: 3,
                           unit_price: 130.00
                         }
                       ]
                     }
                   ]

═══════════════════════════════════════════════════════════════════════════

DATABASE SCHEMA & RELATIONSHIPS:

customer_accounts                cart_items                orders
┌──────────────┐               ┌──────────────┐         ┌──────────────┐
│ CustomerId PK│◄──────────┬───│cart_item_id PK       │ order_id PK  │
│ CustomerEmail│           │   │customer_id FK│       │ order_ref    │
│ FullName     │           │   │product_id FK │       │customer_id FK│
│ Phone        │           │   │quantity      │       │ status       │
│ PasswordHash │           │   │size, color   │       │ total_amount │
│ Address      │           │   │unit_price    │       │ order_date   │
└──────────────┘           │   │custom_data   │       └──────────────┘
        │                  │   └──────────────┘              │
        │                  │          │                      │
        │                  └──────────┼──────────────────────┘
        │                             │
        │                             ↓
        │                  catalog_clothing         order_items
        │                  ┌──────────────┐       ┌──────────────┐
        └──────────────────│product_id PK │◄──────│ item_id PK   │
                          │product_name  │       │ order_id FK  │
                          │category      │       │ product_id FK│
                          │base_price    │       │ quantity     │
                          │image_url     │       │ unit_price   │
                          │cloudinary_id │       │ subtotal     │
                          └──────────────┘       │ custom_data  │
                                                 └──────────────┘

CART LIFECYCLE:
1. Guest adds to cart → localStorage
2. User logs in → cart_items table (merge)
3. User checks out → orders + order_items (convert)
4. Cart cleared → DELETE from cart_items
```

---

## Phase 1: Database Schema

### Tables to Create

**1. `cart_items` (Hybrid Cart - NEW)**
```sql
CREATE TABLE cart_items (
  cart_item_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  size VARCHAR(20),
  color VARCHAR(50),
  unit_price DECIMAL(10, 2) NOT NULL,
  customization_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_customer_id (customer_id),
  UNIQUE KEY unique_cart_item (customer_id, product_id, size, color),
  FOREIGN KEY (customer_id) REFERENCES customer_accounts(CustomerId) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES catalog_clothing(product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**2. `orders`**
```sql
CREATE TABLE orders (
  order_id INT AUTO_INCREMENT PRIMARY KEY,
  order_ref VARCHAR(50) UNIQUE NOT NULL,
  customer_id INT NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  customer_address TEXT,
  total_amount DECIMAL(10, 2) NOT NULL,
  status ENUM('pending', 'designing', 'ripping', 'heatpress', 'cutting', 'assembly', 'qc', 'done', 'cancelled') DEFAULT 'pending',
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  estimated_completion DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_customer_id (customer_id),
  INDEX idx_status (status),
  FOREIGN KEY (customer_id) REFERENCES customer_accounts(CustomerId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**3. `order_items`**
```sql
CREATE TABLE order_items (
  item_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  size VARCHAR(20),
  color VARCHAR(50),
  unit_price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  customization_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES catalog_clothing(product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**File:** `backend/src/config/database.ts`

---

## Phase 2: Backend - Cart API

### Create Cart Service
**File:** `backend/src/services/cart.service.ts`

Methods:
- `getCart(customerId)` - Get all cart items for customer
- `addToCart(customerId, item)` - Add/update cart item
- `removeFromCart(customerId, cartItemId)` - Remove item
- `updateQuantity(customerId, cartItemId, quantity)` - Update qty
- `clearCart(customerId)` - Empty cart
- `mergeGuestCart(customerId, guestItems[])` - Merge localStorage cart on login

### Create Cart Routes
**File:** `backend/src/routes/cart.routes.ts`

Endpoints:
- `GET /api/cart` - Get logged-in user's cart (requires auth)
- `POST /api/cart` - Add item to cart (requires auth)
- `PUT /api/cart/:itemId` - Update cart item quantity (requires auth)
- `DELETE /api/cart/:itemId` - Remove from cart (requires auth)
- `DELETE /api/cart` - Clear entire cart (requires auth)
- `POST /api/cart/merge` - Merge guest cart on login (requires auth)

**Register in:** `backend/src/server.ts`

---

## Phase 3: Backend - Order API

### Create Order Service
**File:** `backend/src/services/order.service.ts`

Methods:
- `generateOrderRef()` - Generate unique ref (ORD-001, ORD-002...)
- `createOrder(orderData)` - Create order from cart
- `getOrders(filters)` - Get all orders (admin)
- `getOrder(orderId)` - Get single order with items
- `getCustomerOrders(customerId)` - Customer's order history
- `updateOrderStatus(orderId, status)` - For Kanban drag
- `cancelOrder(orderId)` - Cancel order

### Create Order Routes
**File:** `backend/src/routes/orders.routes.ts`

Endpoints:
- `POST /api/orders` - Create order from cart (requires auth)
- `GET /api/orders` - Get all orders (admin only)
- `GET /api/orders/:id` - Get order details
- `GET /api/orders/customer/:customerId` - Customer orders (requires auth)
- `PATCH /api/orders/:id/status` - Update status (admin)
- `PUT /api/orders/:id` - Update order (admin)
- `DELETE /api/orders/:id` - Cancel order

**Register in:** `backend/src/server.ts`

---

## Phase 4: Frontend - Product Catalog

### Update Apparel Component
**File:** `src/app/components/apparel/apparel.ts`

Features:
- Inject `HttpClient` and `CartService`
- Fetch products from `GET /api/catalog`
- Display in grid with `*ngFor`
- "Add to Cart" button → calls cart service

**File:** `src/app/components/apparel/apparel.html`

Replace placeholders with real product cards

---

## Phase 5: Frontend - Hybrid Cart Service

### Create Cart Service
**File:** `src/app/services/cart.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class CartService {
  private cartItems = signal<CartItem[]>([]);
  private isLoggedIn = computed(() => authService.isAuthenticated());
  
  // For guest users
  private loadFromLocalStorage() { ... }
  private saveToLocalStorage() { ... }
  
  // For logged-in users
  private loadFromDatabase() {
    return http.get('/api/cart');
  }
  
  addToCart(item) {
    if (isLoggedIn()) {
      // POST /api/cart
    } else {
      // Save to localStorage
    }
  }
  
  // On login: merge guest cart
  mergeCartOnLogin() {
    const guestCart = localStorage.getItem('guestCart');
    if (guestCart && isLoggedIn()) {
      http.post('/api/cart/merge', { items: JSON.parse(guestCart) })
        .subscribe(() => {
          localStorage.removeItem('guestCart');
          this.loadFromDatabase();
        });
    }
  }
}
```

---

## Phase 6: Frontend - Cart Component

### Update Cart Component
**File:** `src/app/components/cart/cart.ts`

Features:
- Inject `CartService` and `AuthService`
- Display cart items from signal
- Quantity controls (+ / -)
- Remove button
- Show total
- "Proceed to Checkout" button (requires login)

**File:** `src/app/components/cart/cart.html`

Build cart UI with item list, totals, checkout button

---

## Phase 7: Frontend - Checkout

### Create Checkout Component
**Files:** `src/app/components/checkout/`

Multi-step form:
1. Verify login (redirect if not)
2. Contact info (pre-fill from customer account)
3. Delivery address
4. Order review (show cart items)
5. Place order button

On submit:
- POST `/api/orders` with cart data
- Backend creates order, clears cart_items
- Navigate to confirmation page

**Add route:** `src/app/app.routes.ts`
```typescript
{ path: 'checkout', component: CheckoutComponent, canActivate: [AuthGuard] }
```

---

## Phase 8: Customer Order History

### Create My Orders Component
**Files:** `src/app/components/my-orders/`

Features:
- Fetch `GET /api/orders/customer/:customerId`
- Display order list with status badges
- "View Details" per order
- Filter by status

**Add route:**
```typescript
{ path: 'my-orders', component: MyOrdersComponent, canActivate: [AuthGuard] }
```

---

## Phase 9: Customization Integration

### Update Customization Component
**File:** `src/app/components/customization/customization.ts`

Update `addToCart()`:
```typescript
addToCart() {
  const customizationData = {
    shirtColor: this.selectedShirtColor(),
    uploadedImageUrl: this.uploadedImageUrl(),
    textOptions: this.currentTextOptions(),
    selectedTemplate: this.selectedTemplate()
  };
  
  cartService.addToCart({
    product_id: selectedProduct.id,
    customization_data: customizationData,
    ...
  });
}
```

---

## Phase 10: Admin Kanban Integration

### Update Admin Orders Component
**File:** `src/app/components/admin/orders/orders.ts`

Changes:
- Replace mock data with `GET /api/orders`
- `onDrop()` → `PATCH /api/orders/:id/status`
- Show order details modal on card click
- Display real customer data and quantities

---

## Phase 11: Auth Integration (Cart Merge)

### Update Login Component
**File:** `src/app/components/login/login.ts`

After successful login:
```typescript
authService.login(email, password).subscribe({
  next: (response) => {
    cartService.mergeCartOnLogin(); // ← Merge guest cart
    router.navigate(['/']);
  }
});
```

---

## Database Relationships

```
customer_accounts ──┬──> cart_items (active cart)
                     └──> orders ──> order_items (past orders)

catalog_clothing ────┬──> cart_items
                     └──> order_items
```

---

## Key Files

**Backend:**
- `backend/src/config/database.ts` - Add 3 tables
- `backend/src/services/cart.service.ts` - NEW
- `backend/src/services/order.service.ts` - NEW
- `backend/src/routes/cart.routes.ts` - NEW
- `backend/src/routes/orders.routes.ts` - NEW
- `backend/src/server.ts` - Register routes

**Frontend:**
- `src/app/services/cart.service.ts` - NEW (hybrid logic)
- `src/app/components/apparel/apparel.ts` - Update
- `src/app/components/cart/cart.ts` - Update
- `src/app/components/checkout/` - NEW
- `src/app/components/my-orders/` - NEW
- `src/app/components/customization/customization.ts` - Update
- `src/app/components/login/login.ts` - Add merge call
- `src/app/components/admin/orders/orders.ts` - Update
