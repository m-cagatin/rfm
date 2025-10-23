import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CloudinaryService, UploadResponse } from '../../../services/cloudinary.service';
import { ApiService, ProductData } from '../../../services/api';

export interface ProductForm {
  name: string;
  category: string;
  basePrice: string;
  description: string;
  stockQuantity: number;
  sku: string;
  sizes: string[];
  imageUrl: string;                     // Primary image URL (first from imageUrls)
  cloudinary_public_id?: string;        // For edit mode (primary image)
  // NEW FIELDS
  colors: string[];                     // Array of color names
  material: string;                     // e.g., "100% Cotton"
  gender: 'Unisex' | 'Men' | 'Women' | 'Kids';
  imageFiles: File[];                   // Multiple image uploads
  imageUrls: string[];                  // URLs of uploaded images (first is primary)
  allows_customization: boolean;
  production_days: number;
}

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products.html',
  styleUrls: ['./products.css']
})
export class AdminProductsComponent implements OnInit {
  protected productForm: ProductForm = {
    name: '',
    category: '',
    basePrice: '0',
    description: '',
    stockQuantity: 0,
    sku: '',
    sizes: [],
    imageUrl: '',
    cloudinary_public_id: undefined,
    // NEW FIELDS
    colors: [],
    material: '',
    gender: 'Unisex',
    imageFiles: [],
    imageUrls: [],
    allows_customization: true,
    production_days: 3
  };

  protected availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', 'Free Size'];

  protected clothingCategories = [
    'T-Shirt',
    'Polo Shirt',
    'Hoodie',
    'Jacket',
    'Sweatshirt',
    'Tank Top',
    'Long Sleeve',
    'Shorts',
    'Pants',
    'Jeans',
    'Dress',
    'Skirt',
    'Hat',
    'Cap',
    'Beanie',
    'Scarf',
    'Gloves',
    'Socks',
    'Underwear',
    'Bra',
    'Swimwear',
    'Activewear',
    'Uniform',
    'Other'
  ];

  protected isUploading = signal(false);
  protected message = signal('');
  protected messageType = signal<'success' | 'error' | 'info' | ''>('');
  protected newImagePreviews: string[] = [];

  // NEW: Color input and edit mode state
  protected newColor = '';
  protected isEditMode = signal(false);
  protected editingProductId = signal<number | null>(null);

  // Tab and product list signals
  protected activeTab = signal<'active' | 'archived'>('active');
  protected activeProducts = signal<ProductData[]>([]);
  protected archivedProducts = signal<ProductData[]>([]);
  protected selectedProduct = signal<ProductData | null>(null);
  protected activeCount = computed(() => this.activeProducts().length);
  protected archivedCount = computed(() => this.archivedProducts().length);

  constructor(
    private cloudinaryService: CloudinaryService,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    // Initialize the price field
    this.productForm.basePrice = '0';
    // Load products on init
    this.loadProducts();
    
    // Add event listener to reset edit mode when modal closes
    const modalElement = document.getElementById('addProductModal');
    if (modalElement) {
      modalElement.addEventListener('hidden.bs.modal', () => {
        // Reset edit mode state when modal is closed
        this.isEditMode.set(false);
        this.editingProductId.set(null);
        // CRITICAL: Reset the entire form to clear all data
        this.resetForm();
      });
    }
  }

