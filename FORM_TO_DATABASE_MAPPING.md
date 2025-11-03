# Form Fields to Database Columns Mapping

This document maps the visible form fields in the Customizable Product Form to their corresponding database columns.

---

## ✅ FORM FIELDS → DATABASE MAPPING

### 1. Basic Info

| Form Field Label | Form Model Property | Database Column | Notes |
|-----------------|-------------------|-----------------|-------|
| **Product Category / Name*** | `form.category` | `category` | ✅ Used as product name |
| **Product Type*** | `form.gender` | `gender` | ✅ Enum: Unisex, Men, Women, Kids |
| **Fit Type** | `form.fitType` | `fit_type` | ✅ Enum: Classic, Slim Fit, etc. |
| **Available Sizes*** | `form.availableSizes` | `available_sizes` | ✅ JSON array |
| **Fit Description** | `form.fitDescription` | `fit_description` | ✅ VARCHAR(255) |
| **Size Pricing** | `sizePricing` | `size_pricing` | ✅ JSON object |
| **Description** | `form.description` | `description` | ✅ TEXT |
| **Publish Product** | `form.isActive` | `is_active` | ✅ Boolean toggle (1/0) |

### 2. Images

| Form Field Label | Form Model Property | Database Table | Notes |
|-----------------|-------------------|----------------|-------|
| **Front View Image*** | `form.frontImageFile` | `customizable_product_images` | ✅ Stored with `image_type='front'` |
| **Back View Image*** | `form.backImageFile` | `customizable_product_images` | ✅ Stored with `image_type='back'` |
| **Additional Images** | `form.additionalImageFiles` | `customizable_product_images` | ✅ Stored with `image_type='additional'` |

**Image Table Structure:**
- `image_url` - Cloudinary URL
- `cloudinary_public_id` - For deletion
- `image_type` - front/back/additional
- `display_order` - Sort order

### 3. Material & Fabric

| Form Field Label | Form Model Property | Database Column | Notes |
|-----------------|-------------------|-----------------|-------|
| **Fabric Composition** | `form.fabricComposition` | `fabric_composition` | ✅ VARCHAR(255) |
| **Fabric Weight** | `form.fabricWeight` | `fabric_weight` | ✅ VARCHAR(100) |
| **Texture / Finish** | `form.texture` | `texture` | ✅ VARCHAR(100) |

### 4. Pricing

| Form Field Label | Form Model Property | Database Column | Notes |
|-----------------|-------------------|-----------------|-------|
| **Retail Price*** | `form.retailPrice` | `retail_price` | ✅ DECIMAL(10,2) |

### 5. Colors & Variants

| Form Field Label | Form Model Property | Database Column/Table | Notes |
|-----------------|-------------------|---------------------|-------|
| **Search colors*** | `form.availableColors` | `available_colors` | ✅ JSON array of {name, hex} |
| **Upload variant images** | `variants` | `texture_variants` table | ✅ Separate table with variant images |

**Variants Table Structure:**
- `product_id` - FK to customizable_products
- `name` - Variant name
- `image_url` - Cloudinary URL

### 6. Print & Customization

| Form Field Label | Form Model Property | Database Column | Notes |
|-----------------|-------------------|-----------------|-------|
| **Print Method** | `form.printMethod` | `print_method` | ✅ Enum: DTG, Screen Print, Embroidery |
| **Print Areas*** | `form.printAreas` | `print_areas` | ✅ JSON array |
| **Design Upload Requirements** | `form.designRequirements` | `design_requirements` | ✅ TEXT |

### 7. Business Details

| Form Field Label | Form Model Property | Database Column | Notes |
|-----------------|-------------------|-----------------|-------|
| **Turnaround Time** | `form.turnaroundTime` | `turnaround_time` | ✅ VARCHAR(100) |
| **Minimum Order Quantity** | `form.minimumOrderQty` | `minimum_order_qty` | ✅ INT |

---

## ❌ DATABASE COLUMNS NOT IN FORM

These columns exist in the database but are NOT visible in the form:

| Database Column | Current Value | Purpose | Should We Add to Form? |
|----------------|---------------|---------|----------------------|
| `product_code` | Auto-generated (CP000001) | Unique product identifier | ❌ No - system generated |
| `base_cost` | 0.00 | Cost to produce the product | ⚠️ **RECOMMENDED** - Add for profit tracking |
| `created_at` | Auto timestamp | Record creation time | ❌ No - system managed |
| `updated_at` | Auto timestamp | Last update time | ❌ No - system managed |

---

## 🔧 RECOMMENDED CHANGES

### 1. Add "Base Cost" Field to Form
**Why:** You should track how much it costs YOU to produce each product so you can calculate profit margins.

**Where to add:** Section 4 (Pricing) - before Retail Price

```html
<div class="col-md-6">
  <label>Base Cost (Your Cost) 💵</label>
  <div class="input-group">
    <span class="input-group-text">₱</span>
    <input type="number" min="0" step="10" class="form-control" 
           [(ngModel)]="form.baseCost" name="baseCost" 
           placeholder="250">
  </div>
  <small class="form-text text-muted">How much it costs YOU to produce this item (for profit calculation)</small>
</div>

<div class="col-md-6">
  <label>Retail Price 💰 <span class="text-danger">*</span></label>
  <div class="input-group">
    <span class="input-group-text">₱</span>
    <input type="number" min="0" step="50" class="form-control" 
           [(ngModel)]="form.retailPrice" name="retailPrice" 
           placeholder="500" required>
  </div>
  <small class="form-text text-muted">Price customers pay</small>
</div>

<!-- Show profit margin -->
<div class="col-md-12" *ngIf="form.baseCost > 0 && form.retailPrice > 0">
  <div class="alert alert-success">
    💰 <strong>Profit Margin:</strong> 
    ₱{{ form.retailPrice - form.baseCost }} 
    ({{ ((form.retailPrice - form.baseCost) / form.baseCost * 100).toFixed(1) }}%)
  </div>
</div>
```

### 2. Update TypeScript Interface

Add `baseCost` to the interface in `customizable-product-form.ts`:

```typescript
interface CustomizableProductForm {
  // ... other fields
  baseCost: number;  // ADD THIS
  retailPrice: number;
  // ... other fields
}

// Initialize in form
this.form = {
  // ... other fields
  baseCost: 0,  // ADD THIS
  retailPrice: 0,
  // ... other fields
};
```

---

## 📊 SUMMARY

### Currently Implemented:
- ✅ All form fields map to database columns
- ✅ Images stored in separate table
- ✅ Variants stored in separate table
- ✅ "Publish Product" toggle = `is_active` column

### Missing from Form:
- ⚠️ **Base Cost** - Should be added for profit tracking
- ✅ Product Code - Auto-generated (no need to add)
- ✅ Timestamps - System managed (no need to add)

### Unused Database Features:
- `customizable_product_stock` table - Inventory tracking (future feature)

---

**Last Updated:** November 2, 2025  
**Maintained By:** Development Team
