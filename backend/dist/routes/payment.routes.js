"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paymongo_service_1 = require("../services/paymongo.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.post('/create-link', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const { orderId, amount, description } = req.body;
        const user = req.user;
        if (!orderId || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Order ID and amount are required'
            });
        }
        const amountInCentavos = Math.round(amount * 100);
        const result = await paymongo_service_1.PayMongoService.createPaymentLink({
            amount: amountInCentavos,
            description: description || `Order Payment`,
            orderId: parseInt(orderId),
            customerEmail: user.email,
            customerName: user.name || 'Customer'
        });
        res.status(result.success ? 201 : 400).json(result);
    }
    catch (error) {
        console.error('Error creating payment link:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create payment link',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/webhook', async (req, res) => {
    try {
        const signature = req.headers['paymongo-signature'];
        const payload = JSON.stringify(req.body);
        const isValid = paymongo_service_1.PayMongoService.verifyWebhookSignature(payload, signature);
        if (!isValid) {
            console.error('Invalid webhook signature');
            return res.status(401).json({
                success: false,
                message: 'Invalid signature'
            });
        }
        const event = req.body.data;
        const eventType = event.attributes.type;
        console.log('Received webhook event:', eventType);
        if (eventType === 'payment.paid') {
            const paymentIntentId = event.attributes.data.attributes.payment_intent_id;
            const result = await paymongo_service_1.PayMongoService.handlePaymentSuccess(paymentIntentId);
            if (result.success) {
                console.log('Payment processed successfully:', paymentIntentId);
            }
            else {
                console.error('Failed to process payment:', result.message);
            }
        }
        res.status(200).json({ received: true });
    }
    catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({
            success: false,
            message: 'Webhook processing failed'
        });
    }
});
router.get('/:paymentId', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const { paymentId } = req.params;
        const result = await paymongo_service_1.PayMongoService.getPaymentStatus(parseInt(paymentId));
        res.status(result.success ? 200 : 404).json(result);
    }
    catch (error) {
        console.error('Error getting payment status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get payment status',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/order/:orderId/status', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const customerId = req.user.userId;
        const result = await paymongo_service_1.PayMongoService.checkOrderPaymentStatus(parseInt(orderId), customerId);
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Error checking order payment status:', error);
        res.status(500).json({
            success: false,
            isPaid: false,
            message: 'Failed to check payment status',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/manual', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const { orderId, paymentMethod, amount, referenceNumber } = req.body;
        if (!orderId || !paymentMethod || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Order ID, payment method, and amount are required'
            });
        }
        const validMethods = ['gcash', 'bank_transfer', 'cod'];
        if (!validMethods.includes(paymentMethod)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment method'
            });
        }
        const result = await paymongo_service_1.PayMongoService.createManualPayment(parseInt(orderId), paymentMethod, parseFloat(amount), referenceNumber);
        res.status(result.success ? 201 : 400).json(result);
    }
    catch (error) {
        console.error('Error creating manual payment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create manual payment',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/:paymentId/proof', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { proofUrl, cloudinaryPublicId } = req.body;
        if (!proofUrl) {
            return res.status(400).json({
                success: false,
                message: 'Proof URL is required'
            });
        }
        const result = await paymongo_service_1.PayMongoService.uploadPaymentProof(parseInt(paymentId), proofUrl, cloudinaryPublicId || '');
        res.status(result.success ? 200 : 400).json(result);
    }
    catch (error) {
        console.error('Error uploading payment proof:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload payment proof',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/:paymentId/verify', auth_middleware_1.authenticateToken, auth_middleware_1.requireAdmin, async (req, res) => {
    try {
        const { paymentId } = req.params;
        const user = req.user;
        const result = await paymongo_service_1.PayMongoService.verifyManualPayment(parseInt(paymentId), user.userId);
        res.status(result.success ? 200 : 400).json(result);
    }
    catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify payment',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/manual/pending', auth_middleware_1.authenticateToken, auth_middleware_1.requireAdmin, async (req, res) => {
    try {
        const { pool } = require('../config/database');
        const connection = await pool.getConnection();
        const [rows] = await connection.execute(`SELECT p.*, o.order_ref, o.customer_name, o.customer_email, o.total_amount
       FROM payments p
       JOIN orders o ON p.order_id = o.order_id
       WHERE p.payment_status = 'pending' 
         AND p.payment_method IN ('gcash', 'bank_transfer')
       ORDER BY p.created_at DESC`);
        connection.release();
        res.json({
            success: true,
            payments: rows
        });
    }
    catch (error) {
        console.error('Error getting pending payments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get pending payments',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/evidence/:paymentId', auth_middleware_1.authenticateToken, auth_middleware_1.requireAdmin, async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { pool } = require('../config/database');
        const connection = await pool.getConnection();
        const [paymentRows] = await connection.execute(`SELECT p.*, o.order_ref, o.customer_name, o.customer_email, o.total_amount, o.status as order_status
       FROM payments p
       JOIN orders o ON p.order_id = o.order_id
       WHERE p.payment_id = ?`, [paymentId]);
        if (paymentRows.length === 0) {
            connection.release();
            return res.status(404).json({
                success: false,
                message: 'Payment record not found'
            });
        }
        const payment = paymentRows[0];
        const evidence = {
            payment_id: payment.payment_id,
            order_ref: payment.order_ref,
            order_status: payment.order_status,
            customer_name: payment.customer_name,
            customer_email: payment.customer_email,
            total_amount: payment.total_amount,
            payment_method: payment.payment_method,
            payment_status: payment.payment_status,
            amount: payment.amount,
            created_at: payment.created_at,
            paid_at: payment.paid_at,
            verified_by: payment.verified_by,
            verified_at: payment.verified_at,
            paymongo_evidence: payment.payment_method === 'paymongo' ? {
                payment_intent_id: payment.paymongo_payment_intent_id,
                payment_id: payment.paymongo_payment_id,
                payment_link_url: payment.paymongo_link_url,
                payment_link_id: payment.paymongo_link_id
            } : null,
            manual_payment_evidence: payment.payment_method !== 'paymongo' ? {
                payment_proof_url: payment.payment_proof_url,
                reference_number: payment.reference_number,
                cloudinary_public_id: payment.cloudinary_public_id
            } : null
        };
        connection.release();
        res.json({
            success: true,
            data: evidence
        });
    }
    catch (error) {
        console.error('Error getting payment evidence:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get payment evidence',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/verify-paymongo/:paymentId', auth_middleware_1.authenticateToken, auth_middleware_1.requireAdmin, async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { pool } = require('../config/database');
        const connection = await pool.getConnection();
        const [paymentRows] = await connection.execute('SELECT * FROM payments WHERE payment_id = ? AND payment_method = ?', [paymentId, 'paymongo']);
        if (paymentRows.length === 0) {
            connection.release();
            return res.status(404).json({
                success: false,
                message: 'PayMongo payment record not found'
            });
        }
        const payment = paymentRows[0];
        if (!payment.paymongo_payment_intent_id) {
            connection.release();
            return res.status(400).json({
                success: false,
                message: 'No PayMongo payment intent ID found'
            });
        }
        const verification = await paymongo_service_1.PayMongoService.verifyPaymentWithPayMongo(payment.paymongo_payment_intent_id);
        if (verification.success && verification.status === 'succeeded') {
            await connection.execute(`UPDATE payments 
         SET payment_status = 'paid', 
             paid_at = CURRENT_TIMESTAMP,
             verified_by = ?,
             verified_at = CURRENT_TIMESTAMP
         WHERE payment_id = ?`, [req.user.userId, paymentId]);
            await connection.execute(`UPDATE orders 
         SET status = 'pending' 
         WHERE order_id = ?`, [payment.order_id]);
            connection.release();
            res.json({
                success: true,
                message: 'Payment verified with PayMongo and order approved',
                verification: verification
            });
        }
        else {
            connection.release();
            res.status(400).json({
                success: false,
                message: 'Payment not confirmed by PayMongo',
                verification: verification
            });
        }
    }
    catch (error) {
        console.error('Error verifying PayMongo payment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify PayMongo payment',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=payment.routes.js.map