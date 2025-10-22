import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService, CartItem } from '../../services/cart.service';
import { OrderService, CreateOrderRequest, Order } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css'
})
export class CheckoutComponent implements OnInit {
  protected cartItems = signal<CartItem[]>([]);
  protected itemCount = signal(0);
  protected totalAmount = signal(0);
  protected loading = signal(false);
  protected error = signal<string | null>(null);
  protected orderSuccess = signal(false);
  protected createdOrder = signal<Order | null>(null);

  // Form data
  protected checkoutForm = {
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    notes: ''
  };

  constructor(
    private cartService: CartService,
    private orderService: OrderService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadCart();
    this.loadUserData();
  }

  private loadCart(): void {
    // Get cart data from cart service
    this.cartItems.set(this.cartService.items());
    this.itemCount.set(this.cartService.itemCount());
    this.totalAmount.set(this.cartService.totalAmount());
  }

  private loadUserData(): void {
    // Pre-fill form with user data if available
    const user = this.authService.getCurrentUser();
    if (user) {
      this.checkoutForm.customer_name = user.name || '';
      this.checkoutForm.customer_email = user.email || '';
      this.checkoutForm.customer_phone = user.phone || '';
      this.checkoutForm.customer_address = user.address || '';
    }
  }

  onSubmit(): void {
    // Validate form
    if (!this.validateForm()) {
      return;
    }

    // Check if cart has items
    if (this.cartItems().length === 0) {
      this.error.set('Your cart is empty. Please add items before checkout.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    // Create order request
    const orderRequest: CreateOrderRequest = {
      customer_name: this.checkoutForm.customer_name,
      customer_email: this.checkoutForm.customer_email,
      customer_phone: this.checkoutForm.customer_phone || undefined,
      customer_address: this.checkoutForm.customer_address || undefined,
      notes: this.checkoutForm.notes || undefined
    };

    // Create order
    this.orderService.createOrder(orderRequest)
      .then((response) => {
        if (response.success && response.data) {
          this.createdOrder.set(response.data);
          this.orderSuccess.set(true);
          this.loading.set(false);
          
          // Clear cart after successful order
          this.cartService.clearCart();
        } else {
          this.error.set(response.message || 'Failed to create order');
          this.loading.set(false);
        }
      })
      .catch((error) => {
        console.error('Error creating order:', error);
        this.error.set('Failed to create order. Please try again.');
        this.loading.set(false);
      });
  }

  private validateForm(): boolean {
    if (!this.checkoutForm.customer_name.trim()) {
      this.error.set('Customer name is required');
      return false;
    }

    if (!this.checkoutForm.customer_email.trim()) {
      this.error.set('Customer email is required');
      return false;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.checkoutForm.customer_email)) {
      this.error.set('Please enter a valid email address');
      return false;
    }

    return true;
  }

  continueShopping(): void {
    this.router.navigate(['/apparel']);
  }

  viewOrderHistory(): void {
    this.router.navigate(['/orders']);
  }

  goBackToCart(): void {
    this.router.navigate(['/cart']);
  }

  clearError(): void {
    this.error.set(null);
  }
}
