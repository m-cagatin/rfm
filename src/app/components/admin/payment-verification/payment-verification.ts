import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService, Order } from '../../../services/order.service';
import { PaymentService } from '../../../services/payment.service';

export interface PaymentVerificationOrder extends Order {
  payment_method?: string;
  payment_status?: string;
  payment_amount?: number;
  payment_proof_url?: string;
  payment_reference?: string;
  payment_created_at?: string;
  payment_id?: number;
  paymongo_payment_intent_id?: string;
  paymongo_payment_id?: string;
  paymongo_link_url?: string;
  reference_number?: string;
}

@Component({
  selector: 'app-payment-verification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-verification.html',
  styleUrls: ['./payment-verification.css']
})
export class PaymentVerificationComponent implements OnInit {
  protected orders = signal<PaymentVerificationOrder[]>([]);
  protected loading = signal(false);
  protected error = signal<string | null>(null);
  protected selectedOrder = signal<PaymentVerificationOrder | null>(null);
  protected showOrderDetails = signal(false);
  protected processingOrder = signal<number | null>(null);

  constructor(
    private orderService: OrderService,
    private paymentService: PaymentService
  ) {}

  ngOnInit(): void {
    this.loadPendingOrders();
  }

  loadPendingOrders(): void {
    this.loading.set(true);
    this.error.set(null);

    this.orderService.getOrdersByStatus('payment_pending')
      .then((response) => {
        if (response.success) {
          // Successfully loaded, even if no orders found
          this.orders.set(response.data || []);
          this.error.set(null);
        } else {
          this.error.set(response.message || 'Failed to load pending orders');
        }
        this.loading.set(false);
      })
      .catch((error) => {
        console.error('Error loading pending orders:', error);
        this.error.set('Failed to load pending orders');
        this.loading.set(false);
      });
  }

  viewOrderDetails(order: PaymentVerificationOrder): void {
    this.selectedOrder.set(order);
    this.showOrderDetails.set(true);
  }

  closeOrderDetails(): void {
    this.showOrderDetails.set(false);
    this.selectedOrder.set(null);
  }

  approveOrder(order: PaymentVerificationOrder): void {
    if (!confirm(`Approve order ${order.order_ref} for production? This will move it to the production queue.`)) {
      return;
    }

    this.processingOrder.set(order.order_id!);
    
    this.orderService.updateOrderStatus(order.order_id!, 'pending')
      .then((response) => {
        if (response.success) {
          // Remove from pending list
          const currentOrders = this.orders();
          const updatedOrders = currentOrders.filter(o => o.order_id !== order.order_id);
          this.orders.set(updatedOrders);
          
          alert(`Order ${order.order_ref} approved and moved to production queue!`);
          
          // Close order details modal if open
          this.closeOrderDetails();
        } else {
          this.error.set(response.message || 'Failed to approve order');
        }
        this.processingOrder.set(null);
      })
      .catch((error) => {
        console.error('Error approving order:', error);
        this.error.set('Failed to approve order');
        this.processingOrder.set(null);
      });
  }

  rejectOrder(order: PaymentVerificationOrder): void {
    const reason = prompt(`Reject order ${order.order_ref}? Please provide a reason:`);
    if (!reason) return;

    if (!confirm(`Reject order ${order.order_ref}?\nReason: ${reason}`)) {
      return;
    }

    this.processingOrder.set(order.order_id!);
    
    this.orderService.updateOrderStatus(order.order_id!, 'cancelled')
      .then((response) => {
        if (response.success) {
          // Remove from pending list
          const currentOrders = this.orders();
          const updatedOrders = currentOrders.filter(o => o.order_id !== order.order_id);
          this.orders.set(updatedOrders);
          
          alert(`Order ${order.order_ref} rejected and cancelled.`);
        } else {
          this.error.set(response.message || 'Failed to reject order');
        }
        this.processingOrder.set(null);
      })
      .catch((error) => {
        console.error('Error rejecting order:', error);
        this.error.set('Failed to reject order');
        this.processingOrder.set(null);
      });
  }

  getPaymentMethodIcon(method: string): string {
    switch (method) {
      case 'paymongo': return '💳';
      case 'gcash': return '📱';
      case 'bank_transfer': return '🏦';
      case 'cod': return '💰';
      default: return '❓';
    }
  }

  getPaymentMethodName(method: string): string {
    switch (method) {
      case 'paymongo': return 'PayMongo';
      case 'gcash': return 'GCash';
      case 'bank_transfer': return 'Bank Transfer';
      case 'cod': return 'Cash on Delivery';
      default: return 'Unknown';
    }
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

  clearError(): void {
    this.error.set(null);
  }

  // Get payment evidence for detailed verification
  getPaymentEvidence(paymentId: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.paymentService.getPaymentEvidence(paymentId)
      .then((response) => {
        if (response.success) {
          // Show payment evidence in modal or detailed view
          console.log('Payment Evidence:', response.data);
          alert(`Payment Evidence:\n\nOrder: ${response.data.order_ref}\nMethod: ${response.data.payment_method}\nStatus: ${response.data.payment_status}\nAmount: ₱${response.data.amount}\n\nPayMongo Evidence: ${JSON.stringify(response.data.paymongo_evidence, null, 2)}\n\nManual Evidence: ${JSON.stringify(response.data.manual_payment_evidence, null, 2)}`);
        } else {
          this.error.set(response.message || 'Failed to get payment evidence');
        }
        this.loading.set(false);
      })
      .catch((error) => {
        console.error('Error getting payment evidence:', error);
        this.error.set('Failed to get payment evidence');
        this.loading.set(false);
      });
  }

  // Verify PayMongo payment with external API
  verifyWithPayMongo(paymentId: number): void {
    if (!confirm('Verify this payment with PayMongo API? This will check the payment status with PayMongo.')) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.paymentService.verifyPayMongoPayment(paymentId)
      .then((response) => {
        if (response.success) {
          const verificationResponse = response as any;
          alert(`Payment verified with PayMongo!\n\nStatus: ${verificationResponse.verification?.status}\nAmount: ₱${verificationResponse.verification?.amount}\nPaid At: ${verificationResponse.verification?.paid_at}\n\nOrder has been approved and moved to production queue.`);
          // Refresh orders to show updated status
          this.loadPendingOrders();
        } else {
          const verificationResponse = response as any;
          this.error.set(response.message || 'Payment verification failed');
          alert(`Payment verification failed:\n\n${response.message}\n\nVerification details: ${JSON.stringify(verificationResponse.verification, null, 2)}`);
        }
        this.loading.set(false);
      })
      .catch((error) => {
        console.error('Error verifying PayMongo payment:', error);
        this.error.set('Failed to verify PayMongo payment');
        this.loading.set(false);
      });
  }

  // Get payment status badge class
  getPaymentStatusBadgeClass(status: string | null | undefined): string {
    if (!status) return 'badge bg-secondary';
    switch (status) {
      case 'paid': return 'badge bg-success';
      case 'pending': return 'badge bg-warning';
      case 'failed': return 'badge bg-danger';
      case 'refunded': return 'badge bg-info';
      default: return 'badge bg-secondary';
    }
  }

  // Check if payment has evidence
  hasPaymentEvidence(order: PaymentVerificationOrder): boolean {
    return !!(order.payment_id && (
      order.paymongo_payment_intent_id || 
      order.payment_proof_url || 
      order.reference_number
    ));
  }
}
