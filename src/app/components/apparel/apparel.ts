import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ProductData, ApiResponse } from '../../services/api';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-apparel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './apparel.html',
  styleUrl: './apparel.css'
})
export class ApparelComponent implements OnInit {
  protected products = signal<ProductData[]>([]);
  protected loading = signal(true);
  protected error = signal<string | null>(null);
  protected favorites = signal<Set<number>>(new Set());

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private cartService: CartService
  ) {
    // Load favorites from localStorage
    this.loadFavorites();
  }

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

  parseJsonField(field: string | null | undefined): string[] {
    if (!field) return [];
    try {
      return typeof field === 'string' ? JSON.parse(field) : field;
    } catch {
      return [];
    }
  }

  addToCart(product: ProductData): void {
    // Check if user is logged in
    if (!this.authService.isAuthenticated()) {
      alert('Please log in to add items to cart');
      this.router.navigate(['/login']);
      return;
    }

    console.log('Adding to cart:', product.product_name);
    
    // Add to cart using cart service
    this.cartService.addToCart(product, 1);
    
    // Show success message
    alert(`Added ${product.product_name} to cart!`);
  }

  viewCustomization(product: ProductData): void {
    // Navigate to customization page with product ID
    this.router.navigate(['/customization'], { 
      queryParams: { productId: product.product_id } 
    });
  }

  viewProductDetails(product: ProductData): void {
    // Navigate to product details page
    this.router.navigate(['/product', product.product_id]);
  }

  viewProduct(product: ProductData): void {
    // Navigate to product detail or customization page
    if (product.allows_customization) {
      this.viewCustomization(product);
    } else {
      // For now, just add to cart
      this.addToCart(product);
    }
  }

  toggleFavorite(product: ProductData, event: Event): void {
    event.stopPropagation();
    
    if (!product.product_id) return;
    
    const currentFavorites = new Set(this.favorites());
    
    if (currentFavorites.has(product.product_id)) {
      currentFavorites.delete(product.product_id);
    } else {
      currentFavorites.add(product.product_id);
    }
    
    this.favorites.set(currentFavorites);
    this.saveFavorites();
  }

  isFavorite(productId: number): boolean {
    return this.favorites().has(productId);
  }

  isNewProduct(product: ProductData): boolean {
    // Check if product was created in the last 30 days
    if (!product.created_at) return false;
    
    const createdDate = new Date(product.created_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return createdDate > thirtyDaysAgo;
  }

  countPrintProviders(product: ProductData): number {
    // Mock count - you can replace this with actual data from your backend
    return Math.floor(Math.random() * 5) + 2;
  }

  private loadFavorites(): void {
    try {
      const stored = localStorage.getItem('productFavorites');
      if (stored) {
        const favArray = JSON.parse(stored);
        this.favorites.set(new Set(favArray));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  }

  private saveFavorites(): void {
    try {
      const favArray = Array.from(this.favorites());
      localStorage.setItem('productFavorites', JSON.stringify(favArray));
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  }
}
