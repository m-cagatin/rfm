import { pool } from '../config/database';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import * as crypto from 'crypto';
import { EmailService } from './email.service';

interface PayMongoConfig {
  secretKey: string;
  publicKey: string;
  webhookSecret: string;
  apiUrl: string;
}

interface CreatePaymentLinkParams {
  amount: number; // in centavos (₱100 = 10000)
  description: string;
  orderId: number;
  customerEmail: string;
  customerName: string;
}

interface PaymentLinkResponse {
  success: boolean;
  paymentLinkUrl?: string;
  paymentLinkId?: string;
  paymentId?: number;
  message?: string;
  error?: string;
}

export class PayMongoService {
  private static config: PayMongoConfig = {
    secretKey: process.env.PAYMONGO_TEST_SECRET_KEY || process.env.PAYMONGO_SECRET_KEY || '',
    publicKey: process.env.PAYMONGO_TEST_PUBLIC_KEY || process.env.PAYMONGO_PUBLIC_KEY || '',
    webhookSecret: process.env.PAYMONGO_WEBHOOK_SECRET || '',
    apiUrl: 'https://api.paymongo.com/v1'
  };

  /**
   * Create a payment link for an order
   */
  static async createPaymentLink(params: CreatePaymentLinkParams): Promise<PaymentLinkResponse> {
    try {
      const { amount, description, orderId, customerEmail, customerName } = params;

      // Validate amount (must be at least ₱100 = 10000 centavos)
      if (amount < 10000) {
        return {
          success: false,
          message: 'Amount must be at least ₱100',
          error: 'INVALID_AMOUNT'
        };
      }

      // Create payment link via PayMongo API
      const response = await fetch(`${this.config.apiUrl}/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(this.config.secretKey + ':').toString('base64')}`
        },
        body: JSON.stringify({
          data: {
            attributes: {
              amount: amount,
              description: description,
              remarks: `Order #${orderId}`,
              // Payment methods available
              payment_method_types: [
                'gcash',
                'paymaya',
                'grab_pay',
                'card',
                'dob',
                'dob_ubp',
                'billease',
                'qrph'
              ]
            }
          }
        })
      });

      const data = await response.json() as any;

      if (!response.ok) {
        console.error('PayMongo API Error:', data);
        return {
          success: false,
          message: 'Failed to create payment link',
          error: data.errors?.[0]?.detail || 'PAYMONGO_ERROR'
        };
      }

      const paymentLink = data.data;
      const paymentLinkUrl = paymentLink.attributes.checkout_url;
      const paymentLinkId = paymentLink.id;

