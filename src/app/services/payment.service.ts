import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface PaymentLink {
  paymentLinkUrl: string;
  paymentLinkId: string;
  paymentId: number;
}

export interface Payment {
  payment_id: number;
  order_id: number;
  payment_method: 'paymongo' | 'gcash' | 'bank_transfer' | 'cod';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  amount: number;
  paymongo_link_url?: string;
  payment_proof_url?: string;
  reference_number?: string;
  created_at?: string;
  paid_at?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  paymentLinkUrl?: string;
  paymentLinkId?: string;
  paymentId?: number;
  payment?: Payment;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private isLoading = signal(false);
  private error = signal<string | null>(null);

  public loading = signal(false);
  public errorMessage = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  /**
   * Create PayMongo payment link
   */
  createPaymentLink(orderId: number, amount: number, description: string): Promise<ApiResponse<PaymentLink>> {
    this.isLoading.set(true);
    this.error.set(null);

    return new Promise((resolve, reject) => {
      this.http.post<ApiResponse<PaymentLink>>(`${environment.api.baseUrl}/payment/create-link`, {
        orderId,
        amount,
        description
      }).subscribe({
        next: (response) => {
          this.isLoading.set(false);
          resolve(response);
        },
        error: (error) => {
          console.error('Error creating payment link:', error);
          this.error.set('Failed to create payment link');
          this.isLoading.set(false);
          reject(error);
        }
      });
    });
  }

  /**
   * Get payment status
   */
  getPaymentStatus(paymentId: number): Promise<ApiResponse<Payment>> {
    this.isLoading.set(true);
    this.error.set(null);

    return new Promise((resolve, reject) => {
      this.http.get<ApiResponse<Payment>>(`${environment.api.baseUrl}/payment/${paymentId}`)
        .subscribe({
          next: (response) => {
            this.isLoading.set(false);
            resolve(response);
          },
          error: (error) => {
            console.error('Error getting payment status:', error);
            this.error.set('Failed to get payment status');
            this.isLoading.set(false);
            reject(error);
          }
        });
    });
  }

  /**
   * Check payment status for an order
   */
  checkPaymentStatus(orderId: number): Promise<{success: boolean; isPaid: boolean; message?: string}> {
    this.isLoading.set(true);
    this.error.set(null);

    return new Promise((resolve, reject) => {
      this.http.get<{success: boolean; isPaid: boolean; message?: string}>(`${environment.api.baseUrl}/payment/order/${orderId}/status`)
        .subscribe({
          next: (response) => {
            this.isLoading.set(false);
            resolve(response);
          },
          error: (error) => {
            console.error('Error checking payment status:', error);
            this.error.set('Failed to check payment status');
            this.isLoading.set(false);
            reject(error);
          }
        });
    });
  }

  /**
   * Create manual payment (GCash/Bank Transfer)
   */
  createManualPayment(
    orderId: number,
    paymentMethod: 'gcash' | 'bank_transfer' | 'cod',
    amount: number,
    referenceNumber?: string
  ): Promise<ApiResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    return new Promise((resolve, reject) => {
      this.http.post<ApiResponse>(`${environment.api.baseUrl}/payment/manual`, {
        orderId,
        paymentMethod,
        amount,
        referenceNumber
      }).subscribe({
        next: (response) => {
          this.isLoading.set(false);
          resolve(response);
        },
        error: (error) => {
          console.error('Error creating manual payment:', error);
          this.error.set('Failed to create manual payment');
          this.isLoading.set(false);
          reject(error);
        }
      });
    });
  }

  /**
   * Upload payment proof
   */
  uploadPaymentProof(
    paymentId: number,
    proofUrl: string,
    cloudinaryPublicId: string
  ): Promise<ApiResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    return new Promise((resolve, reject) => {
      this.http.post<ApiResponse>(`${environment.api.baseUrl}/payment/${paymentId}/proof`, {
        proofUrl,
        cloudinaryPublicId
      }).subscribe({
        next: (response) => {
          this.isLoading.set(false);
          resolve(response);
        },
        error: (error) => {
          console.error('Error uploading payment proof:', error);
          this.error.set('Failed to upload payment proof');
          this.isLoading.set(false);
          reject(error);
        }
      });
    });
  }

  /**
   * Get loading state
   */
  getLoading(): boolean {
    return this.isLoading();
  }

  /**
   * Get error state
   */
  getError(): string | null {
    return this.error();
  }

  /**
   * Clear error
   */
  clearError(): void {
    this.error.set(null);
  }

  /**
   * Get payment evidence for admin verification
   */
  getPaymentEvidence(paymentId: number): Promise<ApiResponse<any>> {
    this.isLoading.set(true);
    this.error.set(null);

    return new Promise((resolve, reject) => {
      this.http.get<ApiResponse<any>>(`${environment.api.baseUrl}/payments/evidence/${paymentId}`)
        .subscribe({
          next: (response) => {
            this.isLoading.set(false);
            resolve(response);
          },
          error: (error) => {
            console.error('Error getting payment evidence:', error);
            this.error.set('Failed to get payment evidence');
            this.isLoading.set(false);
            reject(error);
          }
        });
    });
  }

  /**
   * Verify PayMongo payment with external API
   */
  verifyPayMongoPayment(paymentId: number): Promise<ApiResponse<any>> {
    this.isLoading.set(true);
    this.error.set(null);

    return new Promise((resolve, reject) => {
      this.http.post<ApiResponse<any>>(`${environment.api.baseUrl}/payments/verify-paymongo/${paymentId}`, {})
        .subscribe({
          next: (response) => {
            this.isLoading.set(false);
            resolve(response);
          },
          error: (error) => {
            console.error('Error verifying PayMongo payment:', error);
            this.error.set('Failed to verify PayMongo payment');
            this.isLoading.set(false);
            reject(error);
          }
        });
    });
  }
}

