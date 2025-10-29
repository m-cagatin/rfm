# 🔐 Cloudinary Security & Folder Organization

## ✅ What Was Fixed:

### 1. **Security - Credentials Moved to .env**
- ❌ **Before**: Cloudinary credentials were hardcoded in `src/environments/environment.ts`
- ✅ **After**: Credentials now in `.env` file (which is gitignored)

**Your .env file now contains:**
```env
CLOUDINARY_CLOUD_NAME=dpvrv7btt
CLOUDINARY_API_KEY=425947453244552
CLOUDINARY_API_SECRET=your_api_secret_here
CLOUDINARY_UPLOAD_PRESET=rfm_uploads
```

⚠️ **TODO**: Add your actual `CLOUDINARY_API_SECRET` to the `.env` file

### 2. **Image Organization - Separated Folders**
Images are now automatically organized by product type:

📁 **Cloudinary Folder Structure:**
```
rfm_products/
├── catalog/          ← Regular catalog products (catalog_clothings table)
│   ├── blue-tshirt-1234567890.jpg
│   └── red-hoodie-1234567891.jpg
└── customizable/     ← Customizable products (customizable_products table)
    ├── custom-polo-1234567892.jpg
    └── print-tee-1234567893.jpg
```

## 🚀 How to Use:

### For Catalog Products (existing):
```typescript
// Upload to rfm_products/catalog/
await cloudinaryService.uploadCatalogImage(file, productName);
```

### For Customizable Products (new):
```typescript
// Upload to rfm_products/customizable/
await cloudinaryService.uploadCustomizableImage(file, productName);
```

### Or use the flexible method:
```typescript
// Specify folder explicitly
await cloudinaryService.uploadImageWithProductName(file, productName, 'catalog');
await cloudinaryService.uploadImageWithProductName(file, productName, 'customizable');
```

## 📋 Next Steps:

1. **Add your API secret to .env:**
   - Go to Cloudinary Dashboard → Settings → Security
   - Copy your API Secret
   - Add it to `.env` file: `CLOUDINARY_API_SECRET=your_actual_secret`

2. **Never commit .env:**
   - Already in `.gitignore` ✅
   - Always use `.env.example` for team reference

3. **Update existing code:**
   - When uploading catalog products, use `uploadCatalogImage()`
   - When uploading customizable products, use `uploadCustomizableImage()`

## 🔍 Where Credentials Are Used:

- **Frontend (Angular)**: Uses cloud name and API key for unsigned uploads
- **Backend (Node.js)**: Should use all credentials (name, key, secret) for signed uploads
- **.env file**: Single source of truth for all credentials

## 📝 Example Usage in Components:

```typescript
// In catalog-product-form.component.ts
async uploadImage(file: File) {
  const result = await this.cloudinaryService.uploadCatalogImage(
    file, 
    this.form.productName
  );
  this.form.imageUrl = result.secure_url;
}

// In customizable-product-form.component.ts
async uploadImage(file: File) {
  const result = await this.cloudinaryService.uploadCustomizableImage(
    file, 
    this.form.name
  );
  this.form.frontImageUrl = result.secure_url;
}
```

## ✅ Security Checklist:

- [x] Credentials moved to .env
- [x] .env added to .gitignore
- [x] .env.example created for reference
- [ ] Add actual CLOUDINARY_API_SECRET to .env
- [x] Folder separation implemented
- [x] Helper methods created for easy usage

---

**Your images are now organized and your credentials are safe!** 🎉
