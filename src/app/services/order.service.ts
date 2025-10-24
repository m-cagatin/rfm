import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface Order {
  order_id?: number;
  order_ref: string;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  customer_address?: string;
  total_amount: number;
  status?: 'payment_pending' | 'pending' | 'designing' | 'ripping' | 'heatpress' | 'cutting' | 'assembly' | 'qc' | 'done' | 'cancelled';
  order_date?: string;
  estimated_completion?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OrderItem {
  item_id?: number;
  order_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  size?: string;
  color?: string;
  unit_price: number;
  subtotal: number;
  customization_data?: any;
  created_at?: string;
}

export interface CreateOrderRequest {
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  customer_address?: string;
  notes?: string;
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
export class OrderService {
  private isLoading = signal(false);
  private error = signal<string | null>(null);

  public loading = signal(false);
  public errorMessage = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  // Create order from cart
  createOrder(orderData: CreateOrderRequest): Promise<ApiResponse<Order>> {
    this.isLoading.set(true);
    this.error.set(null);

    return new Promise((resolve, reject) => {
      this.http.post<ApiResponse<Order>>(`${environment.api.baseUrl}/orders`, orderData)
        .subscribe({
          next: (response) => {
            this.isLoading.set(false);
            resolve(response);
          },
          error: (error) => {
            console.error('Error creating order:', error);
            this.error.set('Failed to create order');
            this.isLoading.set(false);
            reject(error);
          }
        });
    });
  }

  // Get orders by status (admin only)
  getOrdersByStatus(status: string): Promise<ApiResponse<Order[]>> {
    this.isLoading.set(true);
    this.error.set(null);

    return new Promise((resolve, reject) => {
      this.http.get<ApiResponse<Order[]>>(`${environment.api.baseUrl}/orders/status/${status}`)
        .subscribe({
          next: (response) => {
            this.isLoading.set(false);
            resolve(response);
          },
          error: (error) => {
            console.error('Error getting orders by status:', error);
            this.error.set('Failed to get orders');
            this.isLoading.set(false);
            reject(error);
          }
        });
    });
  }

  // Get all orders (admin only)
  getOrders(status?: string): Promise<ApiResponse<Order[]>> {
    this.isLoading.set(true);
    this.error.set(null);

    const params = status ? `?status=${status}` : '';

    return new Promise((resolve, reject) => {
      this.http.get<ApiResponse<Order[]>>(`${environment.api.baseUrl}/orders${params}`)
        .subscribe({
          next: (response) => {
            this.isLoading.set(false);
            resolve(response);
          },
          error: (error) => {
            console.error('Error fetching orders:', error);
            this.error.set('Failed to fetch orders');
            this.isLoading.set(false);
            reject(error);
          }
        });
    });
  }

  // Get single order with items
  getOrder(orderId: number): Promise<ApiResponse<Order & { items: OrderItem[] }>> {
    this.isLoading.set(true);
    this.error.set(null);

    return new Promise((resolve, reject) => {
      this.http.get<ApiResponse<Order & { items: OrderItem[] }>>(`${environment.api.baseUrl}/orders/${orderId}`)
        .subscribe({
          next: (response) => {
            this.isLoading.set(false);
            resolve(response);
          },
          error: (error) => {
            console.error('Error fetching order:', error);
            this.error.set('Failed to fetch order');
            this.isLoading.set(false);
            reject(error);
          }
        });
    });
  }

  // Get customer orders
  getCustomerOrders(customerId: number): Promise<ApiResponse<Order[]>> {
    this.isLoading.set(true);
    this.error.set(null);

    return new Promise((resolve, reject) => {
      this.http.get<ApiResponse<Order[]>>(`${environment.api.baseUrl}/orders/customer/${customerId}`)
        .subscribe({
          next: (response) => {
            this.isLoading.set(false);
            resolve(response);
          },
          error: (error) => {
            console.error('Error fetching customer orders:', error);
            this.error.set('Failed to fetch orders');
            this.isLoading.set(false);
            reject(error);
          }
        });
    });
  }

  // Update order status (admin only)
  updateOrderStatus(orderId: number, status: string): Promise<ApiResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    return new Promise((resolve, reject) => {
      this.http.patch<ApiResponse>(`${environment.api.baseUrl}/orders/${orderId}/status`, { status })
        .subscribe({
          next: (response) => {
            this.isLoading.set(false);
            resolve(response);
          },
          error: (error) => {
            console.error('Error updating order status:', error);
            this.error.set('Failed to update order status');
            this.isLoading.set(false);
            reject(error);
          }
        });
    });
  }

  // Cancel order
  cancelOrder(orderId: number): Promise<ApiResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    return new Promise((resolve, reject) => {
      this.http.delete<ApiResponse>(`${environment.api.baseUrl}/orders/${orderId}`)
        .subscribe({
          next: (response) => {
            this.isLoading.set(false);
            resolve(response);
          },
          error: (error) => {
            console.error('Error cancelling order:', error);
            this.error.set('Failed to cancel order');
            this.isLoading.set(false);
            reject(error);
          }
        });
    });
  }

  // Reorder - Add items from a previous order back to cart
  reorderFromOrder(orderId: number): Promise<ApiResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    return new Promise((resolve, reject) => {
      this.http.post<ApiResponse>(`${environment.api.baseUrl}/orders/${orderId}/reorder`, {})
        .subscribe({
          next: (response) => {
            this.isLoading.set(false);
            resolve(response);
          },
          error: (error) => {
            console.error('Error reordering:', error);
            this.error.set('Failed to reorder items');
            this.isLoading.set(false);
            reject(error);
          }
        });
    });
  }

  // Get loading state
  getLoading(): boolean {
    return this.isLoading();
  }

  // Get error state
  getError(): string | null {
    return this.error();
  }

  // Clear error
  clearError(): void {
    this.error.set(null);
  }
}
