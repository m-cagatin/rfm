export interface CanvasData {
    id?: number;
    name: string;
    canvas_data?: any;
    created_at?: string;
    updated_at?: string;
}
export interface UserData {
    id?: number;
    FullName?: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    Email?: string;
    email?: string;
    Phone?: string;
    phone?: string;
    Roles?: string;
    roles?: string[];
    Status?: 'Active' | 'Inactive';
    status?: 'Active' | 'Inactive';
    hired_date?: string;
    hiredDate?: string;
    last_login?: string | null;
    lastLogin?: string | null;
    created_at?: string;
    updated_at?: string;
}
export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
}
export declare class DatabaseService {
    static parseRoles(raw: any): string[];
    static saveCanvas(canvasData: any, name: string): Promise<ApiResponse<CanvasData>>;
    static getCanvasList(): Promise<ApiResponse<CanvasData[]>>;
    static getCanvas(id: string): Promise<ApiResponse<CanvasData>>;
    static updateCanvas(id: string, canvasData: any, name?: string): Promise<ApiResponse<CanvasData>>;
    static deleteCanvas(id: string): Promise<ApiResponse>;
    static getUsers(role?: string, status?: string): Promise<ApiResponse<UserData[]>>;
    static getUser(id: string): Promise<ApiResponse<UserData>>;
    static createUser(userData: Omit<UserData, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<UserData>>;
    static updateUser(id: string, userData: Partial<UserData>): Promise<ApiResponse>;
    static deleteUser(id: string): Promise<ApiResponse>;
    static updateUserLastLogin(id: string): Promise<ApiResponse>;
    static healthCheck(): Promise<ApiResponse>;
    static createProduct(productData: {
        product_name: string;
        category: string;
        base_price: number;
        description?: string;
        image_url: string;
        cloudinary_public_id?: string;
        status?: string;
        stock_quantity?: number;
        sku?: string;
        sizes?: string;
        tags?: string;
    }): Promise<ApiResponse<any>>;
    static getProducts(category?: string, status?: string): Promise<ApiResponse<any[]>>;
    static getProduct(productId: string): Promise<ApiResponse<any>>;
    static updateProduct(productId: string, updateData: any): Promise<ApiResponse<any>>;
    static archiveProduct(productId: string): Promise<ApiResponse<any>>;
    static restoreProduct(productId: string): Promise<ApiResponse<any>>;
    static deleteProductPermanently(productId: string): Promise<ApiResponse<any>>;
}
//# sourceMappingURL=database.service.d.ts.map