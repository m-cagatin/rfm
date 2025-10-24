import { Order } from './order.service';
export interface EmailConfig {
    service: string;
    user: string;
    password: string;
    from: string;
}
export declare class EmailService {
    private static transporter;
    static initialize(): void;
    static isAvailable(): boolean;
    static sendOrderConfirmation(order: Order, paymentLink?: string): Promise<{
        success: boolean;
        message?: string;
    }>;
    static sendPaymentConfirmation(order: Order): Promise<{
        success: boolean;
        message?: string;
    }>;
    static sendOrderStatusUpdate(order: Order, newStatus: string): Promise<{
        success: boolean;
        message?: string;
    }>;
    private static generateOrderConfirmationEmail;
    private static generatePaymentConfirmationEmail;
    private static generateStatusUpdateEmail;
}
//# sourceMappingURL=email.service.d.ts.map