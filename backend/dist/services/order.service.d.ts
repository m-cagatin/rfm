export interface Order {
    order_id?: number;
    order_ref: string;
    customer_id: number;
    customer_name: string;
    customer_email: string;
    customer_phone?: string;
    customer_address?: string;
    total_amount: number;
    status?: string;
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
export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
}
export declare class OrderService {
    static generateOrderRef(): Promise<string>;
    static createOrder(orderData: {
        customer_id: number;
        customer_name: string;
        customer_email: string;
        customer_phone?: string;
        customer_address?: string;
        notes?: string;
    }): Promise<ApiResponse<Order>>;
    static restoreOrderStock(orderId: number): Promise<ApiResponse>;
    static getOrderStatusHistory(orderId: number): Promise<ApiResponse<any[]>>;
    static logStatusChange(orderId: number, newStatus: string, previousStatus?: string | null, changedBy?: string, notes?: string | null): Promise<void>;
    static getOrdersByStatus(status: string): Promise<ApiResponse<Order[]>>;
    static getOrders(filters?: {
        status?: string;
        customerId?: number;
    }): Promise<ApiResponse<Order[]>>;
    static getOrder(orderId: number): Promise<ApiResponse<any>>;
    static getCustomerOrders(customerId: number): Promise<ApiResponse<Order[]>>;
    static updateOrderStatus(orderId: number, status: string): Promise<ApiResponse>;
    static cancelOrder(orderId: number): Promise<ApiResponse>;
    static reorderFromOrder(orderId: number, customerId: number): Promise<ApiResponse>;
}
//# sourceMappingURL=order.service.d.ts.map