      // Store payment record in database
      const connection = await pool.getConnection();
      
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO payments 
         (order_id, payment_method, payment_status, amount, paymongo_link_url, paymongo_link_id) 
         VALUES (?, 'paymongo', 'pending', ?, ?, ?)`,
        [orderId, amount / 100, paymentLinkUrl, paymentLinkId] // Convert centavos to pesos
      );

      connection.release();

      return {
        success: true,
        paymentLinkUrl: paymentLinkUrl,
        paymentLinkId: paymentLinkId,
        paymentId: result.insertId,
        message: 'Payment link created successfully'
      };

    } catch (error) {
      console.error('Error creating payment link:', error);
      return {
        success: false,
        message: 'Failed to create payment link',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Verify webhook signature
   */
  static verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      if (!this.config.webhookSecret) {
        console.error('Webhook secret not configured');
        return false;
      }

      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(payload)
        .digest('hex');
      
      // Use timing-safe comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Handle payment success webhook
   */
  static async handlePaymentSuccess(paymentIntentId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const connection = await pool.getConnection();

      // Get payment intent details from PayMongo
      const response = await fetch(`${this.config.apiUrl}/payment_intents/${paymentIntentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(this.config.secretKey + ':').toString('base64')}`
        }
      });

      const data = await response.json() as any;
      
      if (!response.ok) {
        connection.release();
        return {
          success: false,
          message: 'Failed to fetch payment intent'
        };
      }

      const paymentIntent = data.data;
      const amount = paymentIntent.attributes.amount;
      const status = paymentIntent.attributes.status;

      // Find payment record by payment intent ID
      const [payments] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM payments WHERE paymongo_payment_intent_id = ?',
        [paymentIntentId]
      );

      if (payments.length === 0) {
        connection.release();
        return {
          success: false,
          message: 'Payment record not found'
        };
      }

      const payment = payments[0];

      // Update payment status
      await connection.execute(
        `UPDATE payments 
         SET payment_status = 'paid', 
             paid_at = CURRENT_TIMESTAMP,
             paymongo_payment_id = ?
         WHERE payment_id = ?`,
        [paymentIntent.id, payment.payment_id]
      );

      // Update order status to pending (ready for production) when payment is confirmed
      await connection.execute(
        `UPDATE orders 
         SET status = 'pending', 
             payment_id = ?
         WHERE order_id = ?`,
        [payment.payment_id, payment.order_id]
      );

      // Clear customer cart after successful payment
      await connection.execute(
        'DELETE FROM cart_items WHERE customer_id = ?',
        [payment.customer_id]
      );

      // Get order details for email
      const [orders] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM orders WHERE order_id = ?',
        [payment.order_id]
      );

      connection.release();

      // Send payment confirmation email (async, don't wait)
      if (orders.length > 0) {
        const order = orders[0] as any;
        EmailService.sendPaymentConfirmation(order).catch(err => {
          console.error('Failed to send payment confirmation email:', err);
        });
      }

      return {
        success: true,
        message: 'Payment processed successfully'
      };

    } catch (error) {
      console.error('Error handling payment success:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get payment status
   */
  static async getPaymentStatus(paymentId: number): Promise<any> {
    try {
      const connection = await pool.getConnection();

      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT p.*, o.order_ref, o.customer_name, o.customer_email
         FROM payments p
         JOIN orders o ON p.order_id = o.order_id
         WHERE p.payment_id = ?`,
        [paymentId]
      );

      connection.release();

      if (rows.length === 0) {
        return {
          success: false,
          message: 'Payment not found'
        };
      }

      return {
        success: true,
        payment: rows[0]
      };

    } catch (error) {
      console.error('Error getting payment status:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create manual payment record (GCash/Bank Transfer)
   */
  static async createManualPayment(
    orderId: number,
    paymentMethod: 'gcash' | 'bank_transfer' | 'cod',
    amount: number,
    referenceNumber?: string
  ): Promise<PaymentLinkResponse> {
    try {
      const connection = await pool.getConnection();

      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO payments 
         (order_id, payment_method, payment_status, amount, reference_number) 
         VALUES (?, ?, 'pending', ?, ?)`,
        [orderId, paymentMethod, amount, referenceNumber || null]
      );

      connection.release();

      return {
        success: true,
        paymentId: result.insertId,
        message: 'Manual payment record created'
      };

    } catch (error) {
      console.error('Error creating manual payment:', error);
      return {
        success: false,
        message: 'Failed to create manual payment',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Upload payment proof (for manual payments)
   */
  static async uploadPaymentProof(
    paymentId: number,
    proofUrl: string,
    cloudinaryPublicId: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const connection = await pool.getConnection();

      await connection.execute(
        `UPDATE payments 
         SET payment_proof_url = ?,
             cloudinary_public_id = ?
         WHERE payment_id = ?`,
        [proofUrl, cloudinaryPublicId, paymentId]
      );

      connection.release();

      return {
        success: true,
        message: 'Payment proof uploaded successfully'
      };

    } catch (error) {
      console.error('Error uploading payment proof:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if order payment is completed
   */
  static async checkOrderPaymentStatus(orderId: number, customerId: number): Promise<{success: boolean; isPaid: boolean; message?: string}> {
    try {
      const connection = await pool.getConnection();

      // Verify order belongs to customer
      const [orderRows] = await connection.execute<RowDataPacket[]>(
        'SELECT order_id, status FROM orders WHERE order_id = ? AND customer_id = ?',
        [orderId, customerId]
      );

      if (orderRows.length === 0) {
        connection.release();
        return {
          success: false,
          isPaid: false,
          message: 'Order not found or access denied'
        };
      }

      const order = orderRows[0];
      
      // Check if order status indicates payment is complete
      // payment_pending = not paid, pending+ = paid
      const isPaid = order.status !== 'payment_pending';

      connection.release();

      return {
        success: true,
        isPaid: isPaid,
        message: isPaid ? 'Payment confirmed' : 'Payment pending'
      };

    } catch (error) {
      console.error('Error checking order payment status:', error);
      return {
        success: false,
        isPaid: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Verify payment with PayMongo API (admin action)
   */
  static async verifyPaymentWithPayMongo(paymentIntentId: string): Promise<{
    success: boolean;
    status?: string;
    amount?: number;
    paid_at?: string;
    customer_email?: string;
    message?: string;
  }> {
    try {
      const response = await fetch(`${this.config.apiUrl}/payment_intents/${paymentIntentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(this.config.secretKey + ':').toString('base64')}`
        }
      });

      if (!response.ok) {
        return {
          success: false,
          message: 'Failed to fetch payment intent from PayMongo'
        };
      }

      const data = await response.json();
      const paymentIntent = (data as any).data;

      return {
        success: true,
        status: paymentIntent.attributes.status,
        amount: paymentIntent.attributes.amount,
        paid_at: paymentIntent.attributes.paid_at,
        customer_email: paymentIntent.attributes.metadata?.customer_email,
        message: 'Payment verification successful'
      };

    } catch (error) {
      console.error('Error verifying payment with PayMongo:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Verify manual payment (admin action)
   */
  static async verifyManualPayment(
    paymentId: number,
    verifiedBy: number
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const connection = await pool.getConnection();

      // Update payment status
      await connection.execute(
        `UPDATE payments 
         SET payment_status = 'paid',
             paid_at = CURRENT_TIMESTAMP,
             verified_by = ?,
             verified_at = CURRENT_TIMESTAMP
         WHERE payment_id = ?`,
        [verifiedBy, paymentId]
      );

      // Get order_id and customer_id
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT order_id, customer_id FROM payments WHERE payment_id = ?',
        [paymentId]
      );

      if (rows.length > 0) {
        const orderId = rows[0].order_id;
        const customerId = rows[0].customer_id;

        // Update order status
        await connection.execute(
          `UPDATE orders 
           SET status = 'pending',
               payment_id = ?
           WHERE order_id = ?`,
          [paymentId, orderId]
        );

        // Clear customer cart after payment verification
        await connection.execute(
          'DELETE FROM cart_items WHERE customer_id = ?',
          [customerId]
        );
      }

      connection.release();

      return {
        success: true,
        message: 'Payment verified successfully'
      };

    } catch (error) {
      console.error('Error verifying payment:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

