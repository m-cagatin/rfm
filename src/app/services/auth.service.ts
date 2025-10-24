import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: 'customer' | 'employee';
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  dateOfBirth?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  preferredContactMethod?: 'email' | 'phone' | 'sms';
  marketingConsent?: boolean;
  roles?: string[];
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  user?: AuthUser;
  token?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = `${environment.api.baseUrl}/auth`;
  
  // Using Angular signals for reactive state
  currentUser = signal<AuthUser | null>(null);
  isAuthenticated = signal<boolean>(false);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Load user from localStorage on service initialization
    this.loadUserFromStorage();
  }

  /**
   * Load user from localStorage on app startup
   */
  private loadUserFromStorage(): void {
    const userJson = localStorage.getItem('currentUser');
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('currentUser');
      }
    }
  }

  /**
   * Register a new customer
   */
  register(
    email: string,
    password: string,
    fullName: string,
    phone: string,
    address: string,
    city?: string,
    province?: string,
    postalCode?: string,
    country?: string,
    dateOfBirth?: string,
    emergencyContactName?: string,
    emergencyContactPhone?: string,
    preferredContactMethod?: 'email' | 'phone' | 'sms',
    marketingConsent?: boolean
  ): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, {
      email,
      password,
      fullName,
      phone,
      address,
      city,
      province,
      postalCode,
      country,
      dateOfBirth,
      emergencyContactName,
      emergencyContactPhone,
      preferredContactMethod,
      marketingConsent
    }).pipe(
      tap(response => {
        if (response.success && response.user && response.token) {
          this.setCurrentUser(response.user);
          this.setToken(response.token);
        }
      })
    );
  }

  /**
   * Login user (customer or employee)
   */
  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, {
      email,
      password
    }).pipe(
      tap(response => {
        if (response.success && response.user && response.token) {
          this.setCurrentUser(response.user);
          this.setToken(response.token);
        }
      })
    );
  }

  /**
   * Logout current user
   */
  logout(): void {
    this.http.post(`${this.baseUrl}/logout`, {}).subscribe({
      next: () => {
        this.clearCurrentUser();
        this.router.navigate(['/']);
      },
      error: () => {
        // Even if server request fails, clear local state
        this.clearCurrentUser();
        this.router.navigate(['/']);
      }
    });
  }

  /**
   * Update user profile
   */
  updateProfile(profileData: Partial<AuthUser>): Observable<AuthResponse> {
    return this.http.put<AuthResponse>(`${this.baseUrl}/profile`, profileData).pipe(
      tap(response => {
        if (response.success && response.user) {
          this.setCurrentUser(response.user);
        }
      })
    );
  }

  /**
   * Change user password
   */
  changePassword(oldPassword: string, newPassword: string): Observable<AuthResponse> {
    return this.http.put<AuthResponse>(`${this.baseUrl}/password`, {
      oldPassword,
      newPassword
    });
  }

  /**
   * Get current user profile from server
   */
  getCurrentUserProfile(): Observable<AuthResponse> {
    const user = this.currentUser();
    if (!user) {
      throw new Error('No user logged in');
    }
    
    return this.http.get<AuthResponse>(`${this.baseUrl}/me`, {
      params: {
        id: user.id.toString(),
        role: user.role
      }
    });
  }

  /**
   * Set current user and save to localStorage
   */
  private setCurrentUser(user: AuthUser): void {
    this.currentUser.set(user);
    this.isAuthenticated.set(true);
    localStorage.setItem('currentUser', JSON.stringify(user));
  }

  /**
   * Clear current user and remove from localStorage
   */
  private clearCurrentUser(): void {
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    
    // Clear cart data on logout for security
    localStorage.removeItem('rfm_guest_cart');
    
    // Notify other services about logout
    window.dispatchEvent(new CustomEvent('user-logout'));
  }

  /**
   * Get JWT token from localStorage
   */
  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  /**
   * Set JWT token in localStorage
   */
  private setToken(token: string): void {
    localStorage.setItem('authToken', token);
  }

  /**
   * Remove JWT token from localStorage
   */
  private removeToken(): void {
    localStorage.removeItem('authToken');
  }

  /**
   * Get current user
   */
  getCurrentUser(): AuthUser | null {
    return this.currentUser();
  }

  /**
   * Get user role
   */
  getUserRole(): 'customer' | 'employee' | null {
    return this.currentUser()?.role || null;
  }

  /**
   * Check if user is authenticated
   */
  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  /**
   * Check if user is admin (employee)
   */
  isAdmin(): boolean {
    return this.currentUser()?.role === 'employee';
  }

  /**
   * Check if user is customer
   */
  isCustomer(): boolean {
    return this.currentUser()?.role === 'customer';
  }
}

