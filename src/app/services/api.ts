import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CanvasData {
  id?: string;
  name: string;
  data: any;
  createdAt?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface UserData {
  id?: number;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone?: string;
  roles: string[];
  status: 'Active' | 'Inactive';
  hiredDate?: string;
  lastLogin?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerAccount {
  id?: number;
  email: string;
  fullName: string;
  phone?: string;
  address?: string;
  created_at?: string;
  last_login?: string | null;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: 'customer' | 'employee';
  phone?: string;
  address?: string;
  roles?: string[];
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  message?: string;
  error?: string;
}

export interface ProductData {
  product_id?: number;
  product_code?: string;
  product_name: string;
  category: string;
  base_price: number;
  description?: string | null;
  status?: 'Active' | 'Inactive' | 'Archived';
  stock_quantity?: number;
  sku?: string | null;
  sizes?: string | null; // JSON string
  tags?: string | null;  // JSON string
  // NEW FIELDS
  colors?: string | null;               // JSON string
  images?: Array<{url: string; publicId?: string; displayOrder?: number}> | null; // Array of image objects
  material?: string | null;             // VARCHAR
  gender?: 'Men' | 'Women' | 'Unisex' | 'Kids' | null;
  allows_customization?: boolean;
  production_days?: number;
  stock_by_size_color?: string | null;  // JSON string
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.api.baseUrl;

  // Headers to prevent caching for admin operations
  private noCacheHeaders = new HttpHeaders({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  constructor(private http: HttpClient) { }

  // Health check
  healthCheck(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.baseUrl}/health`);
  }

  // Canvas operations
  saveCanvas(canvasData: any, name: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/canvas/save`, {
      canvasData,
      name
    });
  }

  getCanvasList(): Observable<ApiResponse<CanvasData[]>> {
    return this.http.get<ApiResponse<CanvasData[]>>(`${this.baseUrl}/canvas/list`, { headers: this.noCacheHeaders });
  }

  getCanvas(id: string): Observable<ApiResponse<CanvasData>> {
    return this.http.get<ApiResponse<CanvasData>>(`${this.baseUrl}/canvas/${id}`, { headers: this.noCacheHeaders });
  }

  // User/Employee operations
  getUsers(role?: string, status?: string): Observable<ApiResponse<UserData[]>> {
    let params = '';
    if (role || status) {
      const queryParams = [];
      if (role) queryParams.push(`role=${encodeURIComponent(role)}`);
      if (status) queryParams.push(`status=${encodeURIComponent(status)}`);
      params = '?' + queryParams.join('&');
    }
    return this.http.get<ApiResponse<UserData[]>>(`${this.baseUrl}/users${params}`, { headers: this.noCacheHeaders });
  }

  getUser(id: string): Observable<ApiResponse<UserData>> {
    return this.http.get<ApiResponse<UserData>>(`${this.baseUrl}/users/${id}`, { headers: this.noCacheHeaders });
  }

  createUser(userData: Omit<UserData, 'id' | 'created_at' | 'updated_at'>): Observable<ApiResponse<UserData>> {
    return this.http.post<ApiResponse<UserData>>(`${this.baseUrl}/users`, userData);
  }

  updateUser(id: string, userData: Partial<Omit<UserData, 'id' | 'created_at' | 'updated_at'>>): Observable<ApiResponse<UserData>> {
    return this.http.put<ApiResponse<UserData>>(`${this.baseUrl}/users/${id}`, userData);
  }

  deleteUser(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/users/${id}`);
  }

  updateUserLastLogin(id: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.baseUrl}/users/${id}/login`, {});
  }

  // Product/Catalog operations
  getProducts(category?: string, status?: string): Observable<ApiResponse<ProductData[]>> {
    let params = '';
    if (category || status) {
      const queryParams = [];
      if (category) queryParams.push(`category=${encodeURIComponent(category)}`);
      if (status) queryParams.push(`status=${encodeURIComponent(status)}`);
      params = '?' + queryParams.join('&');
    }
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    const separator = params ? '&' : '?';
    return this.http.get<ApiResponse<ProductData[]>>(
      `${this.baseUrl}/catalog${params}${separator}_t=${timestamp}`,
      { headers: this.noCacheHeaders }
    );
  }

  getProduct(id: string): Observable<ApiResponse<ProductData>> {
    const timestamp = new Date().getTime();
    return this.http.get<ApiResponse<ProductData>>(
      `${this.baseUrl}/catalog/${id}?_t=${timestamp}`,
      { headers: this.noCacheHeaders }
    );
  }

  createProduct(productData: Omit<ProductData, 'product_id' | 'created_at' | 'updated_at'>): Observable<ApiResponse<ProductData>> {
    return this.http.post<ApiResponse<ProductData>>(`${this.baseUrl}/catalog`, productData);
  }

  updateProduct(id: string, productData: Partial<Omit<ProductData, 'product_id' | 'created_at' | 'updated_at'>>): Observable<ApiResponse<ProductData>> {
    return this.http.put<ApiResponse<ProductData>>(`${this.baseUrl}/catalog/${id}`, productData);
  }

  archiveProduct(id: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.baseUrl}/catalog/${id}/archive`, {});
  }

  restoreProduct(id: string): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(`${this.baseUrl}/catalog/${id}/restore`, {});
  }

  deleteProductPermanently(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/catalog/${id}`);
  }

  // Customizable Products API
  createCustomizableProduct(productData: any): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/customizable-products`, productData);
  }

  getCustomizableProducts(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.baseUrl}/customizable-products`, { headers: this.noCacheHeaders });
  }

  getCustomizableProductById(id: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.baseUrl}/customizable-products/${id}`, { headers: this.noCacheHeaders });
  }

  updateCustomizableProduct(id: string, productData: any): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.baseUrl}/customizable-products/${id}`, productData);
  }

  deleteCustomizableProduct(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/customizable-products/${id}`);
  }
}