  loadProducts(): void {
    let activeError = false;
    let archivedError = false;

    // Load active products
    this.apiService.getProducts(undefined, 'Active').subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.activeProducts.set(response.data);
        }
      },
      error: (error) => {
        console.error('Error loading active products:', error);
        activeError = true;
        if (archivedError) {
          this.showMessage('Failed to load products. Please check your connection.', 'error');
        }
      }
    });

    // Load archived products
    this.apiService.getProducts(undefined, 'Archived').subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.archivedProducts.set(response.data);
        }
      },
      error: (error) => {
        console.error('Error loading archived products:', error);
        archivedError = true;
        if (activeError) {
          this.showMessage('Failed to load products. Please check your connection.', 'error');
        }
      }
    });
  }

  archiveProduct(productId: number): void {
    if (!confirm('Are you sure you want to archive this product? You can restore it later.')) {
      return;
    }

    this.apiService.archiveProduct(productId.toString()).subscribe({
      next: (response) => {
        if (response.success) {
          this.showMessage('Product archived successfully!', 'success');
          this.loadProducts();
        } else {
          this.showMessage('Failed to archive product', 'error');
        }
      },
      error: (error) => {
        this.showMessage('Failed to archive product', 'error');
      }
    });
  }

  restoreProduct(productId: number): void {
    this.apiService.restoreProduct(productId.toString()).subscribe({
      next: (response) => {
        if (response.success) {
          this.showMessage('Product restored successfully!', 'success');
          this.loadProducts();
        } else {
          this.showMessage('Failed to restore product', 'error');
        }
      },
      error: (error) => {
        this.showMessage('Failed to restore product', 'error');
      }
    });
  }

  deleteProductPermanently(productId: number): void {
    if (!confirm('⚠️ WARNING: This will PERMANENTLY delete this product. This action CANNOT be undone. Are you absolutely sure?')) {
      return;
    }

    this.apiService.deleteProductPermanently(productId.toString()).subscribe({
      next: (response) => {
        if (response.success) {
          this.showMessage('Product permanently deleted', 'success');
          this.loadProducts();
        } else {
          this.showMessage('Failed to delete product', 'error');
        }
      },
      error: (error) => {
        this.showMessage('Failed to delete product', 'error');
      }
    });
  }

  editProduct(product: ProductData): void {
    this.isEditMode.set(true);
    this.editingProductId.set(product.product_id || null);
    
    const colors = this.parseJsonField(product.colors);
    const sizes = this.parseJsonField(product.sizes);
    const images = this.parseJsonField(product.images);
    
    this.productForm = {
      name: product.product_name,
      category: product.category,
      basePrice: product.base_price.toString(),
      description: product.description || '',
      stockQuantity: product.stock_quantity || 0,
      sku: product.sku || '',
      sizes: sizes,
      imageUrl: product.image_url,
      cloudinary_public_id: product.cloudinary_public_id || undefined,
      colors: colors,
      material: product.material || '',
      gender: (product.gender as any) || 'Unisex',
      imageFiles: [],
      imageUrls: images,
      allows_customization: product.allows_customization ?? true,
      production_days: product.production_days || 3
    };
    
    
    setTimeout(() => {
      const checkboxes = document.querySelectorAll('input[type="checkbox"][id^="size-"]');
      checkboxes.forEach((cb: any) => {
        cb.checked = sizes.includes(cb.value);
      });
    }, 0);
    
    const modal = new (window as any).bootstrap.Modal(document.getElementById('addProductModal')!);
    modal.show();
  }

  private showMessage(message: string, type: 'success' | 'error' | 'info'): void {
    console.log('Showing message:', message, 'Type:', type);
    this.message.set(message);
    this.messageType.set(type);
    console.log('Message set:', this.message(), 'Type set:', this.messageType());
  }

  onSizeChange(event: Event, size: string): void {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      if (!this.productForm.sizes.includes(size)) {
        this.productForm.sizes.push(size);
      }
    } else {
      this.productForm.sizes = this.productForm.sizes.filter(s => s !== size);
    }
  }

  getNewImagePreviews(): string[] {
    return this.newImagePreviews;
  }

  // NEW: Color management methods
  addColor(): void {
    const color = this.newColor.trim();
    if (color && !this.productForm.colors.includes(color)) {
      this.productForm.colors.push(color);
      this.newColor = '';
    }
  }

  removeColor(color: string): void {
    this.productForm.colors = this.productForm.colors.filter(c => c !== color);
  }

  // Multiple image upload handler
  onMultipleImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const filesArray = Array.from(input.files);
      
      // Validate each file
      for (const file of filesArray) {
        if (!['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'].includes(file.type)) {
          alert('⚠️ Only JPG, PNG, SVG images allowed');
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          alert('⚠️ Each image must be less than 5MB');
          return;
        }
      }
      
      this.productForm.imageFiles = filesArray;
      
      // Clear previous new image previews
      this.newImagePreviews = [];
      
      // Create local preview URLs for new uploads
      filesArray.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.newImagePreviews.push(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      });
    }
  }


  async onSaveProduct(): Promise<void> {
    // Validate required fields
    if (!this.productForm.name || !this.productForm.category || !this.productForm.basePrice) {
      alert('⚠️ Please fill in all required fields (Name, Category, Base Price)');
      return;
    }

    // Validate price
    const numericPrice = this.getNumericPrice();
    if (numericPrice <= 0) {
      alert('⚠️ Please enter a valid price greater than ₱0.00');
      return;
    }

    // Images required ONLY for CREATE mode
    if (!this.isEditMode() && this.productForm.imageFiles.length === 0) {
      alert('⚠️ Please select at least one product image');
      return;
    }

    // Colors required ONLY for CREATE mode
    if (!this.isEditMode() && this.productForm.colors.length === 0) {
      alert('⚠️ Please add at least one color');
      return;
    }

    if (this.productForm.production_days < 1) {
      alert('⚠️ Production days must be at least 1');
      return;
    }

    try {
      this.isUploading.set(true);

      // PRESERVE existing images and upload new ones
      let allImageUrls = [...this.productForm.imageUrls];

      if (this.productForm.imageFiles.length > 0) {
        this.showMessage('📤 Uploading product images...', 'info');
        const multipleResults = await this.cloudinaryService.uploadMultipleImages(
          this.productForm.imageFiles,
          this.productForm.name
        );
        const newImageUrls = multipleResults.map(r => r.secure_url);
        allImageUrls = [...allImageUrls, ...newImageUrls];
      }

      // First image is the primary image
      const primaryImageUrl = allImageUrls[0] || '';
      const cloudinaryPublicId = ''; // We can extract this from URL if needed

      this.isUploading.set(false);
      this.showMessage('💾 Saving product...', 'info');

      // Prepare product data with NEW FIELDS
      const productData = {
        product_name: this.productForm.name,
        category: this.productForm.category,
        base_price: numericPrice,
        description: this.productForm.description,
        image_url: primaryImageUrl,
        cloudinary_public_id: cloudinaryPublicId || undefined,
        status: 'Active' as const,
        stock_quantity: this.productForm.stockQuantity || 0,
        sku: this.productForm.sku || null,
        sizes: this.productForm.sizes.length > 0 ? JSON.stringify(this.productForm.sizes) : null,
        tags: null,
        // NEW FIELDS
        colors: JSON.stringify(this.productForm.colors),
        images: allImageUrls.length > 0 ? JSON.stringify(allImageUrls) : null,
        material: this.productForm.material || null,
        gender: this.productForm.gender,
        allows_customization: this.productForm.allows_customization,
        production_days: this.productForm.production_days
      };

      // Call appropriate API method
      if (this.isEditMode()) {
        this.apiService.updateProduct(this.editingProductId()!.toString(), productData).subscribe({
          next: (response) => {
            if (response.success) {
              this.showMessage('✓ Product updated successfully!', 'success');
              this.loadProducts();
              this.closeModalAndReset();
            } else {
              this.showMessage('✗ ' + response.message, 'error');
            }
          },
          error: (error) => {
            if (error.message?.includes('duplicate') || error.message?.includes('ER_DUP_ENTRY')) {
              this.showMessage('✗ Product name already exists. Please choose a different name.', 'error');
            } else {
              this.showMessage('✗ Failed to update product.', 'error');
            }
          }
        });
      } else {
        this.apiService.createProduct(productData).subscribe({
          next: (response) => {
            if (response.success) {
              this.showMessage('✓ Product created successfully!', 'success');
              this.loadProducts();
              this.closeModalAndReset();
            } else {
              this.showMessage('✗ ' + response.message, 'error');
            }
          },
          error: (error) => {
            this.showMessage('✗ Failed to create product.', 'error');
          }
        });
      }
    } catch (error: any) {
      console.error('Error saving product:', error);
      this.isUploading.set(false);
      this.showMessage('✗ Failed to save product: ' + error.message, 'error');
    }
  }

  onPriceInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;
    
    // Remove any non-numeric characters except decimal point
    value = value.replace(/[^0-9.]/g, '');
    
    // Handle multiple decimal points
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Handle empty values
    if (value === '' || value === '.') {
      this.productForm.basePrice = '0';
      input.value = '';
      return;
    }
    
    // Parse the number
    const number = parseFloat(value);
    if (!isNaN(number) && number >= 0) {
      this.productForm.basePrice = number.toString();
    }
  }

  onPriceFocus(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Clear the input to show just the numeric value for easier editing
    const numericValue = this.productForm.basePrice === '0' ? '' : this.productForm.basePrice;
    input.value = numericValue;
  }

  onPriceBlur(event: Event): void {
    const input = event.target as HTMLInputElement;
    const number = parseFloat(this.productForm.basePrice) || 0;
    input.value = `₱${number.toFixed(2)}`;
    this.productForm.basePrice = number.toString();
  }

  private getNumericPrice(): number {
    return parseFloat(this.productForm.basePrice) || 0;
  }

  private resetForm(): void {
    this.productForm = {
      name: '',
      category: '',
      basePrice: '0',
      description: '',
      stockQuantity: 0,
      sku: '',
      sizes: [],
      imageUrl: '',
      cloudinary_public_id: undefined,
      colors: [],
      material: '',
      gender: 'Unisex',
      imageFiles: [],
      imageUrls: [],
      allows_customization: true,
      production_days: 3
    };
    this.newImagePreviews = [];
    this.isUploading.set(false);
    this.message.set('');
    this.messageType.set('');
    this.newColor = '';
    this.isEditMode.set(false);
    this.editingProductId.set(null);
    
    // Uncheck all size checkboxes
    const checkboxes = document.querySelectorAll('input[type="checkbox"][id^="size-"]');
    checkboxes.forEach((checkbox: any) => checkbox.checked = false);
  }

  private resetFormData(): void {
    this.productForm = {
      name: '',
      category: '',
      basePrice: '0',
      description: '',
      stockQuantity: 0,
      sku: '',
      sizes: [],
      imageUrl: '',
      cloudinary_public_id: undefined,
      colors: [],
      material: '',
      gender: 'Unisex',
      imageFiles: [],
      imageUrls: [],
      allows_customization: true,
      production_days: 3
    };
    this.newImagePreviews = [];
    this.isUploading.set(false);
    this.newColor = '';
    this.isEditMode.set(false);
    this.editingProductId.set(null);
    
    // Uncheck all size checkboxes
    const checkboxes = document.querySelectorAll('input[type="checkbox"][id^="size-"]');
    checkboxes.forEach((checkbox: any) => checkbox.checked = false);
    
    // Clear file inputs
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach((input: any) => input.value = '');
    
    // Don't clear messages here
  }


  // View product details
  viewProductDetails(product: ProductData): void {
    console.log('Opening product details for:', product);
    this.selectedProduct.set(product);
    console.log('Selected product set to:', this.selectedProduct());
    
    setTimeout(() => {
      // @ts-ignore - Bootstrap modal API
      const modal = new bootstrap.Modal(document.getElementById('productDetailsModal')!);
      modal.show();
    }, 0);
  }

  // Edit product from details modal
  editProductFromDetails(): void {
    // Close details modal first
    const detailsModal = document.getElementById('productDetailsModal');
    if (detailsModal) {
      // @ts-ignore
      bootstrap.Modal.getInstance(detailsModal)?.hide();
    }
    
    // Then call edit with selected product
    if (this.selectedProduct()) {
      this.editProduct(this.selectedProduct()!);
    }
  }

  // Parse sizes from JSON string
  getProductSizes(product: ProductData): string[] {
    if (!product.sizes) return [];
    
    try {
      if (typeof product.sizes === 'string') {
        return JSON.parse(product.sizes);
      }
      if (Array.isArray(product.sizes)) {
        return product.sizes;
      }
      return [];
    } catch {
      return [];
    }
  }

  // Format date for display
  formatDate(date: string | undefined): string {
    if (!date) return 'N/A';
    
    try {
      const d = new Date(date);
      return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  }

  // NEW: Helper methods for new fields
  getProductColors(product: ProductData): string[] {
    if (!product.colors) return [];
    try {
      return typeof product.colors === 'string' ? JSON.parse(product.colors) : [];
    } catch {
      return [];
    }
  }

  getProductImages(product: ProductData): string[] {
    if (!product.images) return [];
    try {
      return typeof product.images === 'string' ? JSON.parse(product.images) : [];
    } catch {
      return [];
    }
  }

  private parseJsonField(field: string | null | undefined): string[] {
    if (!field) return [];
    try {
      return typeof field === 'string' ? JSON.parse(field) : (Array.isArray(field) ? field : []);
    } catch {
      return [];
    }
  }

  removeExistingImage(index: number): void {
    this.productForm.imageUrls.splice(index, 1);
  }

  private closeModalAndReset(): void {
    setTimeout(() => {
      this.resetFormData();
      const modal = document.getElementById('addProductModal');
      if (modal) {
        (window as any).bootstrap.Modal.getInstance(modal)?.hide();
      }
      setTimeout(() => {
        this.message.set('');
        this.messageType.set('');
      }, 500);
    }, 3000);
  }
}