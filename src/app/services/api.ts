import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  product_name: string;
  category: string;
  base_price: number;
  description?: string | null;
  image_url: string;
  cloudinary_public_id?: string | null;
  status?: 'Active' | 'Inactive' | 'Archived';
  stock_quantity?: number;
  sku?: string | null;
  sizes?: string | string[] | null; // Can be JSON string or array
  tags?: string | string[] | null;  // Can be JSON string or array
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://localhost:3001/api';

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
    return this.http.get<ApiResponse<CanvasData[]>>(`${this.baseUrl}/canvas/list`);
  }

  getCanvas(id: string): Observable<ApiResponse<CanvasData>> {
    return this.http.get<ApiResponse<CanvasData>>(`${this.baseUrl}/canvas/${id}`);
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
    return this.http.get<ApiResponse<UserData[]>>(`${this.baseUrl}/users${params}`);
  }

  getUser(id: string): Observable<ApiResponse<UserData>> {
    return this.http.get<ApiResponse<UserData>>(`${this.baseUrl}/users/${id}`);
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
    return this.http.get<ApiResponse<ProductData[]>>(`${this.baseUrl}/catalog${params}`);
  }

  getProduct(id: string): Observable<ApiResponse<ProductData>> {
    return this.http.get<ApiResponse<ProductData>>(`${this.baseUrl}/catalog/${id}`);
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
}
