import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { OrderService, Order, OrderItem } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { OrderTimelineComponent } from '../order-timeline/order-timeline';

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule, OrderTimelineComponent],
  templateUrl: './order-history.html',
  styleUrl: './order-history.css'
})
export class OrderHistoryComponent implements OnInit {
  protected orders = signal<Order[]>([]);
  protected loading = signal(false);
  protected error = signal<string | null>(null);
  protected selectedOrder = signal<Order | null>(null);
  protected orderItems = signal<OrderItem[]>([]);
  protected showOrderDetails = signal(false);

  // Status filter
  protected statusFilter = signal<string>('all');
  protected availableStatuses = [
    { value: 'all', label: 'All Orders' },
    { value: 'pending', label: 'Pending' },
    { value: 'designing', label: 'Designing' },
    { value: 'ripping', label: 'Ripping' },
    { value: 'heatpress', label: 'Heat Press' },
    { value: 'cutting', label: 'Cutting' },
    { value: 'assembly', label: 'Assembly' },
    { value: 'qc', label: 'Quality Check' },
    { value: 'done', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  constructor(
    private orderService: OrderService,
    private authService: AuthService,
    private router: Router,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadOrders();
  }

  loadOrders(): void {
    this.loading.set(true);
    this.error.set(null);

    const user = this.authService.getCurrentUser();
    if (!user) {
      this.error.set('User not found');
      this.loading.set(false);
      return;
    }

    this.orderService.getCustomerOrders(user.id)
      .then((response) => {
        if (response.success && response.data) {
          this.orders.set(response.data);
        } else {
          this.error.set(response.message || 'Failed to load orders');
        }
        this.loading.set(false);
      })
      .catch((error) => {
        console.error('Error loading orders:', error);
        this.error.set('Failed to load orders');
        this.loading.set(false);
      });
  }

  filterOrders(): Order[] {
    const allOrders = this.orders();
    const filter = this.statusFilter();
    
    if (filter === 'all') {
      return allOrders;
    }
    
    return allOrders.filter(order => order.status === filter);
  }

  onStatusFilterChange(status: string): void {
    this.statusFilter.set(status);
  }

  viewOrderDetails(order: Order): void {
    this.selectedOrder.set(order);
    this.showOrderDetails.set(true);
    this.loadOrderItems(order.order_id!);
  }

  private loadOrderItems(orderId: number): void {
    this.orderService.getOrder(orderId)
      .then((response) => {
        if (response.success && response.data && response.data.items) {
          this.orderItems.set(response.data.items);
        } else {
          this.error.set('Failed to load order details');
        }
      })
      .catch((error) => {
        console.error('Error loading order items:', error);
        this.error.set('Failed to load order details');
      });
  }

  closeOrderDetails(): void {
    this.showOrderDetails.set(false);
    this.selectedOrder.set(null);
    this.orderItems.set([]);
  }

  cancelOrder(order: Order): void {
    if (!confirm(`Are you sure you want to cancel order ${order.order_ref}?`)) {
      return;
    }

    this.loading.set(true);
    this.orderService.cancelOrder(order.order_id!)
      .then((response) => {
        if (response.success) {
          // Reload orders to reflect the change
          this.loadOrders();
          alert('Order cancelled successfully');
        } else {
          this.error.set(response.message || 'Failed to cancel order');
        }
        this.loading.set(false);
      })
      .catch((error) => {
        console.error('Error cancelling order:', error);
        this.error.set('Failed to cancel order');
        this.loading.set(false);
      });
  }

  canCancelOrder(order: Order): boolean {
    // Only allow cancellation for pending orders
    return order.status === 'pending';
  }

  getStatusBadgeClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'pending': 'bg-warning',
      'designing': 'bg-info',
      'ripping': 'bg-primary',
      'heatpress': 'bg-secondary',
      'cutting': 'bg-dark',
      'assembly': 'bg-success',
      'qc': 'bg-primary',
      'done': 'bg-success',
      'cancelled': 'bg-danger'
    };
    
    return statusClasses[status] || 'bg-secondary';
  }

  getStatusDisplayName(status: string): string {
    const statusNames: { [key: string]: string } = {
      'pending': 'Pending',
      'designing': 'Designing',
      'ripping': 'Ripping',
      'heatpress': 'Heat Press',
      'cutting': 'Cutting',
      'assembly': 'Assembly',
      'qc': 'Quality Check',
      'done': 'Completed',
      'cancelled': 'Cancelled'
    };
    
    return statusNames[status] || status;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  continueShopping(): void {
    this.router.navigate(['/apparel']);
  }

  clearError(): void {
    this.error.set(null);
  }

  // Reorder functionality
  reorderOrder(order: Order): void {
    if (!confirm(`Add all items from order ${order.order_ref} to your cart? This will clear your current cart.`)) {
      return;
    }

    this.loading.set(true);
    this.orderService.reorderFromOrder(order.order_id!)
      .then((response) => {
        if (response.success) {
          // Refresh cart to show new items
          this.cartService.refreshCart();
          alert(response.message || 'Items added to cart successfully!');
          // Optionally navigate to cart
          this.router.navigate(['/cart']);
        } else {
          this.error.set(response.message || 'Failed to reorder items');
        }
        this.loading.set(false);
      })
      .catch((error) => {
        console.error('Error reordering:', error);
        this.error.set('Failed to reorder items');
        this.loading.set(false);
      });
  }

  // Check if order can be reordered
  canReorderOrder(order: Order): boolean {
    // Allow reordering for completed, cancelled, or done orders
    const reorderableStatuses = ['done', 'cancelled'];
    return reorderableStatuses.includes(order.status || 'pending');
  }
}
