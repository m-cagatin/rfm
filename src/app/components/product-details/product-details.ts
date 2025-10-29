import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { ProductData, ApiResponse } from '../../services/api';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './product-details.html',
  styleUrl: './product-details.css'
})
export class ProductDetailsComponent implements OnInit {
  protected product = signal<ProductData | null>(null);
  protected loading = signal(true);
  protected error = signal<string | null>(null);
  protected selectedSize = signal<string>('');
  protected selectedColor = signal<string>('');
  protected quantity = signal<number>(1);
  protected selectedImageIndex = signal<number>(0);
  protected addingToCart = signal(false);
  protected addToCartSuccess = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private cartService: CartService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const productId = params['id'];
      if (productId) {
        this.loadProduct(productId);
      }
    });
  }

  private loadProduct(productId: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<ApiResponse<ProductData>>(`${environment.api.baseUrl}/catalog/${productId}`)
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.product.set(response.data);
            
            // Set default selections
            const colors = this.parseJsonField(response.data.colors);
            const sizes = this.parseJsonField(response.data.sizes);
            
            if (colors.length > 0) {
              this.selectedColor.set(colors[0]);
            }
            if (sizes.length > 0) {
              this.selectedSize.set(sizes[0]);
            }
          } else {
            this.error.set('Product not found');
          }
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading product:', error);
          this.error.set('Failed to load product details');
          this.loading.set(false);
        }
      });
  }

  parseJsonField(field: string | null | undefined): string[] {
    if (!field) return [];
    try {
      return Array.isArray(field) ? field : JSON.parse(field);
    } catch {
      return [];
    }
  }

  getProductImages(): string[] {
    const product = this.product();
    if (!product) return [];
    
    const images = this.parseJsonField(product.images);
    if (images.length > 0) {
      return images;
    }
    
    // Fallback to main image
    return product.image_url ? [product.image_url] : [];
  }

  selectImage(index: number): void {
    this.selectedImageIndex.set(index);
  }

  selectSize(size: string): void {
    this.selectedSize.set(size);
  }

  selectColor(color: string): void {
    this.selectedColor.set(color);
  }

  increaseQuantity(): void {
    const current = this.quantity();
    const product = this.product();
    const maxStock = product?.stock_quantity || 0;
    
    if (current < maxStock) {
      this.quantity.set(current + 1);
    }
  }

  decreaseQuantity(): void {
    const current = this.quantity();
    if (current > 1) {
      this.quantity.set(current - 1);
    }
  }

  addToCart(): void {
    const product = this.product();
    if (!product) return;

    // Check if user is logged in
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    // Validate selections
    const colors = this.parseJsonField(product.colors);
    const sizes = this.parseJsonField(product.sizes);
    
    if (colors.length > 0 && !this.selectedColor()) {
      this.error.set('Please select a color');
      return;
    }
    
    if (sizes.length > 0 && !this.selectedSize()) {
      this.error.set('Please select a size');
      return;
    }

    this.addingToCart.set(true);
    this.error.set(null);

    this.cartService.addToCart(
      product,
      this.quantity(),
      this.selectedSize() || undefined,
      this.selectedColor() || undefined
    );

    // Show success message
    this.addToCartSuccess.set(true);
    this.addingToCart.set(false);
    
    // Hide success message after 3 seconds
    setTimeout(() => {
      this.addToCartSuccess.set(false);
    }, 3000);
  }

  goToCustomization(): void {
    const product = this.product();
    if (product && product.allows_customization) {
      this.router.navigate(['/canvas'], { 
        queryParams: { 
          productId: product.product_id,
          productName: product.product_name,
          basePrice: product.base_price
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/apparel']);
  }

  shareProduct(): void {
    const product = this.product();
    if (product && navigator.share) {
      navigator.share({
        title: product.product_name,
        text: product.description || 'Check out this amazing product!',
        url: window.location.href
      }).catch(err => console.log('Error sharing:', err));
    } else {
      // Fallback: copy URL to clipboard
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert('Product link copied to clipboard!');
      });
    }
  }

  getAvailableStock(): number {
    const product = this.product();
    return product?.stock_quantity || 0;
  }

  isInStock(): boolean {
    return this.getAvailableStock() > 0;
  }

  getStockStatus(): string {
    const stock = this.getAvailableStock();
    if (stock === 0) return 'Out of Stock';
    if (stock < 10) return `Only ${stock} left`;
    return 'In Stock';
  }

  getStockBadgeClass(): string {
    const stock = this.getAvailableStock();
    if (stock === 0) return 'bg-danger';
    if (stock < 10) return 'bg-warning';
    return 'bg-success';
  }
}
