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
  imageUrl: string;
  imageFile: File | null;
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
    imageFile: null
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
  protected uploadedImageUrl = signal<string | null>(null);
  protected selectedFile = signal<string | null>(null);
  protected message = signal('');
  protected messageType = signal<'success' | 'error' | 'info' | ''>('');

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
    // TODO: Implement edit functionality
    // This will open the modal with pre-filled data
    console.log('Edit product:', product);
    alert('Edit functionality coming soon!');
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

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
      if (!validTypes.includes(file.type)) {
        alert('⚠️ Please upload a valid image file (JPG, PNG, SVG)');
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        alert('⚠️ File size must be less than 5MB');
        return;
      }

      // Store the file and show preview
      this.productForm.imageFile = file;
      this.selectedFile.set(file.name);

      // Create a local preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        this.uploadedImageUrl.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async uploadImageToCloudinary(file: File): Promise<void> {
    try {
      this.isUploading.set(true);
      this.showMessage('📤 Uploading image to Cloudinary...', 'info');
      
      const result: UploadResponse = await this.cloudinaryService.uploadImage(file);
      
      // Store the Cloudinary URL
      this.productForm.imageUrl = result.secure_url;
      this.uploadedImageUrl.set(this.cloudinaryService.getThumbnailUrl(result.public_id, 200));
      
      console.log('Image uploaded successfully:', result);
      this.showMessage('✓ Image uploaded successfully!', 'success');
    } catch (error) {
      console.error('Upload failed:', error);
      this.showMessage('✗ Failed to upload image. Please try again.', 'error');
    } finally {
      this.isUploading.set(false);
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

    // Check if image file is selected
    if (!this.productForm.imageFile) {
      alert('⚠️ Please select a product image');
      return;
    }

    try {
      // Upload image with product name as filename
      this.isUploading.set(true);
      this.showMessage('📤 Uploading image to Cloudinary...', 'info');
      
      const result = await this.cloudinaryService.uploadImageWithProductName(
        this.productForm.imageFile!,
        this.productForm.name
      );
      
      this.productForm.imageUrl = result.secure_url;
      const cloudinaryPublicId = result.public_id;
      this.isUploading.set(false);

      if (!this.productForm.imageUrl) {
        return;
      }

      // Show saving progress
      this.showMessage('💾 Saving product...', 'info');

      // Prepare product data
      const productData = {
        product_name: this.productForm.name,
        category: this.productForm.category,
        base_price: numericPrice,
        description: this.productForm.description,
        image_url: this.productForm.imageUrl,
        cloudinary_public_id: cloudinaryPublicId,
        status: 'Active' as const,
        stock_quantity: this.productForm.stockQuantity || 0,
        sku: this.productForm.sku || null,
        sizes: this.productForm.sizes.length > 0 ? JSON.stringify(this.productForm.sizes) : null,
        tags: null
      };

      // Call API
      this.apiService.createProduct(productData).subscribe({
        next: (response) => {
          if (response.success) {
            this.showMessage('✓ Product saved successfully!', 'success');
            this.loadProducts();
            
            setTimeout(() => {
              this.resetFormData();
              const modal = document.getElementById('addProductModal');
              if (modal) {
                // @ts-ignore
                bootstrap.Modal.getInstance(modal)?.hide();
              }
              setTimeout(() => {
                this.message.set('');
                this.messageType.set('');
              }, 500);
            }, 3000);
          } else {
            this.showMessage('✗ ' + response.message, 'error');
          }
        },
        error: (error) => {
          this.showMessage('✗ Failed to save product. Please try again.', 'error');
        }
      });
    } catch (error: any) {
      console.error('Error saving product:', error);
      this.isUploading.set(false);
      if (error.message?.includes('already exists')) {
        this.showMessage('✗ Product name already exists. Please choose a different name.', 'error');
      } else {
        this.showMessage('✗ Failed to save product: ' + error.message, 'error');
      }
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
      imageFile: null
    };
    this.uploadedImageUrl.set(null);
    this.selectedFile.set(null);
    this.isUploading.set(false);
    this.message.set('');
    this.messageType.set('');
    
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
      imageFile: null
    };
    this.uploadedImageUrl.set(null);
    this.selectedFile.set(null);
    this.isUploading.set(false);
    
    // Uncheck all size checkboxes
    const checkboxes = document.querySelectorAll('input[type="checkbox"][id^="size-"]');
    checkboxes.forEach((checkbox: any) => checkbox.checked = false);
    
    // Don't clear messages here
  }

  removeSelectedImage(): void {
    this.productForm.imageFile = null;
    this.productForm.imageUrl = '';
    this.uploadedImageUrl.set(null);
    this.selectedFile.set(null);
    
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
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
}