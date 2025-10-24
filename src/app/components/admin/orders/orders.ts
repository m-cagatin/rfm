import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { OrderService, Order, OrderItem } from '../../../services/order.service';

type KanbanOrder = {
  order_id: number;
  orderRef: string;
  client: string;
  date?: string;
  status?: string;
  qty: number;
  total_amount: number;
  customer_email: string;
  customer_phone?: string;
  customer_address?: string;
  notes?: string;
};

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule
  ],
  templateUrl: './orders.html',
  styleUrls: ['./orders.css']
})
export class AdminOrdersComponent implements OnInit {
  // Real order data from API
  protected designing = signal<KanbanOrder[]>([]);
  protected ripping = signal<KanbanOrder[]>([]);
  protected heatpress = signal<KanbanOrder[]>([]);
  protected cutting = signal<KanbanOrder[]>([]);
  protected assembly = signal<KanbanOrder[]>([]);
  protected qc = signal<KanbanOrder[]>([]);
  protected done = signal<KanbanOrder[]>([]);
  protected pending = signal<KanbanOrder[]>([]);
  protected cancelled = signal<KanbanOrder[]>([]);

  // UI state
  protected loading = signal(false);
  protected error = signal<string | null>(null);
  protected selectedOrder = signal<KanbanOrder | null>(null);
  protected orderItems = signal<OrderItem[]>([]);
  protected showOrderDetails = signal(false);

  // list of stages used for generating columns
  protected stages = [
    { key: 'pending', title: 'Pending', data: this.pending, color: 'warning' },
    { key: 'designing', title: 'Designing', data: this.designing, color: 'info' },
    { key: 'ripping', title: 'Ripping', data: this.ripping, color: 'primary' },
    { key: 'heatpress', title: 'Heat Press', data: this.heatpress, color: 'secondary' },
    { key: 'cutting', title: 'Cutting', data: this.cutting, color: 'dark' },
    { key: 'assembly', title: 'Assembly', data: this.assembly, color: 'success' },
    { key: 'qc', title: 'Quality Check', data: this.qc, color: 'primary' },
    { key: 'done', title: 'Done', data: this.done, color: 'success' },
    { key: 'cancelled', title: 'Cancelled', data: this.cancelled, color: 'danger' }
  ];

  // used by cdkDropListConnectedTo
  get connectedLists(): string[] {
    return this.stages.map(s => s.key);
  }

  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading.set(true);
    this.error.set(null);

    this.orderService.getOrders()
      .then((response) => {
        if (response.success && response.data) {
          this.organizeOrdersByStatus(response.data);
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

  private organizeOrdersByStatus(orders: Order[]): void {
    // Clear all columns
    this.pending.set([]);
    this.designing.set([]);
    this.ripping.set([]);
    this.heatpress.set([]);
    this.cutting.set([]);
    this.assembly.set([]);
    this.qc.set([]);
    this.done.set([]);
    this.cancelled.set([]);

    // Filter out unpaid orders (payment_pending) - they should not appear in production Kanban
    const paidOrders = orders.filter(order => order.status !== 'payment_pending');

    // Organize paid orders by status
    paidOrders.forEach(order => {
      const kanbanOrder: KanbanOrder = {
        order_id: order.order_id!,
        orderRef: order.order_ref,
        client: order.customer_name,
        date: order.order_date || order.created_at,
        status: order.status,
        qty: 1, // We'll calculate this from order items
        total_amount: order.total_amount,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        customer_address: order.customer_address,
        notes: order.notes
      };

      switch (order.status) {
        case 'pending':
          this.pending.update(orders => [...orders, kanbanOrder]);
          break;
        case 'designing':
          this.designing.update(orders => [...orders, kanbanOrder]);
          break;
        case 'ripping':
          this.ripping.update(orders => [...orders, kanbanOrder]);
          break;
        case 'heatpress':
          this.heatpress.update(orders => [...orders, kanbanOrder]);
          break;
        case 'cutting':
          this.cutting.update(orders => [...orders, kanbanOrder]);
          break;
        case 'assembly':
          this.assembly.update(orders => [...orders, kanbanOrder]);
          break;
        case 'qc':
          this.qc.update(orders => [...orders, kanbanOrder]);
          break;
        case 'done':
          this.done.update(orders => [...orders, kanbanOrder]);
          break;
        case 'cancelled':
          this.cancelled.update(orders => [...orders, kanbanOrder]);
          break;
        default:
          this.pending.update(orders => [...orders, kanbanOrder]);
      }
    });
  }

  // CDK drop handler
  onDrop(event: CdkDragDrop<KanbanOrder[]>, destKey: string) {
    const movedOrder = event.previousContainer.data[event.previousIndex];
    
    // same container - just reorder
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // different container - update status via API
      this.updateOrderStatus(movedOrder, destKey);
      
      // Update local state immediately for better UX
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
      
      // Update the order's status
      const destStage = this.stages.find(s => s.key === destKey);
      if (movedOrder && destStage) {
        movedOrder.status = destKey;
      }
    }
  }

  private updateOrderStatus(order: KanbanOrder, newStatus: string): void {
    this.orderService.updateOrderStatus(order.order_id, newStatus)
      .then((response) => {
        if (!response.success) {
          console.error('Failed to update order status:', response.message);
          // Optionally revert the UI change
          this.loadOrders(); // Reload to sync with server
        }
      })
      .catch((error) => {
        console.error('Error updating order status:', error);
        // Optionally revert the UI change
        this.loadOrders(); // Reload to sync with server
      });
  }

  // change via dropdown inside card
  changeStatus(order: KanbanOrder, toKey: string) {
    if (!order) return;
    
    // Update status via API
    this.updateOrderStatus(order, toKey);
    
    // Update local state
    const fromStage = this.stages.find(s => s.data().includes(order));
    const toStage = this.stages.find(s => s.key === toKey);
    if (!toStage || !fromStage) return;
    
    // Remove from previous stage
    fromStage.data.update(orders => orders.filter(o => o.order_id !== order.order_id));
    // Add to new stage
    toStage.data.update(orders => [order, ...orders]);
    order.status = toKey;
  }

  // View order details
  viewOrderDetails(order: KanbanOrder): void {
    this.selectedOrder.set(order);
    this.showOrderDetails.set(true);
    this.loadOrderItems(order.order_id);
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

  // trackBy for performance
  trackByOrder(index: number, item: KanbanOrder) {
    return item.order_id || index;
  }

  // Utility methods
  formatDate(dateString: string | undefined): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  clearError(): void {
    this.error.set(null);
  }

  // Helper methods for template
  getStatusColor(status: string | undefined): string {
    const stage = this.stages.find(s => s.key === status);
    return stage?.color || 'secondary';
  }

  getStatusTitle(status: string | undefined): string {
    const stage = this.stages.find(s => s.key === status);
    return stage?.title || status || 'Unknown';
  }
}
