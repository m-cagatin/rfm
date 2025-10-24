import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService, CartItem } from '../../services/cart.service';
import { OrderService, CreateOrderRequest, Order } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';
import { PaymentService } from '../../services/payment.service';
import { environment } from '../../../environments/environment';

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
  protected awaitingPayment = signal(false);
  protected paymentMethod = signal<'paymongo' | 'gcash' | 'bank_transfer' | 'cod'>('paymongo');
  protected paymentLink = signal<string | null>(null);
  protected paymentInstructions = signal<any>(null);

  // Form data
  protected checkoutForm = {
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    notes: ''
  };

  // Payment config
  protected paymentConfig = environment.payment;

  constructor(
    private cartService: CartService,
    private orderService: OrderService,
    private authService: AuthService,
    private paymentService: PaymentService,
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
      
      // Build complete address from user data
      let fullAddress = user.address || '';
      if (user.city) fullAddress += `, ${user.city}`;
      if (user.province) fullAddress += `, ${user.province}`;
      if (user.postalCode) fullAddress += ` ${user.postalCode}`;
      if (user.country && user.country !== 'Philippines') fullAddress += `, ${user.country}`;
      
      this.checkoutForm.customer_address = fullAddress;
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
          this.loading.set(false);
          
          // Process payment based on selected method
          this.processPayment(response.data);
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

  private processPayment(order: Order): void {
    const method = this.paymentMethod();
    
    if (method === 'paymongo') {
      // Generate PayMongo payment link
      this.loading.set(true);
      this.paymentService.createPaymentLink(
        order.order_id!,
        order.total_amount,
        `Payment for Order ${order.order_ref}`
      ).then((response) => {
        this.loading.set(false);
        if (response.success && response.paymentLinkUrl) {
          this.paymentLink.set(response.paymentLinkUrl);
          this.awaitingPayment.set(true);
          // Redirect to PayMongo
          window.open(response.paymentLinkUrl, '_blank');
        } else {
          this.error.set('Failed to generate payment link. Please contact support.');
        }
      }).catch((error) => {
        this.loading.set(false);
        this.error.set('Failed to generate payment link. Please try again.');
      });
    } else if (method === 'gcash' || method === 'bank_transfer') {
      // Create manual payment record
      this.loading.set(true);
      this.paymentService.createManualPayment(
        order.order_id!,
        method,
        order.total_amount
      ).then((response) => {
        this.loading.set(false);
        if (response.success) {
          // Show manual payment instructions
          this.paymentInstructions.set({
            method: method,
            amount: order.total_amount,
            orderRef: order.order_ref,
            paymentId: response.paymentId
          });
          this.awaitingPayment.set(true);
        } else {
          this.error.set('Failed to process payment. Please try again.');
        }
      }).catch((error) => {
        this.loading.set(false);
        this.error.set('Failed to process payment. Please try again.');
      });
    } else if (method === 'cod') {
      // Cash on Delivery - order is complete
      this.orderSuccess.set(true);
      this.cartService.clearCart();
    }
  }

  onPaymentComplete(): void {
    // Called when customer confirms payment is done
    // For PayMongo - verify payment status via API
    const order = this.createdOrder();
    if (!order) {
      this.error.set('Order not found. Please contact support.');
      return;
    }

    if (this.paymentMethod() === 'paymongo') {
      // For PayMongo, we should verify payment status
      this.loading.set(true);
      this.paymentService.checkPaymentStatus(order.order_id!)
        .then((response) => {
          this.loading.set(false);
          if (response.success && response.isPaid) {
            // Payment confirmed by PayMongo
            this.orderSuccess.set(true);
            this.awaitingPayment.set(false);
            this.cartService.clearCart();
          } else {
            // Payment not yet confirmed
            this.error.set('Payment not yet confirmed. Please wait a moment and try again, or contact support if you have completed payment.');
          }
        })
        .catch((error) => {
          this.loading.set(false);
          this.error.set('Unable to verify payment status. Please contact support.');
        });
    } else {
      // For manual payments (GCash, Bank Transfer), just show success
      // Admin will verify payment later
      this.orderSuccess.set(true);
      this.awaitingPayment.set(false);
      this.cartService.clearCart();
    }
  }

  selectPaymentMethod(method: 'paymongo' | 'gcash' | 'bank_transfer' | 'cod'): void {
    this.paymentMethod.set(method);
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
