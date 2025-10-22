import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { ProductData } from './api';

export interface CartItem {
  cart_item_id?: number;
  product_id: number;
  product_name: string;
  quantity: number;
  size?: string;
  color?: string;
  unit_price: number;
  customization_data?: any;
  created_at?: string;
  updated_at?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly CART_STORAGE_KEY = 'rfm_guest_cart';
  
  // Cart state using signals
  private cartItems = signal<CartItem[]>([]);
  private isLoading = signal(false);
  private error = signal<string | null>(null);

  // Computed values
  public items = computed(() => this.cartItems());
  public itemCount = computed(() => this.cartItems().reduce((sum, item) => sum + item.quantity, 0));
  public totalAmount = computed(() => this.cartItems().reduce((sum, item) => sum + (item.unit_price * item.quantity), 0));
  public loading = computed(() => this.isLoading());
  public errorMessage = computed(() => this.error());

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    // Initialize cart on service creation
    this.initializeCart();
    
    // Listen for auth changes to merge guest cart
    // Note: This will be handled by the auth service when user logs in
  }

  private initializeCart(): void {
    if (this.authService.isAuthenticated()) {
      this.loadUserCart();
    } else {
      this.loadGuestCart();
    }
  }

  // Load cart from API (for logged-in users)
  private loadUserCart(): void {
    this.isLoading.set(true);
    this.error.set(null);
    
    this.http.get<ApiResponse<CartItem[]>>(`${environment.api.baseUrl}/cart`)
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.cartItems.set(response.data);
          }
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading user cart:', error);
          this.error.set('Failed to load cart');
          this.isLoading.set(false);
        }
      });
  }

  // Load cart from localStorage (for guests)
  private loadGuestCart(): void {
    try {
      const stored = localStorage.getItem(this.CART_STORAGE_KEY);
      if (stored) {
        const items = JSON.parse(stored);
        this.cartItems.set(items);
      }
    } catch (error) {
      console.error('Error loading guest cart:', error);
      this.clearGuestCart();
    }
  }

  // Save guest cart to localStorage
  private saveGuestCart(): void {
    if (!this.authService.isAuthenticated()) {
      try {
        localStorage.setItem(this.CART_STORAGE_KEY, JSON.stringify(this.cartItems()));
      } catch (error) {
        console.error('Error saving guest cart:', error);
      }
    }
  }

  // Clear guest cart from localStorage
  private clearGuestCart(): void {
    localStorage.removeItem(this.CART_STORAGE_KEY);
  }

  // Check if guest cart has items
  private isGuestCartEmpty(): boolean {
    return this.cartItems().length === 0;
  }

  // Add item to cart
  addToCart(product: ProductData, quantity: number = 1, size?: string, color?: string, customizationData?: any): void {
    const cartItem: CartItem = {
      product_id: product.product_id!,
      product_name: product.product_name,
      quantity,
      size,
      color,
      unit_price: product.base_price,
      customization_data: customizationData
    };

    if (this.authService.isAuthenticated()) {
      this.addToUserCart(cartItem);
    } else {
      this.addToGuestCart(cartItem);
    }
  }

  // Add to user cart (API call)
  private addToUserCart(cartItem: CartItem): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.http.post<ApiResponse<CartItem>>(`${environment.api.baseUrl}/cart`, cartItem)
      .subscribe({
        next: (response) => {
          if (response.success) {
            // Reload cart to get updated state
            this.loadUserCart();
          } else {
            this.error.set(response.message || 'Failed to add item to cart');
            this.isLoading.set(false);
          }
        },
        error: (error) => {
          console.error('Error adding to user cart:', error);
          this.error.set('Failed to add item to cart');
          this.isLoading.set(false);
        }
      });
  }

  // Add to guest cart (localStorage)
  private addToGuestCart(cartItem: CartItem): void {
    const currentItems = this.cartItems();
    
    // Check if item already exists (same product, size, color)
    const existingIndex = currentItems.findIndex(item => 
      item.product_id === cartItem.product_id &&
      item.size === cartItem.size &&
      item.color === cartItem.color
    );

    if (existingIndex >= 0) {
      // Update quantity
      currentItems[existingIndex].quantity += cartItem.quantity;
    } else {
      // Add new item
      currentItems.push(cartItem);
    }

    this.cartItems.set([...currentItems]);
    this.saveGuestCart();
  }

  // Update item quantity
  updateQuantity(cartItemId: number, quantity: number): void {
    if (this.authService.isAuthenticated()) {
      this.updateUserCartQuantity(cartItemId, quantity);
    } else {
      this.updateGuestCartQuantity(cartItemId, quantity);
    }
  }

  // Update user cart quantity (API call)
  private updateUserCartQuantity(cartItemId: number, quantity: number): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.http.put<ApiResponse>(`${environment.api.baseUrl}/cart/${cartItemId}`, { quantity })
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.loadUserCart();
          } else {
            this.error.set(response.message || 'Failed to update quantity');
            this.isLoading.set(false);
          }
        },
        error: (error) => {
          console.error('Error updating user cart quantity:', error);
          this.error.set('Failed to update quantity');
          this.isLoading.set(false);
        }
      });
  }

  // Update guest cart quantity (localStorage)
  private updateGuestCartQuantity(cartItemId: number, quantity: number): void {
    const currentItems = this.cartItems();
    const itemIndex = currentItems.findIndex(item => item.cart_item_id === cartItemId);
    
    if (itemIndex >= 0) {
      if (quantity <= 0) {
        currentItems.splice(itemIndex, 1);
      } else {
        currentItems[itemIndex].quantity = quantity;
      }
      
      this.cartItems.set([...currentItems]);
      this.saveGuestCart();
    }
  }

  // Remove item from cart
  removeItem(cartItemId: number): void {
    if (this.authService.isAuthenticated()) {
      this.removeFromUserCart(cartItemId);
    } else {
      this.removeFromGuestCart(cartItemId);
    }
  }

  // Remove from user cart (API call)
  private removeFromUserCart(cartItemId: number): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.http.delete<ApiResponse>(`${environment.api.baseUrl}/cart/${cartItemId}`)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.loadUserCart();
          } else {
            this.error.set(response.message || 'Failed to remove item');
            this.isLoading.set(false);
          }
        },
        error: (error) => {
          console.error('Error removing from user cart:', error);
          this.error.set('Failed to remove item');
          this.isLoading.set(false);
        }
      });
  }

  // Remove from guest cart (localStorage)
  private removeFromGuestCart(cartItemId: number): void {
    const currentItems = this.cartItems();
    const filteredItems = currentItems.filter(item => item.cart_item_id !== cartItemId);
    
    this.cartItems.set(filteredItems);
    this.saveGuestCart();
  }

  // Clear entire cart
  clearCart(): void {
    if (this.authService.isAuthenticated()) {
      this.clearUserCart();
    } else {
      this.clearGuestCart();
    }
  }

  // Clear user cart (API call)
  private clearUserCart(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.http.delete<ApiResponse>(`${environment.api.baseUrl}/cart`)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.cartItems.set([]);
          } else {
            this.error.set(response.message || 'Failed to clear cart');
          }
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error clearing user cart:', error);
          this.error.set('Failed to clear cart');
          this.isLoading.set(false);
        }
      });
  }

  // Clear guest cart (localStorage)
  private clearGuestCartStorage(): void {
    this.cartItems.set([]);
    localStorage.removeItem(this.CART_STORAGE_KEY);
  }

  // Merge guest cart on login
  private mergeGuestCartOnLogin(): void {
    const guestItems = this.cartItems();
    if (guestItems.length === 0) return;

    this.isLoading.set(true);
    this.error.set(null);

    // Remove cart_item_id from guest items before sending to API
    const itemsToMerge = guestItems.map(item => {
      const { cart_item_id, ...itemWithoutId } = item;
      return itemWithoutId;
    });

    this.http.post<ApiResponse>(`${environment.api.baseUrl}/cart/merge`, { items: itemsToMerge })
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.clearGuestCartStorage();
            this.loadUserCart();
          } else {
            this.error.set(response.message || 'Failed to merge cart');
            this.isLoading.set(false);
          }
        },
        error: (error) => {
          console.error('Error merging guest cart:', error);
          this.error.set('Failed to merge cart');
          this.isLoading.set(false);
        }
      });
  }

  // Get cart item by product ID, size, and color
  getCartItem(productId: number, size?: string, color?: string): CartItem | undefined {
    return this.cartItems().find(item => 
      item.product_id === productId &&
      item.size === size &&
      item.color === color
    );
  }

  // Check if product is in cart
  isInCart(productId: number, size?: string, color?: string): boolean {
    return this.getCartItem(productId, size, color) !== undefined;
  }

  // Get quantity of specific product in cart
  getQuantity(productId: number, size?: string, color?: string): number {
    const item = this.getCartItem(productId, size, color);
    return item ? item.quantity : 0;
  }

  // Refresh cart (useful after login/logout)
  refreshCart(): void {
    this.initializeCart();
  }
}
