# 📚 RFM PROJECT - QUICK REFERENCE GUIDE

**Last Updated:** November 7, 2025  
**For:** Quick lookups during development

---

## 🚀 Quick Start Commands

### Start Backend Server
```powershell
cd backend
npm start
# Runs on http://localhost:3001
```

### Start Frontend App
```powershell
npm start
# or
ng serve
# Runs on http://localhost:4200
```

### Database Connection Test
```powershell
cd backend
node check-env.js
```

---

## 🔑 Environment Variables Quick Reference

### Backend (.env)
```env
# Database
DB_HOST=rfmdb-euniquecorn.d.aivencloud.com
DB_PORT=28152
DB_USER=Marcc
DB_PASSWORD=Marcc1234
DB_NAME=rfm_db

# Server
PORT=3001
API_BASE_URL=http://localhost:3001/api

# Auth
JWT_SECRET=rfm_custom_apparel_super_secret_key_2025

# PayMongo
PAYMONGO_TEST_PUBLIC_KEY=pk_test_audkMFM3pnGwLBbGz6HpQHfD
PAYMONGO_TEST_SECRET_KEY=sk_test_Z8qnVvJSzPkawgA4BLhGbhLj
PAYMENT_MODE=test

# Cloudinary
CLOUDINARY_CLOUD_NAME=dpvrv7btt
CLOUDINARY_API_KEY=425947453244552
CLOUDINARY_UPLOAD_PRESET=rfm_uploads
```

### Frontend (environment.ts)
```typescript
api: {
  baseUrl: 'http://localhost:3001/api'
}
```

---

## 🔐 Test Credentials

### Customer Login
```
Email: test@customer.com
Password: password123
```

### Admin Login
```
Email: admin@rfm.com
Password: admin123
```

### Sample Employee Accounts
```
mikjhoncarreon@gmail.com  - Ripper, Designer
leoespinosa@gmail.com     - Seamster, Cutter
bgoutlookph@gmail.com     - Designer, HT Operator
test@rfm-prints.com       - Cutter
```

---

## 📊 Database Tables Quick Reference

### User Tables
| Table | Purpose | Primary Key |
|-------|---------|-------------|
| `customer_accounts` | Customer authentication | `CustomerId` |
| `Users` | Admin/employee accounts | `UserId` |

### Product Tables
| Table | Purpose | Primary Key |
|-------|---------|-------------|
| `catalog_clothing` | Product catalog | `product_id` |
| `customizable_products` | Design templates | `id` |
| `customizable_product_images` | Product images | `image_id` |
| `texture_variants` | Texture variations | `id` |
| `customizable_product_stock` | Inventory | `id` |

### Order Tables
| Table | Purpose | Primary Key |
|-------|---------|-------------|
| `cart_items` | Shopping cart | `cart_item_id` |
| `orders` | Customer orders | `order_id` |
| `order_items` | Order line items | `item_id` |
| `payments` | Payment tracking | `payment_id` |

### Other Tables
| Table | Purpose | Primary Key |
|-------|---------|-------------|
| `canvases` | Canvas designs | `id` |

---

## 🛣️ API Endpoints Quick Reference

