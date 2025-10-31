# Quick Testing Guide - Customizable Products

## 🚀 Ready to Test!

Your customizable products system has been fully migrated to the new normalized image architecture. Everything compiles successfully and is ready for testing.

---

## ✅ What Was Done

### Backend
- Created `customizable_product_images` table with explicit `image_type` ENUM
- Updated all API routes (GET, POST, PUT, DELETE)
- Added DatabaseService methods
- Implemented CASCADE delete
- **Status**: ✅ Compiled successfully

### Frontend
- Updated `CustomizableProduct` interface with images array
- Added helper methods (getProductImages, getFrontImage, getBackImage)
- Updated form component to handle new image structure
- Updated list and detail views
- **Status**: ✅ Compiled successfully

---

## 🧪 Test These Scenarios

### 1. Create New Customizable Product
1. Go to Admin Panel → Customizable Products
2. Click "Add New Product"
3. Fill in product details:
   - Name: "Premium T-Shirt"
   - Category: "T-Shirt"
   - Gender: "Unisex"
   - Fit Type: "Regular Fit"
4. **Upload Images**:
   - Front image (required)
   - Back image (required)  
   - Additional images (optional)
5. Click "Save"
6. **Expected Result**: Product appears in list with front image

**Verify in Database:**
```sql
-- Check product created
SELECT * FROM customizable_products WHERE name = 'Premium T-Shirt';

-- Check images inserted  
SELECT * FROM customizable_product_images 
WHERE product_id = [ID from above query];

-- Should see 3 rows:
-- image_type = 'front'
-- image_type = 'back'
-- image_type = 'additional' (if you uploaded extra images)
```

---

### 2. View Product Details
1. Click "View" button on the product
2. **Expected Result**: Modal opens showing:
   - Front image
   - Back image
   - Additional images (if any)
   - All product information

---

### 3. Edit Existing Product
1. Click "Edit" button on the product
2. Form loads with existing data
3. **Test Scenarios**:

**A. Keep Existing Images**
- Don't upload new files
- Change product name or description
- Click "Save"
- **Expected**: Images remain unchanged

**B. Replace Front Image**
- Upload new front image
- Click "Save"
- **Expected**: New front image appears

**C. Add More Additional Images**
- Upload 1-2 more additional images
- Click "Save"  
- **Expected**: New additional images added, old ones kept

**D. Replace All Images**
- Upload new front, back, and additional images
- Click "Save"
- **Expected**: All images replaced

---

### 4. Delete Product (CASCADE Test)
1. Archive the product first (click "Archive")
2. Product status changes to "Archived"
3. Click "Delete" button (only shows for archived products)
4. Confirm deletion
5. **Expected**: Product removed from list

**Verify CASCADE Delete:**
```sql
-- Check product deleted
SELECT * FROM customizable_products WHERE id = [PRODUCT_ID];
-- Should return 0 rows

-- Check images deleted (CASCADE)
SELECT * FROM customizable_product_images WHERE product_id = [PRODUCT_ID];
-- Should return 0 rows

-- Check variants deleted (CASCADE)
SELECT * FROM texture_variants WHERE product_id = [PRODUCT_ID];
-- Should return 0 rows

-- Check stock deleted (CASCADE)
SELECT * FROM customizable_product_stock WHERE product_id = [PRODUCT_ID];
-- Should return 0 rows
```

---

## 🔍 What to Check

### Frontend Display
- [ ] Product list shows front images correctly
- [ ] Details modal shows all images (front, back, additional)
- [ ] Images display in correct order
- [ ] No broken image links
- [ ] Placeholder shows if image missing

### Form Behavior
- [ ] Front image upload works
- [ ] Back image upload works
- [ ] Multiple additional images upload works
- [ ] Image previews appear after upload
- [ ] Edit mode loads existing images
- [ ] Can replace individual images
- [ ] Form validation works (front/back required)

### API Responses
- [ ] GET `/customizable-products` returns images array
- [ ] Each image has: `url`, `publicId`, `image_type`, `displayOrder`
- [ ] POST creates product with images
- [ ] PUT updates product and images
- [ ] DELETE removes product and CASCADE deletes related data

### Database Integrity
- [ ] Images table has correct foreign keys
- [ ] CASCADE delete works
- [ ] No orphaned images after product deletion
- [ ] `image_type` ENUM only accepts 'front', 'back', 'additional'
- [ ] Cloudinary `public_id` stored correctly

---

## 🐛 Common Issues & Fixes

### Issue: "Front image not displaying"
**Check:**
```typescript
// In customizable-products.ts
getFrontImage(product: CustomizableProduct): string {
  const images = this.getProductImages(product);
  const frontImg = images.find(img => img.image_type === 'front');
  return frontImg?.url || '/assets/placeholder.png';
}
```
**Fix**: Ensure placeholder image exists at `/assets/placeholder.png`

---

### Issue: "Cannot read property 'images' of undefined"
**Check**: API response format
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "T-Shirt",
    "images": [  // ← Should be array, not string
      {
        "url": "https://...",
        "publicId": "customizable/...",
        "image_type": "front",
        "displayOrder": 1
      }
    ]
  }
}
```

---

### Issue: "Additional images not showing"
**Check**: HTML template
```html
<div *ngFor="let img of getProductImages(selectedProduct()!)">
  <ng-container *ngIf="img.image_type === 'additional'">
    <img [src]="img.url" [alt]="'Additional Image'">
  </ng-container>
