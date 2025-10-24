interface CreatePaymentLinkParams {
    amount: number;
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
export declare class PayMongoService {
    private static config;
    static createPaymentLink(params: CreatePaymentLinkParams): Promise<PaymentLinkResponse>;
    static verifyWebhookSignature(payload: string, signature: string): boolean;
    static handlePaymentSuccess(paymentIntentId: string): Promise<{
        success: boolean;
        message?: string;
    }>;
    static getPaymentStatus(paymentId: number): Promise<any>;
    static createManualPayment(orderId: number, paymentMethod: 'gcash' | 'bank_transfer' | 'cod', amount: number, referenceNumber?: string): Promise<PaymentLinkResponse>;
    static uploadPaymentProof(paymentId: number, proofUrl: string, cloudinaryPublicId: string): Promise<{
        success: boolean;
        message?: string;
    }>;
    static checkOrderPaymentStatus(orderId: number, customerId: number): Promise<{
        success: boolean;
        isPaid: boolean;
        message?: string;
    }>;
    static verifyPaymentWithPayMongo(paymentIntentId: string): Promise<{
        success: boolean;
        status?: string;
        amount?: number;
        paid_at?: string;
        customer_email?: string;
        message?: string;
    }>;
    static verifyManualPayment(paymentId: number, verifiedBy: number): Promise<{
        success: boolean;
        message?: string;
    }>;
}
export {};
//# sourceMappingURL=paymongo.service.d.ts.map