### Authentication
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
```

### Products
```
GET    /api/catalog                      # All products
GET    /api/catalog/:id                  # Single product
GET    /api/customizable-products        # Design templates
GET    /api/customizable-products/:id
```

### Cart & Orders
```
GET    /api/cart                         # Get cart
POST   /api/cart                         # Add to cart
PUT    /api/cart/:itemId                 # Update quantity
DELETE /api/cart/:itemId                 # Remove item
POST   /api/orders                       # Create order
GET    /api/orders/customer/:customerId  # Customer orders
```

### Admin
```
GET    /api/users                        # All employees
GET    /api/orders                       # All orders
PATCH  /api/orders/:id/status            # Update status
POST   /api/payment/verify               # Verify payment
```

---

## 🎨 Canvas Designer Methods

### Canvas Service (canvas.service.ts)

#### Text Operations
```typescript
addText(text: string, options?: any)
updateTextProperties(fontFamily, fontSize, fontWeight, etc.)
setTextAlignment(alignment: 'left' | 'center' | 'right')
```

#### Image Operations
```typescript
addImageFromUrl(imageUrl: string)
addImageFromFile(file: File)
```

#### Object Operations
```typescript
deleteSelected()
clearCanvas()
getObjects(): fabric.Object[]
```

#### Zoom Operations
```typescript
zoomIn()                    // Increase zoom by 10%
zoomOut()                   // Decrease zoom by 10%
setScale(scale: number)     // Set specific zoom level
getScale(): number          // Get current zoom level
canvasScale$                // Observable for zoom changes
```

#### Export Operations
```typescript
exportAsJSON()              // Get canvas as JSON
exportAsPNG()               // Download as PNG
```

---

## 🎯 Component Navigation

### Customer Flow
```
Landing Page → Catalog → Product Details → Designer → Cart → Checkout → Order History
```

### Admin Flow
```
Login → Admin Dashboard → (Orders | Products | Employees | Payments | Reports)
```

---

## 🔄 Order Status Enum

```typescript
type OrderStatus = 
  | 'payment_pending'  // Awaiting payment
  | 'pending'          // Payment confirmed, queued
  | 'designing'        // Design team working
  | 'ripping'          // Creating screen films
  | 'heatpress'        // Heat press application
  | 'cutting'          // Fabric cutting
  | 'assembly'         // Sewing
  | 'qc'               // Quality control
  | 'done'             // Complete
  | 'cancelled';       // Cancelled
```

---

## 🎨 Print Area Presets

```typescript
const printAreaPresets = [
  { 
    id: 'small', 
    label: 'Small (12" × 16")', 
    width: 300, 
    height: 400, 
    description: 'Chest print' 
  },
  { 
    id: 'medium', 
    label: 'Medium (16" × 20")', 
    width: 400, 
    height: 500, 
    description: 'Standard' 
  },
  { 
    id: 'large', 
    label: 'Large (18" × 24")', 
    width: 450, 
    height: 600, 
    description: 'Full front' 
  },
  { 
    id: 'oversized', 
    label: 'Oversized (20" × 28")', 
    width: 500, 
    height: 700, 
    description: 'All-over' 
  }
];
```

---

## 🎨 Size Pricing Tiers

```typescript
const sizePricing = {
  'S': 450,
  'M': 500,
  'L': 550,
  'XL': 600,
  'XXL': 650,
  'XXXL': 700,
  'XXXXL': 750,
  // Kids sizes
  'K6': 400,
  'K7': 400,
  'K8': 450,
  'K9': 450,
  'K10': 500
};
```

---

## 🚨 Common Issues & Solutions

### Issue: Database connection failed
**Solution:**
1. Check if SSL certificate exists: `backend/certs/ca.pem`
2. Verify .env database credentials
3. Test with: `cd backend && node check-env.js`

### Issue: CORS error
**Solution:**
1. Check backend CORS configuration in `server.ts`
2. Ensure frontend is running on `http://localhost:4200`
3. Backend should allow origin: `http://localhost:4200`

### Issue: JWT authentication failing
**Solution:**
1. Check if `JWT_SECRET` is set in backend `.env`
2. Verify token is stored in localStorage as `authToken`
3. Check token expiration (24 hours)

### Issue: Cart not loading after login
**Solution:**
1. Check `cart.service.ts` subscription to auth changes
2. Verify `GET /api/cart` endpoint is authenticated
3. Clear localStorage and login again

### Issue: Zoom not working
**Solution:**
1. Check if `canvasScale$` subscription is active
2. Verify `[style.transform]` binding in template
3. Ensure `.tshirt-canvas` container exists

