import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CustomizableProductFormComponent } from './customizable-product-form';
import { ApiService } from '../../../services/api';

interface CustomizableProduct {
  id: number;
  name: string;
  category: string;
  brand?: string;
  front_image_url: string;
  back_image_url?: string;
  retail_price: number;
  available_sizes: string[];
  available_colors: any[];
  is_active: boolean;
  created_at: string;
  size_pricing?: any;
}

@Component({
  selector: 'app-admin-customizable-products',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './customizable-products.html',
  styleUrls: ['./customizable-products.css']
})
export class AdminCustomizableProductsComponent implements OnInit {
  showForm = signal(false);
  formComponent = CustomizableProductFormComponent;
  
  products = signal<CustomizableProduct[]>([]);
  loading = signal(false);
  selectedProduct = signal<CustomizableProduct | null>(null);
  showDetails = signal(false);
  
  constructor(private apiService: ApiService) {}
  
  ngOnInit() {
    this.loadProducts();
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
  
  viewDetails(product: CustomizableProduct) {
    this.selectedProduct.set(product);
    this.showDetails.set(true);
  }
  
  closeDetails() {
    this.showDetails.set(false);
    this.selectedProduct.set(null);
  }
  
  editProduct(product: CustomizableProduct) {
    // TODO: Implement edit functionality
    alert('Edit functionality coming soon!');
  }
  
  toggleActive(product: CustomizableProduct) {
    const newStatus = !product.is_active;
    this.apiService.updateCustomizableProduct(String(product.id), { is_active: newStatus }).subscribe({
      next: () => {
        product.is_active = newStatus;
        alert(`Product ${newStatus ? 'published' : 'unpublished'} successfully!`);
      },
      error: (error) => {
        console.error('Error updating product:', error);
        alert('Failed to update product status');
      }
    });
  }
  
  deleteProduct(product: CustomizableProduct) {
    if (!confirm(`Are you sure you want to delete "${product.name}"? This cannot be undone.`)) {
      return;
    }
    
    this.apiService.deleteCustomizableProduct(String(product.id)).subscribe({
      next: () => {
        this.products.set(this.products().filter(p => p.id !== product.id));
        alert('Product deleted successfully!');
      },
      error: (error) => {
        console.error('Error deleting product:', error);
        alert('Failed to delete product');
      }
    });
  }
  
  addNewProduct() {
    this.showForm.set(true);
  }
  
  onProductSaved() {
    this.showForm.set(false);
    this.loadProducts();
  }
}
