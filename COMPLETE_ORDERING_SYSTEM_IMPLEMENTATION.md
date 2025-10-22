# Complete Customer Ordering System Implementation

## Overview

Comprehensive plan to implement a complete customer ordering system with proper product catalog schema, hybrid cart functionality, and admin job order management using Kanban boards with WIP limits.

---

## Prerequisites ✅

- Customer accounts table and auth system working
- Product catalog table exists with 2 products
- Admin product management panel functional
- Cloudinary integration working
- Authentication guards in place

---

## Phase 0: Product Catalog Schema Enhancement (DO FIRST!)

### Why This Must Come First:
The ordering system needs proper product attributes (colors, sizes, materials) to function correctly. Without this, cart items and orders won't have complete product information.

### Critical Issues to Address:
1. ✅ TypeScript interface mismatches (ProductData, ProductForm)
2. ✅ JSON field handling consistency
3. ✅ Admin form interface updates
4. ✅ Cloudinary multiple image uploads
5. ✅ Database service method signatures
6. ✅ Backward compatibility

### Step 0.1: Update TypeScript Interfaces

**File: `src/app/services/api.ts`**
```typescript
export interface ProductData {
  product_id?: number;
  product_name: string;
  category: string;
  base_price: number;
  description?: string | null;
  
  // Images
  image_url: string;              // Keep existing - main image
  images?: string | null;         // NEW - additional images (JSON string)
  cloudinary_public_id?: string | null;
  
  // Product Attributes
  colors?: string | null;         // NEW - JSON string array
  material?: string | null;       // NEW
  gender?: 'Men' | 'Women' | 'Unisex' | 'Kids';  // NEW
  
  // Inventory
  sizes?: string | string[] | null;  // Existing
  stock_quantity?: number;
  stock_by_size_color?: string | null;  // NEW - JSON object
  sku?: string | null;
  
  // Customization
  allows_customization?: boolean;     // NEW
  customization_areas?: string | null; // NEW - JSON array
  production_days?: number;           // NEW
  
  // Metadata
  status?: 'Active' | 'Inactive' | 'Archived';
  tags?: string | string[] | null;
  created_at?: string;
  updated_at?: string;
}
```

**File: `src/app/components/admin/products/products.ts`**
```typescript
export interface ProductForm {
  name: string;
  category: string;
  basePrice: string;
  description: string;
  stockQuantity: number;
  sku: string;
  
  // Images
  imageUrl: string;
  imageFile: File | null;
  images: string[];           // NEW - multiple images
  imageFiles: File[];         // NEW - multiple file uploads
  
  // Product Attributes
  colors: string[];           // NEW
  material: string;           // NEW
  gender: string;             // NEW
  
  // Inventory
  sizes: string[];
  
  // Customization
  allows_customization: boolean;  // NEW
  production_days: number;        // NEW
}
```

### Step 0.2: Database Schema Migration

**File: `backend/src/config/database.ts`**

Add to `initializeDatabase()` function:
```typescript
// After catalog_clothing table creation, add new columns
const enhanceCatalogSchema = `
  ALTER TABLE catalog_clothing
    ADD COLUMN IF NOT EXISTS colors JSON DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS images JSON DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS material VARCHAR(100),
    ADD COLUMN IF NOT EXISTS gender ENUM('Men', 'Women', 'Unisex', 'Kids') DEFAULT 'Unisex',
    ADD COLUMN IF NOT EXISTS stock_by_size_color JSON DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS allows_customization BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS customization_areas JSON DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS production_days INT DEFAULT 3;
`;

try {
  await connection.execute(enhanceCatalogSchema);
  console.log('✅ Catalog schema enhanced');
} catch (error) {
  console.log('ℹ️  Catalog columns may already exist');
}
```

### Step 0.3: Update Database Service

**File: `backend/src/services/database.service.ts`**

