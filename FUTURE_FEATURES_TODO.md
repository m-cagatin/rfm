# Future Features & Unimplemented Functionality

This document tracks database tables, features, and functionality that exist in the system but are not yet implemented or connected to the UI/business logic.

---

## 📦 Inventory Management System

### Status: **NOT IMPLEMENTED**

### Database Tables (Existing but Unused):
- `customizable_product_stock` - Tracks inventory per product/size/color combination

### Table Schema:
```sql
customizable_product_stock (
  id INT PRIMARY KEY,
  product_id INT,
  size VARCHAR(50),
  color VARCHAR(100),
  quantity INT DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### What Needs to Be Built:

#### 1. Admin Panel - Inventory Management UI
- [ ] Add "Stock Management" section to customizable product form
- [ ] Create a matrix/grid input for entering quantities per size/color combo
- [ ] Display current stock levels when editing products
- [ ] Add bulk stock update functionality
- [ ] Low stock warning indicators

#### 2. Backend API Endpoints
- [ ] `POST /api/customizable-products/:id/stock` - Add/update stock entries
- [ ] `GET /api/customizable-products/:id/stock` - Retrieve current stock levels
- [ ] `PUT /api/customizable-products/:id/stock/:stockId` - Update specific stock entry
- [ ] `DELETE /api/customizable-products/:id/stock/:stockId` - Remove stock entry

#### 3. Customer-Facing Features
- [ ] Show "In Stock" / "Out of Stock" badges on product pages
- [ ] Display available quantity for each size/color
- [ ] Prevent adding out-of-stock items to cart
- [ ] Show "Only X left!" warnings for low stock items
- [ ] Auto-disable size/color options when out of stock

#### 4. Order Processing Integration
- [ ] Automatically deduct stock quantities when order is placed
- [ ] Restore stock quantities when order is cancelled/refunded
- [ ] Queue system for handling concurrent orders
- [ ] Stock reservation during checkout process

#### 5. Inventory Analytics & Reporting
- [ ] Dashboard showing low stock alerts
- [ ] Stock movement history (additions, sales, adjustments)
- [ ] Bestselling size/color combinations report
- [ ] Inventory turnover metrics
- [ ] Restock recommendations based on sales velocity

### Current System Behavior:
- **Made-to-Order Model**: Products are treated as always available
- No inventory tracking or stock limitations
- Suitable for print-on-demand business model

### Benefits of Implementation:
- ✅ Prevent overselling and customer disappointment
- ✅ Better inventory planning and purchasing decisions
- ✅ Accurate financial reporting
- ✅ Reduced waste from overproduction
- ✅ Data-driven restocking strategies

---

## 📝 Other Future Enhancements

### Product Features
- [ ] Product variants with different pricing (e.g., premium fabrics)
- [ ] Bulk pricing tiers (discounts for larger orders)
- [ ] Seasonal/promotional pricing schedules
- [ ] Product bundles and packages
- [ ] Product reviews and ratings

### Media Management
- [ ] Video uploads for product demonstrations
- [ ] 360° product view images
- [ ] Customer uploaded photos (user-generated content)
- [ ] Image optimization and lazy loading
- [ ] CDN integration for faster image delivery

### Customization Features
- [ ] Live preview of customer designs on product mockups
- [ ] Design templates library
- [ ] Advanced text customization (fonts, effects, positioning)
- [ ] Multi-color printing options
- [ ] Design approval workflow

### Business Intelligence
- [ ] Sales analytics dashboard
- [ ] Customer behavior tracking
- [ ] A/B testing for product pages
- [ ] Conversion funnel analysis
- [ ] Abandoned cart recovery

### Integration & Automation
- [ ] Third-party fulfillment service integration
- [ ] Automated supplier ordering
- [ ] Shipping carrier API integration
- [ ] Accounting software sync
- [ ] Email marketing platform integration

---

## 🗓️ Implementation Priority

### High Priority (Q1 2026)
1. Inventory Management System (if moving away from made-to-order model)
2. Product reviews and ratings
3. Sales analytics dashboard

### Medium Priority (Q2-Q3 2026)
1. Live design preview
2. Bulk pricing tiers
3. Email marketing integration

### Low Priority (Q4 2026+)
1. 360° product views
2. Advanced design tools
3. Fulfillment service integration

---

**Last Updated:** November 2, 2025  
**Maintained By:** Development Team
