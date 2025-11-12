import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { switchMap } from 'rxjs/operators';
import { CustomizableProductFormComponent } from './customizable-product-form';
import { ApiService } from '../../../services/api';
import { CloudinaryService } from '../../../services/cloudinary.service';

interface CustomizableProduct {
  id: number;
  product_code?: string;
  name: string;
  category: string;
  gender?: string;
  fit_type?: string;
  description?: string;
  images?: Array<CustomizableProductImage> | null;
  fabric_composition?: string;
  fabric_weight?: string;
  texture?: string;
  available_sizes: string[];
  size_chart_url?: string;
  fit_description?: string;
  size_pricing?: any;
  color_name?: string;
  color_hex?: string;
  variants?: Array<{ name: string; image_url: string }>;
  print_method?: string;
  print_areas?: string[];
  design_requirements?: string;
  base_cost?: number;
  retail_price: number;
  turnaround_time?: string;
  minimum_order_qty?: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  selected?: boolean; // For bulk selection
}

type ImageType = 'front' | 'back' | 'additional';

interface CustomizableProductImage {
  url: string;
  publicId?: string;
  imageType?: ImageType;
  displayOrder?: number;
  imageId?: number;
}

@Component({
  selector: 'app-admin-customizable-products',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CustomizableProductFormComponent],
  templateUrl: './customizable-products.html',
  styleUrls: ['./customizable-products.css']
})
export class AdminCustomizableProductsComponent implements OnInit {
  showForm = signal(false);
  editingProduct = signal<CustomizableProduct | null>(null);
  
  products = signal<CustomizableProduct[]>([]);
  loading = signal(false);
  selectedProduct = signal<CustomizableProduct | null>(null);
  showDetails = signal(false);
  
  // Bulk selection
  selectedProducts = signal<number[]>([]);
  selectAll = signal(false);
  
  // Filter - default to 'active'
  filterStatus = signal<'all' | 'active' | 'inactive'>('active');
  
  constructor(
    private apiService: ApiService, 
    private router: Router,
    private cloudinaryService: CloudinaryService
  ) {}
  
  ngOnInit() {
    this.loadProducts();
  }

  // Helper method to get product images
  getProductImages(product: CustomizableProduct): CustomizableProductImage[] {
    return this.normalizeImages(product.images);
  }

  private normalizeImages(images: any): CustomizableProductImage[] {
    if (!images) return [];

    const rawImages = Array.isArray(images)
      ? images
      : typeof images === 'string'
        ? this.safeParseImages(images)
        : [];

    return rawImages
      .map((img: any) => ({
        url: img.url,
        publicId: img.publicId ?? img.cloudinary_public_id,
        imageType: (img.imageType ?? img.image_type) as ImageType | undefined,
        displayOrder: img.displayOrder ?? img.display_order,
        imageId: img.imageId ?? img.image_id
      }))
      .filter(img => !!img.url);
  }