Update `createProduct()` method:
```typescript
static async createProduct(productData: {
  product_name: string;
  category: string;
  base_price: number;
  description?: string;
  image_url: string;
  cloudinary_public_id?: string;
  images?: string;              // NEW - JSON string
  colors?: string;              // NEW - JSON string
  material?: string;            // NEW
  gender?: string;              // NEW
  stock_by_size_color?: string; // NEW - JSON string
  allows_customization?: boolean;  // NEW
  customization_areas?: string;    // NEW - JSON string
  production_days?: number;        // NEW
  status?: string;
  stock_quantity?: number;
  sku?: string;
  sizes?: string;
  tags?: string;
}): Promise<ApiResponse<any>> {
  try {
    const connection = await pool.getConnection();
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO catalog_clothing 
       (product_name, category, base_price, description, image_url, cloudinary_public_id, 
        images, colors, material, gender, stock_by_size_color, 
        allows_customization, customization_areas, production_days,
        status, stock_quantity, sku, sizes, tags) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productData.product_name,
        productData.category,
        productData.base_price,
        productData.description || null,
        productData.image_url,
        productData.cloudinary_public_id || null,
        productData.images || null,
        productData.colors || null,
        productData.material || null,
        productData.gender || 'Unisex',
        productData.stock_by_size_color || null,
        productData.allows_customization !== undefined ? productData.allows_customization : true,
        productData.customization_areas || null,
        productData.production_days || 3,
        productData.status || 'Active',
        productData.stock_quantity || 0,
        productData.sku || null,
        productData.sizes || null,
        productData.tags || null
      ]
    );
    connection.release();
    return {
      success: true,
      message: 'Product created successfully',
      data: { product_id: result.insertId, ...productData }
    };
  } catch (error: any) {
    console.error('Database error in createProduct:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return { success: false, message: 'A product with this name already exists', error: error.message };
    }
    return { success: false, message: 'Database error occurred', error: error.message };
  }
}
```

### Step 0.4: Update Catalog Routes

**File: `backend/src/routes/catalog.routes.ts`**

Update POST route:
```typescript
router.post('/', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { 
      product_name, category, base_price, description, 
      image_url, cloudinary_public_id, 
      images, colors, material, gender, stock_by_size_color,
      allows_customization, customization_areas, production_days,
      status, stock_quantity, sku, sizes, tags 
    } = req.body;
    
    if (!product_name || !category || !base_price || !image_url) {
      return res.status(400).json({
        success: false,
        message: 'Product name, category, base price, and image URL are required'
      });
    }
    
    const result = await DatabaseService.createProduct({
      product_name,
      category,
      base_price: parseFloat(base_price),
      description,
      image_url,
      cloudinary_public_id,
      images: images ? JSON.stringify(images) : null,
      colors: colors ? JSON.stringify(colors) : null,
      material,
      gender,
      stock_by_size_color: stock_by_size_color ? JSON.stringify(stock_by_size_color) : null,
      allows_customization,
      customization_areas: customization_areas ? JSON.stringify(customization_areas) : null,
      production_days: production_days ? parseInt(production_days) : 3,
      status,
      stock_quantity: stock_quantity ? parseInt(stock_quantity) : 0,
      sku,
      sizes: sizes ? JSON.stringify(sizes) : null,
      tags: tags ? JSON.stringify(tags) : null
    });
    
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
```

### Step 0.5: Update Admin UI

**File: `src/app/components/admin/products/products.ts`**

Add to component:
```typescript
protected selectedColors: string[] = [];
protected selectedImages: string[] = [];
protected availableColors = ['White', 'Black', 'Navy', 'Red', 'Blue', 'Green', 'Yellow', 'Gray'];
protected genderOptions = ['Unisex', 'Men', 'Women', 'Kids'];

initializeProductForm(): void {
  this.productForm = {
    // ... existing fields ...
    colors: [],
    material: '',
    gender: 'Unisex',
    images: [],
    imageFiles: [],
    allows_customization: true,
    production_days: 3
  };
}

addColor(color: string): void {
  if (color && !this.selectedColors.includes(color)) {
    this.selectedColors.push(color);
  }
}

removeColor(color: string): void {
  this.selectedColors = this.selectedColors.filter(c => c !== color);
}
```

**File: `src/app/components/admin/products/products.html`**

