import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService, CartItem } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cart.html',
  styleUrl: './cart.css'
})
export class CartComponent implements OnInit {
  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private router: Router
  ) {}

  // Use cart service signals directly for reactivity
  protected get cartItems() { return this.cartService.items; }
  protected get itemCount() { return this.cartService.itemCount; }
  protected get totalAmount() { return this.cartService.totalAmount; }
  protected get loading() { return this.cartService.loading; }
  protected get error() { return this.cartService.errorMessage; }

  ngOnInit(): void {
    // Cart is already loaded by the service, no need to refresh
    console.log('Cart component initialized');
  }

  updateQuantity(item: CartItem, newQuantity: number): void {
    console.log('Updating quantity:', item.product_name, 'from', item.quantity, 'to', newQuantity);
    
    if (newQuantity < 1) {
      this.removeItem(item);
      return;
    }
    
    // Validate quantity
    if (newQuantity > 99) {
      newQuantity = 99;
    }
    
    // Update via cart service
    this.cartService.updateQuantity(item.cart_item_id!, newQuantity);
    
    // Log for debugging
    console.log('Cart service called for quantity update');
  }

  removeItem(item: CartItem): void {
    if (confirm(`Remove ${item.product_name} from cart?`)) {
      this.cartService.removeItem(item.cart_item_id!);
    }
  }

  clearCart(): void {
    if (confirm('Clear all items from cart?')) {
      this.cartService.clearCart();
    }
  }

  proceedToCheckout(): void {
    if (!this.authService.isAuthenticated()) {
      alert('Please log in to proceed to checkout');
      this.router.navigate(['/login']);
      return;
    }
    
    if (this.cartItems().length === 0) {
      alert('Your cart is empty');
      return;
    }
    
    this.router.navigate(['/checkout']);
  }

  continueShopping(): void {
    this.router.navigate(['/apparel']);
  }

  clearError(): void {
    // Clear error by refreshing cart (which resets error state)
    this.cartService.refreshCart();
  }
}
