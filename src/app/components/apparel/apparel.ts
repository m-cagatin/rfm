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

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private cartService: CartService
  ) {}

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

    // Add to cart using cart service
    this.cartService.addToCart(product, 1);
    alert(`Added ${product.product_name} to cart!`);
  }

  viewCustomization(product: ProductData): void {
    // Navigate to customization page with product ID
    this.router.navigate(['/customization'], { 
      queryParams: { productId: product.product_id } 
    });
  }
}