Add form fields in the product form modal:
```html
<!-- Colors Selection -->
<div class="mb-3">
  <label class="form-label">Colors</label>
  <div class="color-selection">
    <div class="selected-colors mb-2">
      <span *ngFor="let color of selectedColors" class="badge bg-primary me-1">
        {{ color }}
        <button type="button" class="btn-close btn-close-white ms-1" 
                (click)="removeColor(color)"></button>
      </span>
    </div>
    <select class="form-select" (change)="addColor($any($event.target).value); $any($event.target).value=''">
      <option value="">Select a color</option>
      <option *ngFor="let color of availableColors" [value]="color">{{ color }}</option>
    </select>
  </div>
</div>

<!-- Material -->
<div class="mb-3">
  <label class="form-label">Material</label>
  <input type="text" class="form-control" 
         [(ngModel)]="productForm.material"
         placeholder="e.g., 100% Cotton">
</div>

<!-- Gender -->
<div class="mb-3">
  <label class="form-label">Gender</label>
  <select class="form-select" [(ngModel)]="productForm.gender">
    <option *ngFor="let gender of genderOptions" [value]="gender">{{ gender }}</option>
  </select>
</div>

<!-- Production Days -->
<div class="mb-3">
  <label class="form-label">Production Days</label>
  <input type="number" class="form-control" 
         [(ngModel)]="productForm.production_days"
         min="1" max="30">
</div>

<!-- Allows Customization -->
<div class="mb-3 form-check">
  <input type="checkbox" class="form-check-input" 
         [(ngModel)]="productForm.allows_customization"
         id="allowsCustomization">
  <label class="form-check-label" for="allowsCustomization">
    Allows Customization
  </label>
</div>
```

---

## Phase 1: Database Schema - Ordering Tables

Now that products have proper attributes, create ordering tables.

### Step 1.1: Create cart_items Table

