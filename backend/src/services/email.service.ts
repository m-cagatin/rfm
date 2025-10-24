import nodemailer from 'nodemailer';
import { Order } from './order.service';

export interface EmailConfig {
  service: string;
  user: string;
  password: string;
  from: string;
}

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  /**
   * Initialize email transporter
   */
  static initialize(): void {
    const config: EmailConfig = {
      service: process.env.EMAIL_SERVICE || 'gmail',
      user: process.env.EMAIL_USER || '',
      password: process.env.EMAIL_PASSWORD || '',
      from: process.env.EMAIL_FROM || 'RFM Custom Apparel <noreply@rfm.com>'
    };

    if (!config.user || !config.password) {
      console.warn('⚠️ Email service not configured. Email notifications will be disabled.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      service: config.service,
      auth: {
        user: config.user,
        pass: config.password
      }
    });

    console.log('✅ Email service initialized');
  }

  /**
   * Check if email service is available
   */
  static isAvailable(): boolean {
    return this.transporter !== null;
  }

  /**
   * Send order confirmation email
   */
  static async sendOrderConfirmation(
    order: Order,
    paymentLink?: string
  ): Promise<{ success: boolean; message?: string }> {
    if (!this.isAvailable()) {
      console.log('Email service not available - skipping order confirmation email');
      return { success: false, message: 'Email service not configured' };
    }

    try {
      const subject = `Order Confirmation - ${order.order_ref}`;
      const html = this.generateOrderConfirmationEmail(order, paymentLink);

      await this.transporter!.sendMail({
        from: process.env.EMAIL_FROM,
        to: order.customer_email,
        subject,
        html
      });

      console.log(`✅ Order confirmation email sent to ${order.customer_email}`);
      return { success: true, message: 'Email sent successfully' };
    } catch (error) {
      console.error('Error sending order confirmation email:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send email'
      };
    }
  }

  /**
   * Send payment confirmation email
   */
  static async sendPaymentConfirmation(
    order: Order
  ): Promise<{ success: boolean; message?: string }> {
    if (!this.isAvailable()) {
      console.log('Email service not available - skipping payment confirmation email');
      return { success: false, message: 'Email service not configured' };
    }

    try {
      const subject = `Payment Confirmed - ${order.order_ref}`;
      const html = this.generatePaymentConfirmationEmail(order);

      await this.transporter!.sendMail({
        from: process.env.EMAIL_FROM,
        to: order.customer_email,
        subject,
        html
      });

      console.log(`✅ Payment confirmation email sent to ${order.customer_email}`);
      return { success: true, message: 'Email sent successfully' };
    } catch (error) {
      console.error('Error sending payment confirmation email:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send email'
      };
    }
  }

  /**
   * Send order status update email
   */
  static async sendOrderStatusUpdate(
    order: Order,
    newStatus: string
  ): Promise<{ success: boolean; message?: string }> {
    if (!this.isAvailable()) {
      console.log('Email service not available - skipping status update email');
      return { success: false, message: 'Email service not configured' };
    }

    try {
      const subject = `Order Status Update - ${order.order_ref}`;
      const html = this.generateStatusUpdateEmail(order, newStatus);

      await this.transporter!.sendMail({
        from: process.env.EMAIL_FROM,
        to: order.customer_email,
        subject,
        html
      });

      console.log(`✅ Status update email sent to ${order.customer_email}`);
      return { success: true, message: 'Email sent successfully' };
    } catch (error) {
      console.error('Error sending status update email:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send email'
      };
    }
  }

  /**
   * Generate order confirmation email HTML
   */
  private static generateOrderConfirmationEmail(order: Order, paymentLink?: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .order-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Order Confirmation</h1>
    </div>
    <div class="content">
      <p>Dear ${order.customer_name},</p>
      <p>Thank you for your order! We've received your order and it's being processed.</p>
      
      <div class="order-details">
        <h3>Order Details</h3>
        <p><strong>Order Reference:</strong> ${order.order_ref}</p>
        <p><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Total Amount:</strong> ₱${order.total_amount.toFixed(2)}</p>
        <p><strong>Status:</strong> ${order.status || 'Pending'}</p>
      </div>
      
      ${paymentLink ? `
        <div style="text-align: center; margin: 20px 0;">
          <p><strong>Complete your payment to process your order:</strong></p>
          <a href="${paymentLink}" class="button">Pay Now</a>
        </div>
      ` : ''}
      
      ${order.customer_address ? `
        <div class="order-details">
          <h3>Shipping Address</h3>
          <p>${order.customer_address}</p>
        </div>
      ` : ''}
      
      <p>We'll send you another email once your payment is confirmed and your order is being prepared.</p>
      <p>If you have any questions, please don't hesitate to contact us.</p>
    </div>
    <div class="footer">
      <p>RFM Custom Apparel</p>
      <p>This is an automated email. Please do not reply.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate payment confirmation email HTML
   */
  private static generatePaymentConfirmationEmail(order: Order): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .order-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .success-icon { font-size: 48px; text-align: center; color: #4CAF50; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Payment Confirmed!</h1>
    </div>
    <div class="content">
      <div class="success-icon">✓</div>
      <p>Dear ${order.customer_name},</p>
      <p>Great news! We've received your payment and your order is now being prepared.</p>
      
      <div class="order-details">
        <h3>Order Details</h3>
        <p><strong>Order Reference:</strong> ${order.order_ref}</p>
        <p><strong>Payment Amount:</strong> ₱${order.total_amount.toFixed(2)}</p>
        <p><strong>Status:</strong> Processing</p>
      </div>
      
      <p>We'll keep you updated on the progress of your order. You can expect your custom apparel to be ready soon!</p>
      <p>Thank you for choosing RFM Custom Apparel!</p>
    </div>
    <div class="footer">
      <p>RFM Custom Apparel</p>
      <p>This is an automated email. Please do not reply.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate status update email HTML
   */
  private static generateStatusUpdateEmail(order: Order, newStatus: string): string {
    const statusMessages: { [key: string]: string } = {
      'pending': 'Your order is pending confirmation.',
      'processing': 'Your order is being prepared.',
      'ready': 'Your order is ready for pickup/delivery!',
      'completed': 'Your order has been completed. Thank you!',
      'cancelled': 'Your order has been cancelled.'
    };

    const message = statusMessages[newStatus.toLowerCase()] || `Your order status has been updated to: ${newStatus}`;

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .order-details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .status-badge { display: inline-block; padding: 8px 16px; background-color: #2196F3; color: white; border-radius: 20px; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Order Status Update</h1>
    </div>
    <div class="content">
      <p>Dear ${order.customer_name},</p>
      <p>${message}</p>
      
      <div class="order-details">
        <h3>Order Details</h3>
        <p><strong>Order Reference:</strong> ${order.order_ref}</p>
        <p><strong>Status:</strong> <span class="status-badge">${newStatus}</span></p>
      </div>
      
      <p>If you have any questions about your order, please don't hesitate to contact us.</p>
    </div>
    <div class="footer">
      <p>RFM Custom Apparel</p>
      <p>This is an automated email. Please do not reply.</p>
    </div>
  </div>
</body>
</html>
    `;
  }
}

