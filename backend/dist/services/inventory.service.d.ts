export interface StockCheck {
    product_id: number;
    product_name: string;
    requested_quantity: number;
    available_quantity: number;
    sufficient: boolean;
}
export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
}
export declare class InventoryService {
    static checkStockAvailability(productId: number, quantity: number): Promise<StockCheck>;
    static checkMultipleStock(items: Array<{
        product_id: number;
        quantity: number;
    }>): Promise<ApiResponse<StockCheck[]>>;
    static deductStock(connection: any, productId: number, quantity: number): Promise<{
        success: boolean;
        message?: string;
    }>;
    static restoreStock(connection: any, productId: number, quantity: number): Promise<{
        success: boolean;
        message?: string;
    }>;
    static getLowStockProducts(threshold?: number): Promise<ApiResponse<any[]>>;
    static getProductStock(productId: number): Promise<ApiResponse<number>>;
}
//# sourceMappingURL=inventory.service.d.ts.map