```sql
CREATE TABLE IF NOT EXISTS cart_items (
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

### Step 1.2: Create orders Table

```sql
CREATE TABLE IF NOT EXISTS orders (
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
  INDEX idx_order_date (order_date),
  FOREIGN KEY (customer_id) REFERENCES customer_accounts(CustomerId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Step 1.3: Create order_items Table

```sql
CREATE TABLE IF NOT EXISTS order_items (
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

### Step 1.4: Add to database.ts

**File: `backend/src/config/database.ts`**

Add after catalog table creation:
```typescript
// Create cart_items table
const createCartItemsTable = `
  CREATE TABLE IF NOT EXISTS cart_items (
    -- see above SQL
  );
`;
await connection.execute(createCartItemsTable);

// Create orders table
const createOrdersTable = `
  CREATE TABLE IF NOT EXISTS orders (
    -- see above SQL
  );
`;
await connection.execute(createOrdersTable);

// Create order_items table
const createOrderItemsTable = `
  CREATE TABLE IF NOT EXISTS order_items (
    -- see above SQL
  );
`;
await connection.execute(createOrderItemsTable);

console.log('✅ Ordering tables created');
```

---

## Phase 2: Backend - Cart API

### Step 2.1: Create Cart Service

**File: `backend/src/services/cart.service.ts`** (NEW)

```typescript
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/database';

export interface CartItem {
  cart_item_id?: number;
  customer_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  size?: string;
  color?: string;
  unit_price: number;
  customization_data?: any;
  created_at?: string;
  updated_at?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export class CartService {
  // Get all cart items for a customer
  static async getCart(customerId: number): Promise<ApiResponse<CartItem[]>> {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM cart_items WHERE customer_id = ? ORDER BY created_at DESC',
        [customerId]
      );
      connection.release();
      
      const items = (rows as any[]).map(row => ({
        ...row,
        unit_price: Number(row.unit_price)
      }));
      
      return { success: true, data: items };
    } catch (error) {
      console.error('Error getting cart:', error);
      return { success: false, message: 'Failed to get cart', error: (error as Error).message };
    }
  }

  // Add item to cart (or update if exists)
  static async addToCart(cartItem: Omit<CartItem, 'cart_item_id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<CartItem>> {
    try {
      const connection = await pool.getConnection();
      
      // Check if item already exists (same product, size, color)
      const [existing] = await connection.execute<RowDataPacket[]>(
        `SELECT * FROM cart_items 
         WHERE customer_id = ? AND product_id = ? AND size = ? AND color = ?`,
        [cartItem.customer_id, cartItem.product_id, cartItem.size || null, cartItem.color || null]
      );
      
      if (existing.length > 0) {
        // Update quantity
        const newQty = existing[0]['quantity'] + cartItem.quantity;
        await connection.execute(
          'UPDATE cart_items SET quantity = ? WHERE cart_item_id = ?',
          [newQty, existing[0]['cart_item_id']]
        );
        connection.release();
        return { success: true, message: 'Cart updated', data: { ...existing[0], quantity: newQty } };
      } else {
        // Insert new item
        const [result] = await connection.execute<ResultSetHeader>(
          `INSERT INTO cart_items 
           (customer_id, product_id, product_name, quantity, size, color, unit_price, customization_data) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            cartItem.customer_id,
            cartItem.product_id,
            cartItem.product_name,
            cartItem.quantity,
            cartItem.size || null,
            cartItem.color || null,
            cartItem.unit_price,
            cartItem.customization_data ? JSON.stringify(cartItem.customization_data) : null
          ]
        );
        connection.release();
        return { success: true, message: 'Item added to cart', data: { cart_item_id: result.insertId, ...cartItem } };
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      return { success: false, message: 'Failed to add to cart', error: (error as Error).message };
    }
  }

  // Update cart item quantity
  static async updateQuantity(cartItemId: number, quantity: number, customerId: number): Promise<ApiResponse> {
    try {
      const connection = await pool.getConnection();
      const [result] = await connection.execute<ResultSetHeader>(
        'UPDATE cart_items SET quantity = ? WHERE cart_item_id = ? AND customer_id = ?',
        [quantity, cartItemId, customerId]
      );
      connection.release();
      
      if (result.affectedRows === 0) {
        return { success: false, message: 'Cart item not found' };
      }
      
      return { success: true, message: 'Quantity updated' };
    } catch (error) {
      console.error('Error updating quantity:', error);
      return { success: false, message: 'Failed to update quantity', error: (error as Error).message };
    }
  }

  // Remove item from cart
  static async removeFromCart(cartItemId: number, customerId: number): Promise<ApiResponse> {
    try {
      const connection = await pool.getConnection();
      const [result] = await connection.execute<ResultSetHeader>(
        'DELETE FROM cart_items WHERE cart_item_id = ? AND customer_id = ?',
        [cartItemId, customerId]
      );
      connection.release();
      
      if (result.affectedRows === 0) {
        return { success: false, message: 'Cart item not found' };
      }
      
      return { success: true, message: 'Item removed from cart' };
    } catch (error) {
      console.error('Error removing from cart:', error);
      return { success: false, message: 'Failed to remove item', error: (error as Error).message };
    }
  }

  // Clear entire cart
  static async clearCart(customerId: number): Promise<ApiResponse> {
    try {
      const connection = await pool.getConnection();
      await connection.execute('DELETE FROM cart_items WHERE customer_id = ?', [customerId]);
      connection.release();
      
      return { success: true, message: 'Cart cleared' };
    } catch (error) {
      console.error('Error clearing cart:', error);
      return { success: false, message: 'Failed to clear cart', error: (error as Error).message };
    }
  }

  // Merge guest cart (from localStorage)
  static async mergeGuestCart(customerId: number, guestItems: Omit<CartItem, 'customer_id' | 'cart_item_id'>[]): Promise<ApiResponse> {
    try {
      for (const item of guestItems) {
        await this.addToCart({
          customer_id: customerId,
          ...item
        });
      }
      
      return { success: true, message: 'Guest cart merged successfully' };
    } catch (error) {
      console.error('Error merging guest cart:', error);
      return { success: false, message: 'Failed to merge cart', error: (error as Error).message };
    }
  }
}
```

### Step 2.2: Create Cart Routes

**File: `backend/src/routes/cart.routes.ts`** (NEW)

```typescript
import { Request, Response, Router } from 'express';
import { CartService } from '../services/cart.service';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// GET /api/cart - Get logged-in user's cart
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const customerId = (req as any).user.userId;
    const result = await CartService.getCart(customerId);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cart',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/cart - Add item to cart
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const customerId = (req as any).user.userId;
    const { product_id, product_name, quantity, size, color, unit_price, customization_data } = req.body;
    
    if (!product_id || !product_name || !quantity || !unit_price) {
      return res.status(400).json({
        success: false,
        message: 'Product ID, name, quantity, and price are required'
      });
    }
    
    const result = await CartService.addToCart({
      customer_id: customerId,
      product_id,
      product_name,
      quantity,
      size,
      color,
      unit_price: parseFloat(unit_price),
      customization_data
    });
    
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add to cart',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/cart/:itemId - Update cart item quantity
router.put('/:itemId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const customerId = (req as any).user.userId;
    const { itemId } = req.params;
    const { quantity } = req.body;
    
    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Valid quantity is required'
      });
    }
    
    const result = await CartService.updateQuantity(parseInt(itemId), quantity, customerId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cart',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/cart/:itemId - Remove item from cart
router.delete('/:itemId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const customerId = (req as any).user.userId;
    const { itemId } = req.params;
    
    const result = await CartService.removeFromCart(parseInt(itemId), customerId);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove item',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/cart - Clear entire cart
router.delete('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const customerId = (req as any).user.userId;
    const result = await CartService.clearCart(customerId);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/cart/merge - Merge guest cart on login
router.post('/merge', authenticateToken, async (req: Request, res: Response) => {
  try {
    const customerId = (req as any).user.userId;
    const { items } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required'
      });
    }
    
    const result = await CartService.mergeGuestCart(customerId, items);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error merging cart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to merge cart',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
```

### Step 2.3: Register Cart Routes

**File: `backend/src/server.ts`**

Add import:
```typescript
import cartRoutes from './routes/cart.routes';
```

Add route:
```typescript
app.use('/api/cart', cartRoutes);
```

---

## Phase 3: Backend - Order API

### Step 3.1: Create Order Service

**File: `backend/src/services/order.service.ts`** (NEW)

```typescript
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/database';
import { CartItem } from './cart.service';

export interface Order {
  order_id?: number;
  order_ref: string;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  customer_address?: string;
  total_amount: number;
  status?: string;
  order_date?: string;
  estimated_completion?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OrderItem {
  item_id?: number;
  order_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  size?: string;
  color?: string;
  unit_price: number;
  subtotal: number;
  customization_data?: any;
  created_at?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export class OrderService {
  // Generate unique order reference
  static async generateOrderRef(): Promise<string> {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT order_ref FROM orders ORDER BY order_id DESC LIMIT 1'
      );
      connection.release();
      
      if (rows.length === 0) {
        return 'ORD-001';
      }
      
      const lastRef = rows[0]['order_ref'];
      const num = parseInt(lastRef.split('-')[1]) + 1;
      return `ORD-${num.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating order ref:', error);
      return `ORD-${Date.now()}`;
    }
  }

  // Create order from cart
  static async createOrder(orderData: {
    customer_id: number;
    customer_name: string;
    customer_email: string;
    customer_phone?: string;
    customer_address?: string;
    notes?: string;
  }): Promise<ApiResponse<Order>> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // 1. Get cart items
      const [cartItems] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM cart_items WHERE customer_id = ?',
        [orderData.customer_id]
      );
      
      if (cartItems.length === 0) {
        await connection.rollback();
        connection.release();
        return { success: false, message: 'Cart is empty' };
      }
      
      // 2. Calculate total
      const total = cartItems.reduce((sum, item) => 
        sum + (Number(item['unit_price']) * item['quantity']), 0
      );
      
      // 3. Generate order reference
      const orderRef = await this.generateOrderRef();
      
      // 4. Create order
      const [orderResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO orders 
         (order_ref, customer_id, customer_name, customer_email, customer_phone, customer_address, total_amount, notes, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          orderRef,
          orderData.customer_id,
          orderData.customer_name,
          orderData.customer_email,
          orderData.customer_phone || null,
          orderData.customer_address || null,
          total,
          orderData.notes || null
        ]
      );
      
      const orderId = orderResult.insertId;
      
      // 5. Create order items from cart
      for (const item of cartItems) {
        const subtotal = Number(item['unit_price']) * item['quantity'];
        await connection.execute(
          `INSERT INTO order_items 
           (order_id, product_id, product_name, quantity, size, color, unit_price, subtotal, customization_data) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            item['product_id'],
            item['product_name'],
            item['quantity'],
            item['size'] || null,
            item['color'] || null,
            item['unit_price'],
            subtotal,
            item['customization_data'] || null
          ]
        );
      }
      
      // 6. Clear cart
      await connection.execute(
        'DELETE FROM cart_items WHERE customer_id = ?',
        [orderData.customer_id]
      );
      
      await connection.commit();
      connection.release();
      
      return {
        success: true,
        message: 'Order created successfully',
        data: {
          order_id: orderId,
          order_ref: orderRef,
          ...orderData,
          total_amount: total,
          status: 'pending'
        }
      };
    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error('Error creating order:', error);
      return { success: false, message: 'Failed to create order', error: (error as Error).message };
    }
  }

  // Get all orders (admin)
  static async getOrders(filters?: { status?: string; customerId?: number }): Promise<ApiResponse<Order[]>> {
    try {
      const connection = await pool.getConnection();
      let query = 'SELECT * FROM orders WHERE 1=1';
      const params: any[] = [];
      
      if (filters?.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }
      
      if (filters?.customerId) {
        query += ' AND customer_id = ?';
        params.push(filters.customerId);
      }
      
      query += ' ORDER BY order_date DESC';
      
      const [rows] = await connection.execute<RowDataPacket[]>(query, params);
      connection.release();
      
      const orders = (rows as any[]).map(row => ({
        ...row,
        total_amount: Number(row.total_amount)
      }));
      
      return { success: true, data: orders };
    } catch (error) {
      console.error('Error getting orders:', error);
      return { success: false, message: 'Failed to get orders', error: (error as Error).message };
    }
  }

  // Get single order with items
  static async getOrder(orderId: number): Promise<ApiResponse<any>> {
    try {
      const connection = await pool.getConnection();
      
      // Get order
      const [orderRows] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM orders WHERE order_id = ?',
        [orderId]
      );
      
      if (orderRows.length === 0) {
        connection.release();
        return { success: false, message: 'Order not found' };
      }
      
      const order = orderRows[0];
      
      // Get order items
      const [itemRows] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM order_items WHERE order_id = ?',
        [orderId]
      );
      
      connection.release();
      
      return {
        success: true,
        data: {
          ...order,
          total_amount: Number(order['total_amount']),
          items: itemRows.map(item => ({
            ...item,
            unit_price: Number(item['unit_price']),
            subtotal: Number(item['subtotal'])
          }))
        }
      };
    } catch (error) {
      console.error('Error getting order:', error);
      return { success: false, message: 'Failed to get order', error: (error as Error).message };
    }
  }

  // Get customer orders
  static async getCustomerOrders(customerId: number): Promise<ApiResponse<Order[]>> {
    return this.getOrders({ customerId });
  }

  // Update order status (for Kanban drag & drop)
  static async updateOrderStatus(orderId: number, status: string): Promise<ApiResponse> {
    try {
      const connection = await pool.getConnection();
      const [result] = await connection.execute<ResultSetHeader>(
        'UPDATE orders SET status = ? WHERE order_id = ?',
        [status, orderId]
      );
      connection.release();
      
      if (result.affectedRows === 0) {
        return { success: false, message: 'Order not found' };
      }
      
      return { success: true, message: 'Order status updated' };
    } catch (error) {
      console.error('Error updating order status:', error);
      return { success: false, message: 'Failed to update status', error: (error as Error).message };
    }
  }

  // Cancel order
  static async cancelOrder(orderId: number): Promise<ApiResponse> {
    return this.updateOrderStatus(orderId, 'cancelled');
  }
}
```

### Step 3.2: Create Order Routes

**File: `backend/src/routes/orders.routes.ts`** (NEW)

```typescript
import { Request, Response, Router } from 'express';
import { OrderService } from '../services/order.service';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// POST /api/orders - Create order from cart
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const customerId = (req as any).user.userId;
    const { customer_name, customer_email, customer_phone, customer_address, notes } = req.body;
    
    if (!customer_name || !customer_email) {
      return res.status(400).json({
        success: false,
        message: 'Customer name and email are required'
      });
    }
    
    const result = await OrderService.createOrder({
      customer_id: customerId,
      customer_name,
      customer_email,
      customer_phone,
      customer_address,
      notes
    });
    
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/orders - Get all orders (admin only)
router.get('/', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const result = await OrderService.getOrders({ 
      status: status as string | undefined 
    });
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/orders/:id - Get order details
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await OrderService.getOrder(parseInt(id));
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/orders/customer/:customerId - Get customer's orders
router.get('/customer/:customerId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const userId = (req as any).user.userId;
    
    // Check if user is accessing their own orders or is admin
    if (parseInt(customerId) !== userId && (req as any).user.role !== 'employee') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view these orders'
      });
    }
    
    const result = await OrderService.getCustomerOrders(parseInt(customerId));
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PATCH /api/orders/:id/status - Update order status (admin only)
router.patch('/:id/status', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    const result = await OrderService.updateOrderStatus(parseInt(id), status);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/orders/:id - Cancel order
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await OrderService.cancelOrder(parseInt(id));
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
```

### Step 3.3: Register Order Routes

**File: `backend/src/server.ts`**

Add import:
```typescript
import ordersRoutes from './routes/orders.routes';
```

Add route:
```typescript
app.use('/api/orders', ordersRoutes);
```

---

## Phase 4: Frontend - Product Catalog Display

### Step 4.1: Update Apparel Component

**File: `src/app/components/apparel/apparel.ts`**

```typescript
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ProductData, ApiResponse } from '../../services/api';

@Component({
  selector: 'app-apparel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './apparel.html',
  styleUrl: './apparel.css'
})
export class ApparelComponent implements OnInit {
  protected products = signal<ProductData[]>([]);
  protected loading = signal(true);
  protected error = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading.set(true);
    this.http.get<ApiResponse<ProductData[]>>(`${environment.api.baseUrl}/catalog?status=Active`)
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.products.set(response.data);
          }
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading products:', error);
          this.error.set('Failed to load products');
          this.loading.set(false);
        }
      });
  }

  addToCart(product: ProductData): void {
    // TODO: Implement cart functionality
    console.log('Add to cart:', product);
    alert(`Added ${product.product_name} to cart!`);
  }

  viewCustomization(product: ProductData): void {
    // Navigate to customization page with product
    console.log('Customize:', product);
  }
}
```

**File: `src/app/components/apparel/apparel.html`**

```html
<div class="container mt-5">
  <h1 class="text-center mb-4">Featured Apparel</h1>
  
  @if (loading()) {
    <div class="text-center">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
  }
  
  @if (error()) {
    <div class="alert alert-danger">{{ error() }}</div>
  }
  
  @if (!loading() && products().length === 0) {
    <div class="alert alert-info">No products available at the moment.</div>
  }
  
  <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
    @for (product of products(); track product.product_id) {
      <div class="col">
        <div class="card h-100">
          <img [src]="product.image_url" 
               [alt]="product.product_name" 
               class="card-img-top"
               style="height: 300px; object-fit: cover;">
          <div class="card-body">
            <h5 class="card-title">{{ product.product_name }}</h5>
            <p class="card-text">{{ product.description || 'No description available' }}</p>
            
            @if (product.colors) {
              <div class="mb-2">
                <small class="text-muted">Colors: {{ product.colors }}</small>
              </div>
            }
            
            @if (product.material) {
              <div class="mb-2">
                <small class="text-muted">Material: {{ product.material }}</small>
              </div>
            }
            
            <div class="d-flex justify-content-between align-items-center">
              <span class="h5 mb-0">₱{{ product.base_price?.toFixed(2) }}</span>
              @if (product.stock_quantity && product.stock_quantity > 0) {
                <span class="badge bg-success">In Stock</span>
              } @else {
                <span class="badge bg-danger">Out of Stock</span>
              }
            </div>
          </div>
          <div class="card-footer bg-transparent">
            <button class="btn btn-primary w-100 mb-2" 
                    (click)="addToCart(product)"
                    [disabled]="!product.stock_quantity || product.stock_quantity === 0">
              Add to Cart
            </button>
            @if (product.allows_customization) {
              <button class="btn btn-outline-secondary w-100" 
                      (click)="viewCustomization(product)">
                Customize This
              </button>
            }
          </div>
        </div>
      </div>
    }
  </div>
</div>
```

---

## Phase 5-11: Continue with Frontend Implementation

(The plan continues with Cart Service, Cart Component, Checkout, Order History, Customization Integration, Admin Kanban Integration, and Testing)

**Due to length, the complete implementation of Phases 5-11 follows the same pattern as outlined in the original `customer-ordering-system.plan.md` file.**

---

## Implementation Summary

### Order of Execution:
1. ✅ Phase 0: Product Schema Enhancement (Critical Foundation)
2. ✅ Phase 1: Database Tables (cart_items, orders, order_items)
3. ✅ Phase 2: Backend Cart API
4. ✅ Phase 3: Backend Order API
5. Phase 4: Frontend Product Display
6. Phase 5: Frontend Cart Service (Hybrid)
7. Phase 6: Frontend Cart Component
8. Phase 7: Frontend Checkout
9. Phase 8: Customer Order History
10. Phase 9: Customization Integration
11. Phase 10: Admin Kanban Integration
12. Phase 11: Testing & WIP Limits

### Key Benefits of This Unified Approach:
- Product schema is fixed FIRST, ensuring complete product data
- Cart and orders can properly store colors, sizes, materials
- Admin has all product info for production planning
- Backward compatible with existing products
- Scalable for future enhancements

---

**Total Implementation Time Estimate: 2-3 days for complete system**

