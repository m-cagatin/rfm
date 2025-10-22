export interface CartItem {
    cart_item_id?: number;
    customer_id: number;
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
export declare class CartService {
    static getCart(customerId: number): Promise<ApiResponse<CartItem[]>>;
    static addToCart(cartItem: Omit<CartItem, 'cart_item_id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<CartItem>>;
    static updateQuantity(cartItemId: number, quantity: number, customerId: number): Promise<ApiResponse>;
    static removeFromCart(cartItemId: number, customerId: number): Promise<ApiResponse>;
    static clearCart(customerId: number): Promise<ApiResponse>;
    static mergeGuestCart(customerId: number, guestItems: Omit<CartItem, 'customer_id' | 'cart_item_id'>[]): Promise<ApiResponse>;
}
//# sourceMappingURL=cart.service.d.ts.map