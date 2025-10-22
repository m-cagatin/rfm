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
  protected cartItems = signal<CartItem[]>([]);
  protected itemCount = signal(0);
  protected totalAmount = signal(0);
  protected loading = signal(false);
  protected error = signal<string | null>(null);

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCart();
  }

  private loadCart(): void {
    // Use computed signals directly
    this.cartItems.set(this.cartService.items());
    this.itemCount.set(this.cartService.itemCount());
    this.totalAmount.set(this.cartService.totalAmount());
    this.loading.set(this.cartService.loading());
    this.error.set(this.cartService.errorMessage());
  }

  updateQuantity(item: CartItem, newQuantity: number): void {
    if (newQuantity < 1) {
      this.removeItem(item);
      return;
    }
    
    this.cartService.updateQuantity(item.cart_item_id!, newQuantity);
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
}