### Issue: Payment link creation failing
**Solution:**
1. Verify PayMongo test keys in `.env`
2. Check `PAYMENT_MODE=test`
3. Test with: `cd backend && npm run test-paymongo`

---

## 📁 File Location Quick Reference

### Frontend
```
Components:    src/app/components/
Services:      src/app/services/
Guards:        src/app/guards/
Routes:        src/app/app.routes.ts
Environment:   src/environments/environment.ts
```

### Backend
```
Server:        backend/src/server.ts
Routes:        backend/src/routes/
Services:      backend/src/services/
Middleware:    backend/src/middleware/
Database:      backend/src/config/database.ts
Migrations:    backend/migrations/
```

---

## 🐛 Debug Mode

### Enable Backend Logging
```typescript
// In server.ts, add:
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
```

### Enable Frontend Logging
```typescript
// In component, add:
ngOnInit() {
  console.log('Component initialized');
  console.log('Current user:', this.authService.currentUser());
}
```

### Check Database Query
```typescript
// In route handler, add:
console.log('SQL Query:', query);
console.log('Parameters:', params);
```

---

## 🔍 Useful Database Queries

### Check cart items
```sql
SELECT * FROM cart_items WHERE customer_id = ?;
```

### Check orders
```sql
SELECT * FROM orders WHERE customer_id = ? ORDER BY order_date DESC;
```

### Check payment status
```sql
SELECT o.order_ref, p.payment_status, p.amount 
FROM orders o 
LEFT JOIN payments p ON o.payment_id = p.payment_id 
WHERE o.order_id = ?;
```

### Check product stock
```sql
SELECT * FROM customizable_product_stock WHERE product_id = ?;
```

### Check user roles
```sql
SELECT Email, Roles FROM Users WHERE Status = 'Active';
```

---

## 🎯 Next Implementation Priorities

### Week 1: Enhanced Zoom
- [ ] Zoom to cursor position
- [ ] Keyboard shortcuts (Ctrl+Plus/Minus/0)
- [ ] Manual zoom percentage input
- [ ] Preset zoom buttons
- [ ] Pan mode (Space + drag)

### Week 2: Layer Management
- [ ] Layers panel UI
- [ ] Layer reordering (bring to front/back)
- [ ] Lock/unlock layers
- [ ] Layer visibility toggle
- [ ] Layer naming

### Week 3: Inventory System
- [ ] Inventory management UI
- [ ] Stock tracking
- [ ] Low stock alerts
- [ ] Inventory reports
- [ ] Integration with orders

### Week 4: Email Notifications
- [ ] Set up email service
- [ ] Order confirmation emails
- [ ] Status update emails
- [ ] Payment confirmation emails
- [ ] Admin alerts

---

## 📞 Quick Links

- **Local Frontend:** http://localhost:4200
- **Local Backend API:** http://localhost:3001
- **API Docs:** http://localhost:3001
- **Database:** rfmdb-euniquecorn.d.aivencloud.com:28152
- **Cloudinary Dashboard:** https://cloudinary.com/console
- **PayMongo Dashboard:** https://dashboard.paymongo.com/

---

## 📝 Git Workflow

### Current Branch
```bash
admin-dev
```

### Common Commands
```bash
# Check status
git status

# Stage changes
git add .

# Commit
git commit -m "feat: description"

# Push
git push origin admin-dev

# Pull latest
git pull origin admin-dev
```

### Commit Message Convention
```
feat: Add new feature
fix: Bug fix
docs: Documentation update
style: Code style changes
refactor: Code refactoring
test: Add tests
chore: Maintenance tasks
```

---

**Created:** November 7, 2025  
**Purpose:** Quick reference for common tasks  
**Related Docs:** 
- PROJECT_COMPREHENSIVE_OVERVIEW.md
- ARCHITECTURE_DIAGRAM.md
- CONTEXT_SUMMARY_FOR_NEW_CHAT.md
