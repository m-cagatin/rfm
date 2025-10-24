"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayMongoService = void 0;
const database_1 = require("../config/database");
const crypto = __importStar(require("crypto"));
const email_service_1 = require("./email.service");
class PayMongoService {
    static async createPaymentLink(params) {
        try {
            const { amount, description, orderId, customerEmail, customerName } = params;
            if (amount < 10000) {
                return {
                    success: false,
                    message: 'Amount must be at least ₱100',
                    error: 'INVALID_AMOUNT'
                };
            }
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
            const data = await response.json();
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
            const connection = await database_1.pool.getConnection();
            const [result] = await connection.execute(`INSERT INTO payments 
         (order_id, payment_method, payment_status, amount, paymongo_link_url, paymongo_link_id) 
         VALUES (?, 'paymongo', 'pending', ?, ?, ?)`, [orderId, amount / 100, paymentLinkUrl, paymentLinkId]);
            connection.release();
            return {
                success: true,
                paymentLinkUrl: paymentLinkUrl,
                paymentLinkId: paymentLinkId,
                paymentId: result.insertId,
                message: 'Payment link created successfully'
            };
        }
        catch (error) {
            console.error('Error creating payment link:', error);
            return {
                success: false,
                message: 'Failed to create payment link',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    static verifyWebhookSignature(payload, signature) {
        try {
            if (!this.config.webhookSecret) {
                console.error('Webhook secret not configured');
                return false;
            }
            const expectedSignature = crypto
                .createHmac('sha256', this.config.webhookSecret)
                .update(payload)
                .digest('hex');
            return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
        }
        catch (error) {
            console.error('Error verifying webhook signature:', error);
            return false;
        }
    }
    static async handlePaymentSuccess(paymentIntentId) {
        try {
            const connection = await database_1.pool.getConnection();
            const response = await fetch(`${this.config.apiUrl}/payment_intents/${paymentIntentId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${Buffer.from(this.config.secretKey + ':').toString('base64')}`
                }
            });
            const data = await response.json();
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
            const [payments] = await connection.execute('SELECT * FROM payments WHERE paymongo_payment_intent_id = ?', [paymentIntentId]);
            if (payments.length === 0) {
                connection.release();
                return {
                    success: false,
                    message: 'Payment record not found'
                };
            }
            const payment = payments[0];
            await connection.execute(`UPDATE payments 
         SET payment_status = 'paid', 
             paid_at = CURRENT_TIMESTAMP,
             paymongo_payment_id = ?
         WHERE payment_id = ?`, [paymentIntent.id, payment.payment_id]);
            await connection.execute(`UPDATE orders 
         SET status = 'pending', 
             payment_id = ?
         WHERE order_id = ?`, [payment.payment_id, payment.order_id]);
            await connection.execute('DELETE FROM cart_items WHERE customer_id = ?', [payment.customer_id]);
            const [orders] = await connection.execute('SELECT * FROM orders WHERE order_id = ?', [payment.order_id]);
            connection.release();
            if (orders.length > 0) {
                const order = orders[0];
                email_service_1.EmailService.sendPaymentConfirmation(order).catch(err => {
                    console.error('Failed to send payment confirmation email:', err);
                });
            }
            return {
                success: true,
                message: 'Payment processed successfully'
            };
        }
        catch (error) {
            console.error('Error handling payment success:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    static async getPaymentStatus(paymentId) {
        try {
            const connection = await database_1.pool.getConnection();
            const [rows] = await connection.execute(`SELECT p.*, o.order_ref, o.customer_name, o.customer_email
         FROM payments p
         JOIN orders o ON p.order_id = o.order_id
         WHERE p.payment_id = ?`, [paymentId]);
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
        }
        catch (error) {
            console.error('Error getting payment status:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    static async createManualPayment(orderId, paymentMethod, amount, referenceNumber) {
        try {
            const connection = await database_1.pool.getConnection();
            const [result] = await connection.execute(`INSERT INTO payments 
         (order_id, payment_method, payment_status, amount, reference_number) 
         VALUES (?, ?, 'pending', ?, ?)`, [orderId, paymentMethod, amount, referenceNumber || null]);
            connection.release();
            return {
                success: true,
                paymentId: result.insertId,
                message: 'Manual payment record created'
            };
        }
        catch (error) {
            console.error('Error creating manual payment:', error);
            return {
                success: false,
                message: 'Failed to create manual payment',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    static async uploadPaymentProof(paymentId, proofUrl, cloudinaryPublicId) {
        try {
            const connection = await database_1.pool.getConnection();
            await connection.execute(`UPDATE payments 
         SET payment_proof_url = ?,
             cloudinary_public_id = ?
         WHERE payment_id = ?`, [proofUrl, cloudinaryPublicId, paymentId]);
            connection.release();
            return {
                success: true,
                message: 'Payment proof uploaded successfully'
            };
        }
        catch (error) {
            console.error('Error uploading payment proof:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    static async checkOrderPaymentStatus(orderId, customerId) {
        try {
            const connection = await database_1.pool.getConnection();
            const [orderRows] = await connection.execute('SELECT order_id, status FROM orders WHERE order_id = ? AND customer_id = ?', [orderId, customerId]);
            if (orderRows.length === 0) {
                connection.release();
                return {
                    success: false,
                    isPaid: false,
                    message: 'Order not found or access denied'
                };
            }
            const order = orderRows[0];
            const isPaid = order.status !== 'payment_pending';
            connection.release();
            return {
                success: true,
                isPaid: isPaid,
                message: isPaid ? 'Payment confirmed' : 'Payment pending'
            };
        }
        catch (error) {
            console.error('Error checking order payment status:', error);
            return {
                success: false,
                isPaid: false,
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    static async verifyPaymentWithPayMongo(paymentIntentId) {
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
            const paymentIntent = data.data;
            return {
                success: true,
                status: paymentIntent.attributes.status,
                amount: paymentIntent.attributes.amount,
                paid_at: paymentIntent.attributes.paid_at,
                customer_email: paymentIntent.attributes.metadata?.customer_email,
                message: 'Payment verification successful'
            };
        }
        catch (error) {
            console.error('Error verifying payment with PayMongo:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    static async verifyManualPayment(paymentId, verifiedBy) {
        try {
            const connection = await database_1.pool.getConnection();
            await connection.execute(`UPDATE payments 
         SET payment_status = 'paid',
             paid_at = CURRENT_TIMESTAMP,
             verified_by = ?,
             verified_at = CURRENT_TIMESTAMP
         WHERE payment_id = ?`, [verifiedBy, paymentId]);
            const [rows] = await connection.execute('SELECT order_id, customer_id FROM payments WHERE payment_id = ?', [paymentId]);
            if (rows.length > 0) {
                const orderId = rows[0].order_id;
                const customerId = rows[0].customer_id;
                await connection.execute(`UPDATE orders 
           SET status = 'pending',
               payment_id = ?
           WHERE order_id = ?`, [paymentId, orderId]);
                await connection.execute('DELETE FROM cart_items WHERE customer_id = ?', [customerId]);
            }
            connection.release();
            return {
                success: true,
                message: 'Payment verified successfully'
            };
        }
        catch (error) {
            console.error('Error verifying payment:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}
exports.PayMongoService = PayMongoService;
PayMongoService.config = {
    secretKey: process.env.PAYMONGO_TEST_SECRET_KEY || process.env.PAYMONGO_SECRET_KEY || '',
    publicKey: process.env.PAYMONGO_TEST_PUBLIC_KEY || process.env.PAYMONGO_PUBLIC_KEY || '',
    webhookSecret: process.env.PAYMONGO_WEBHOOK_SECRET || '',
    apiUrl: 'https://api.paymongo.com/v1'
};
//# sourceMappingURL=paymongo.service.js.map