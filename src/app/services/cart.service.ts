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
  private isLoadingCart = false; // Prevent duplicate API calls

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
    
    // Listen for auth state changes
    // Use a small delay to ensure auth state is properly set
    setTimeout(() => {
      if (this.authService.isAuthenticated()) {
        this.loadUserCart();
      }
    }, 100);

    // Listen for logout events to clear cart
    window.addEventListener('user-logout', () => {
      console.log('User logged out, clearing cart');
      this.clearCartOnLogout();
    });
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
    if (!this.authService.isAuthenticated()) {
      console.log('User not authenticated, skipping cart load');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    
    console.log('Loading user cart from API...');
    
    this.http.get<ApiResponse<CartItem[]>>(`${environment.api.baseUrl}/cart`)
      .subscribe({
        next: (response) => {
          console.log('Cart API response:', response);
          if (response.success && response.data) {
            this.cartItems.set(response.data);
            console.log('Cart loaded successfully:', response.data.length, 'items');
          } else {
            console.log('Cart API returned no data or failed:', response);
          }
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading user cart:', error);
          console.error('Error details:', {
            status: error.status,
            message: error.message,
            url: error.url
          });
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
    console.log('CartService.addToCart called for:', product.product_name, 'quantity:', quantity);
    
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
      console.log('Adding to user cart');
      this.addToUserCart(cartItem);
    } else {
      console.log('Adding to guest cart');
      this.addToGuestCart(cartItem);
    }
  }

  // Add to user cart (API call)
  private addToUserCart(cartItem: CartItem): void {
    console.log('addToUserCart called for:', cartItem.product_name);
    this.isLoading.set(true);
    this.error.set(null);

    this.http.post<ApiResponse<CartItem>>(`${environment.api.baseUrl}/cart`, cartItem)
      .subscribe({
        next: (response) => {
          console.log('API response:', response);
          if (response.success) {
            // Reload cart to get updated state
            console.log('Reloading user cart after successful add');
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
    console.log('Updating user cart quantity:', cartItemId, 'to', quantity);
    
    // Optimistically update the UI first
    const currentItems = this.cartItems();
    const itemIndex = currentItems.findIndex(item => item.cart_item_id === cartItemId);
    
    if (itemIndex >= 0) {
      const updatedItems = [...currentItems];
      updatedItems[itemIndex] = { ...updatedItems[itemIndex], quantity };
      this.cartItems.set(updatedItems);
      console.log('Optimistically updated cart item quantity');
    }

    this.isLoading.set(true);
    this.error.set(null);

    this.http.put<ApiResponse>(`${environment.api.baseUrl}/cart/${cartItemId}`, { quantity })
      .subscribe({
        next: (response) => {
          console.log('Cart quantity update API response:', response);
          if (response.success) {
            // Reload cart to ensure consistency with backend
            this.loadUserCart();
          } else {
            // Revert optimistic update on failure
            this.loadUserCart();
            this.error.set(response.message || 'Failed to update quantity');
            this.isLoading.set(false);
          }
        },
        error: (error) => {
          console.error('Error updating user cart quantity:', error);
          // Revert optimistic update on error
          this.loadUserCart();
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
    console.log('Refreshing cart, authenticated:', this.authService.isAuthenticated());
    if (this.authService.isAuthenticated()) {
      // Always load user cart from database (don't check for guest cart here)
      console.log('Loading user cart from database');
      this.loadUserCart();
    } else {
      // User logged out - load guest cart
      this.loadGuestCart();
    }
  }

  // Force reload cart from API (public method)
  forceReloadCart(): void {
    console.log('Force reloading cart...');
    if (this.authService.isAuthenticated()) {
      this.loadUserCart();
    } else {
      this.loadGuestCart();
    }
  }

  // Clear cart on logout (security measure)
  private clearCartOnLogout(): void {
    console.log('Clearing cart data on logout');
    this.cartItems.set([]);
    this.isLoading.set(false);
    this.error.set(null);
    localStorage.removeItem(this.CART_STORAGE_KEY);
  }
}