</div>
```

---

### Issue: "Edit form not loading images"
**Check**: Form initialization (customizable-product-form.ts)
```typescript
if (product.images && Array.isArray(product.images)) {
  const frontImg = product.images.find(img => img.image_type === 'front');
  this.form.frontImageUrl = frontImg?.url || '';
  // ... etc
}
```

---

## 📊 Database Quick Checks

### Check Migration Applied
```sql
SHOW TABLES LIKE 'customizable_product_images';
-- Should return 1 row

DESCRIBE customizable_product_images;
-- Should show columns: image_id, product_id, image_url, cloudinary_public_id, image_type, display_order, created_at
```

### Check Image Types
```sql
SELECT DISTINCT image_type FROM customizable_product_images;
-- Should return: 'front', 'back', 'additional' (or subset)
```

### Check CASCADE Constraint
```sql
SELECT 
  TABLE_NAME,
  COLUMN_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_NAME = 'customizable_product_images'
AND REFERENCED_TABLE_NAME IS NOT NULL;
-- Should show: product_id → customizable_products(id) with ON DELETE CASCADE
```

### Check Product Code Generated
```sql
SELECT id, product_code, name FROM customizable_products;
-- product_code should be 8-digit numbers like '12345678'
```

---

## ✅ Success Indicators

**You'll know it's working when:**

1. ✅ Create product → Images upload to Cloudinary → Product saves → Images appear in list
2. ✅ View details → All images (front, back, additional) display correctly
3. ✅ Edit product → Existing images load → Can replace images → Saves successfully
4. ✅ Delete product → Product removed → Database CASCADE deletes all related records

---

## 🚨 If Something Breaks

### Backend Issues
**Check Terminal Output:**
```bash
cd backend
npm run dev
# Look for errors in console
```

**Common Errors:**
- "Cannot read property 'images' of undefined" → Check if backend returning images array
- "ER_BAD_FIELD_ERROR" → Check if all SQL queries use correct column names
- "ER_NO_REFERENCED_ROW" → Check foreign key constraints

### Frontend Issues  
**Check Browser Console:**
```
F12 → Console tab
Look for errors when:
- Loading products list
- Opening details modal
- Submitting form
```

**Common Errors:**
- "TypeError: Cannot read property '0' of undefined" → Check if images array exists
- "HttpErrorResponse" → Check if backend API is running (localhost:3001)
- "CORS error" → Check backend CORS settings

---

## 🎯 Quick Wins to Test First

### Start Here (10 minutes):
1. ✅ **View existing products** → Check if list loads
2. ✅ **Create simple product** → Upload front + back images only
3. ✅ **View new product details** → Check images appear
4. ✅ **Edit product name** → Don't change images, just update name
5. ✅ **Delete product** → Verify it's removed

### Then Test (20 minutes):
6. ✅ **Create product with additional images** → Upload 3+ additional images
7. ✅ **Edit and replace front image** → Upload new front image
8. ✅ **Edit and add more additional images** → Keep existing, add 2 more
9. ✅ **Verify CASCADE delete** → Delete product, check database

---

## 📝 Test Results Template

Copy this and fill in as you test:

```markdown
## Test Results - Customizable Products Migration

**Date**: [FILL IN]
**Tester**: [YOUR NAME]

### 1. Create New Product
- [ ] Form opens correctly
- [ ] Front image upload works
- [ ] Back image upload works
- [ ] Additional images upload works
- [ ] Product saves successfully
- [ ] Product appears in list with front image
**Issues Found**: [NONE / DESCRIBE]

### 2. View Product Details
- [ ] Details modal opens
- [ ] Front image displays
- [ ] Back image displays
- [ ] Additional images display
- [ ] All product info shows correctly
**Issues Found**: [NONE / DESCRIBE]

### 3. Edit Product
- [ ] Form loads with existing data
- [ ] Existing images show
- [ ] Can replace front image
- [ ] Can replace back image
- [ ] Can add more additional images
- [ ] Changes save successfully
**Issues Found**: [NONE / DESCRIBE]

### 4. Delete Product
- [ ] Archive button works
- [ ] Delete button appears for archived
- [ ] Deletion removes product
- [ ] CASCADE deletes images
- [ ] CASCADE deletes variants
- [ ] CASCADE deletes stock
**Issues Found**: [NONE / DESCRIBE]

### Database Checks
- [ ] customizable_product_images table exists
- [ ] Foreign keys work
- [ ] CASCADE delete works
- [ ] ENUM validation works
- [ ] No orphaned records after deletion
**Issues Found**: [NONE / DESCRIBE]

### Overall Status
**Migration Status**: [ SUCCESS / PARTIAL / FAILED ]
**Ready for Production**: [ YES / NO / NEEDS FIXES ]
**Additional Notes**: [FILL IN]
```

---

## 🎉 You're All Set!

Everything is compiled and ready to test. The migration follows the exact same pattern as the successful `catalog_clothing` migration, so it should work smoothly.

**Start Testing Now:**
1. Open Admin Panel: `http://localhost:4200/admin`
2. Go to Customizable Products section
3. Follow the test scenarios above

**Need Help?**
- Check `CUSTOMIZABLE_PRODUCTS_MIGRATION_FINAL.md` for detailed technical docs
- Check browser console (F12) for frontend errors
- Check terminal output for backend errors
- Verify database with SQL queries above

**Good luck! 🚀**