  private safeParseImages(value: string): any[] {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  // Get front image
  getFrontImage(product: CustomizableProduct): string {
    const images = this.getProductImages(product);
    const frontImg = images.find(img => img.imageType === 'front');
    return frontImg?.url || '/assets/placeholder.png';
  }

  // Get back image
  getBackImage(product: CustomizableProduct): string {
    const images = this.getProductImages(product);
    const backImg = images.find(img => img.imageType === 'back');
    return backImg?.url || '';
  }
  
  loadProducts() {
    this.loading.set(true);
    this.apiService.getCustomizableProducts().subscribe({
      next: (response: any) => {
        this.products.set(response.data || []);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.loading.set(false);
      }
    });
  }
  
  get filteredProducts() {
    const status = this.filterStatus();
    if (status === 'all') return this.products();
    if (status === 'active') return this.products().filter(p => p.is_active);
    return this.products().filter(p => !p.is_active);
  }
  
  get activeCount() {
    return this.products().filter(p => p.is_active).length;
  }
  
  get archivedCount() {
    return this.products().filter(p => !p.is_active).length;
  }
  
  // Bulk Selection Methods
  toggleSelectAll() {
    const newValue = !this.selectAll();
    this.selectAll.set(newValue);
    
    if (newValue) {
      this.selectedProducts.set(this.filteredProducts.map(p => p.id));
    } else {
      this.selectedProducts.set([]);
    }
  }
  
  toggleProductSelection(productId: number) {
    const selected = this.selectedProducts();
    if (selected.includes(productId)) {
      this.selectedProducts.set(selected.filter(id => id !== productId));
    } else {
      this.selectedProducts.set([...selected, productId]);
    }
    
    // Update selectAll checkbox state
    this.selectAll.set(this.selectedProducts().length === this.filteredProducts.length);
  }
  
  isProductSelected(productId: number): boolean {
    return this.selectedProducts().includes(productId);
  }
  
  // Check if all selected products are archived
  areAllSelectedArchived(): boolean {
    const selected = this.selectedProducts();
    if (selected.length === 0) return false;
    
    return selected.every(id => {
      const product = this.products().find(p => p.id === id);
      return product && !product.is_active;
    });
  }
  
  // Archive products (set is_active to false instead of deleting)
  archiveProduct(product: CustomizableProduct) {
    if (!confirm(`Archive "${product.name}"? It will be unpublished but not deleted.`)) {
      return;
    }
    
    // Fetch full product data first, then update with is_active change
    this.apiService.getCustomizableProductById(String(product.id)).subscribe({
      next: (response: any) => {
        const fullProduct = response.data;
        // Update the is_active field
        fullProduct.is_active = false;
        
        // Transform images array to match backend expectation (camelCase)
        fullProduct.images = this.normalizeImages(fullProduct.images);
        
        // Send full product data with updated status
        this.apiService.updateCustomizableProduct(String(product.id), fullProduct).subscribe({
          next: () => {
            product.is_active = false;
            alert('Product archived successfully!');
            // Reload products to update the filtered list
            this.loadProducts();
          },
          error: (error: any) => {
            console.error('Error archiving product:', error);
            alert('Failed to archive product');
          }
        });
      },
      error: (error: any) => {
        console.error('Error fetching product:', error);
        alert('Failed to fetch product data');
      }
    });
  }
  
  // Bulk Archive
  bulkArchive() {
    const count = this.selectedProducts().length;
    if (count === 0) {
      alert('Please select products to archive');
      return;
    }
    
    if (!confirm(`Archive ${count} selected product(s)? They will be unpublished but not deleted.`)) {
      return;
    }
    
    // Fetch each product, update is_active, then save
    const updates = this.selectedProducts().map(id => 
      this.apiService.getCustomizableProductById(String(id)).pipe(
        switchMap((response: any) => {
          const fullProduct = response.data;
          fullProduct.is_active = false;
          
          // Transform images array to match backend expectation (camelCase)
          fullProduct.images = this.normalizeImages(fullProduct.images);
          
          return this.apiService.updateCustomizableProduct(String(id), fullProduct);
        })
      )
    );
    
    Promise.all(updates.map(obs => obs.toPromise())).then(() => {
      this.selectedProducts().forEach(id => {
        const product = this.products().find(p => p.id === id);
        if (product) product.is_active = false;
      });
      this.selectedProducts.set([]);
      this.selectAll.set(false);
      alert(`${count} product(s) archived successfully!`);
    }).catch((error: any) => {
      console.error('Error archiving products:', error);
      alert('Failed to archive some products');
    });
  }
  
  // Permanent Delete (only for archived products)
  async deleteProduct(product: CustomizableProduct) {
    if (product.is_active) {
      alert('Please archive the product first before deleting permanently.');
      return;
    }
    
    if (!confirm(`⚠️ PERMANENTLY DELETE "${product.name}"? This cannot be undone!`)) {
      return;
    }
    
    try {
      // Step 1: Delete images from Cloudinary first
      const images = this.normalizeImages(product.images);
      if (images.length > 0) {
        console.log('🗑️ Deleting images from Cloudinary:', images);
        for (const img of images) {
          if (img.publicId) {
            try {
              await this.cloudinaryService.deleteImage(img.publicId);
              console.log('✅ Deleted image:', img.publicId);
            } catch (error) {
              console.warn('⚠️ Failed to delete image:', img.publicId, error);
              // Continue with other images even if one fails
            }
          }
        }
      }
      
      // Step 2: Delete from database (CASCADE will handle related tables)
      this.apiService.deleteCustomizableProduct(String(product.id)).subscribe({
        next: () => {
          this.products.set(this.products().filter(p => p.id !== product.id));
          alert('✅ Product and all associated images deleted successfully!');
        },
        error: (error) => {
          console.error('Error deleting product from database:', error);
          alert('❌ Failed to delete product from database. Images may have been deleted from Cloudinary.');
        }
      });
    } catch (error) {
      console.error('Error during delete operation:', error);
      alert('❌ Failed to delete product');
    }
  }
  
  // Bulk Delete (only archived products)
  bulkDelete() {
    const selected = this.selectedProducts();
    const archivedSelected = selected.filter(id => {
        const product = this.products().find(p => p.id === id);
      return product && !product.is_active;
    });
    
    if (archivedSelected.length === 0) {
      alert('Please select archived (unpublished) products to delete permanently.');
      return;
    }
    
    if (archivedSelected.length !== selected.length) {
      alert('Only archived products can be deleted. Please archive active products first.');
      return;
    }
    
    if (!confirm(`⚠️ PERMANENTLY DELETE ${archivedSelected.length} selected product(s)? This cannot be undone!`)) {
      return;
    }
    
    const deletions = archivedSelected.map(id => 
      this.apiService.deleteCustomizableProduct(String(id))
    );
    
    Promise.all(deletions.map(obs => obs.toPromise())).then(() => {
      this.products.set(this.products().filter(p => !archivedSelected.includes(p.id)));
      this.selectedProducts.set([]);
      this.selectAll.set(false);
      alert(`${archivedSelected.length} product(s) deleted permanently!`);
    }).catch(error => {
      console.error('Error deleting products:', error);
      alert('Failed to delete some products');
    });
  }
  
  viewDetails(product: CustomizableProduct) {
    // Fetch full product details including variants
    this.apiService.getCustomizableProductById(product.id.toString()).subscribe({
      next: (response: any) => {
        this.selectedProduct.set(response.data);
        this.showDetails.set(true);
      },
      error: (error: any) => {
        console.error('Error loading product details:', error);
        alert('Failed to load product details');
      }
    });
  }
  
  closeDetails() {
    this.showDetails.set(false);
    this.selectedProduct.set(null);
  }
  
  editProduct(product: CustomizableProduct) {
    console.log('🔧 Edit Product clicked:', product);
    
    // Fetch full product details including variants before editing
    this.apiService.getCustomizableProductById(product.id.toString()).subscribe({
      next: (response: any) => {
        console.log('📥 Full product data fetched for editing:', response.data);
        this.editingProduct.set(response.data);
        console.log('✅ editingProduct set to:', this.editingProduct());
        this.showDetails.set(false);
        this.showForm.set(true);
        console.log('📝 Form should now be visible in edit mode');
      },
      error: (error: any) => {
        console.error('Error loading product for editing:', error);
        alert('Failed to load product details for editing');
      }
    });
  }
  
  toggleActive(product: CustomizableProduct) {
    const newStatus = !product.is_active;
    const action = newStatus ? 'publish' : 'unpublish';
    
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} "${product.name}"?`)) {
      return;
    }
    
    // Fetch full product data first, then update with is_active change
    this.apiService.getCustomizableProductById(String(product.id)).subscribe({
      next: (response: any) => {
        const fullProduct = response.data;
        // Update the is_active field
        fullProduct.is_active = newStatus;
        
        // Transform images array to match backend expectation (camelCase)
        fullProduct.images = this.normalizeImages(fullProduct.images);
        
        // Send full product data with updated status
        this.apiService.updateCustomizableProduct(String(product.id), fullProduct).subscribe({
          next: () => {
            product.is_active = newStatus;
            alert(`Product ${action}ed successfully!`);
            // Reload products to update the filtered list
            this.loadProducts();
          },
          error: (error: any) => {
            console.error('Error updating product:', error);
            alert(`Failed to ${action} product`);
          }
        });
      },
      error: (error: any) => {
        console.error('Error fetching product:', error);
        alert('Failed to fetch product data');
      }
    });
  }
  
  addNewProduct() {
    this.editingProduct.set(null);
    this.showForm.set(true);
  }
  
  onProductSaved() {
    this.showForm.set(false);
    this.editingProduct.set(null);
    this.loadProducts();
  }
  
  handleFormCancel() {
    this.showForm.set(false);
    this.editingProduct.set(null);
  }
}
