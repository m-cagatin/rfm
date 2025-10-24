import { Request, Response, Router } from 'express';
import { RowDataPacket } from 'mysql2';
import { PayMongoService } from '../services/paymongo.service';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

/**
 * POST /api/payment/create-link
 * Create PayMongo payment link for an order
 */
router.post('/create-link', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { orderId, amount, description } = req.body;
    const user = (req as any).user;

    if (!orderId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and amount are required'
      });
    }

    // Convert pesos to centavos
    const amountInCentavos = Math.round(amount * 100);

    const result = await PayMongoService.createPaymentLink({
      amount: amountInCentavos,
      description: description || `Order Payment`,
      orderId: parseInt(orderId),
      customerEmail: user.email,
      customerName: user.name || 'Customer'
    });

    res.status(result.success ? 201 : 400).json(result);

  } catch (error) {
    console.error('Error creating payment link:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment link',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/payment/webhook
 * PayMongo webhook endpoint for payment notifications
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['paymongo-signature'] as string;
    const payload = JSON.stringify(req.body);

    // Verify webhook signature
    const isValid = PayMongoService.verifyWebhookSignature(payload, signature);
    
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

    // Handle payment.paid event
    if (eventType === 'payment.paid') {
      const paymentIntentId = event.attributes.data.attributes.payment_intent_id;
      
      const result = await PayMongoService.handlePaymentSuccess(paymentIntentId);
      
      if (result.success) {
        console.log('Payment processed successfully:', paymentIntentId);
        // TODO: Send email notification
      } else {
        console.error('Failed to process payment:', result.message);
      }
    }

    // Respond to PayMongo
    res.status(200).json({ received: true });

  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed'
    });
  }
});

/**
 * GET /api/payment/:paymentId
 * Get payment status
 */
router.get('/:paymentId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const result = await PayMongoService.getPaymentStatus(parseInt(paymentId));
    
    res.status(result.success ? 200 : 404).json(result);

  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/payment/order/:orderId/status
 * Check if order payment is completed
 */
router.get('/order/:orderId/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const customerId = (req as any).user.userId;
    
    const result = await PayMongoService.checkOrderPaymentStatus(parseInt(orderId), customerId);
    
    res.status(200).json(result);

  } catch (error) {
    console.error('Error checking order payment status:', error);
    res.status(500).json({
      success: false,
      isPaid: false,
      message: 'Failed to check payment status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/payment/manual
 * Create manual payment record (GCash/Bank Transfer)
 */
router.post('/manual', authenticateToken, async (req: Request, res: Response) => {
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

    const result = await PayMongoService.createManualPayment(
      parseInt(orderId),
      paymentMethod,
      parseFloat(amount),
      referenceNumber
    );

    res.status(result.success ? 201 : 400).json(result);

  } catch (error) {
    console.error('Error creating manual payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create manual payment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/payment/:paymentId/proof
 * Upload payment proof for manual payment
 */
router.post('/:paymentId/proof', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const { proofUrl, cloudinaryPublicId } = req.body;

    if (!proofUrl) {
      return res.status(400).json({
        success: false,
        message: 'Proof URL is required'
      });
    }

    const result = await PayMongoService.uploadPaymentProof(
      parseInt(paymentId),
      proofUrl,
      cloudinaryPublicId || ''
    );

    res.status(result.success ? 200 : 400).json(result);

  } catch (error) {
    console.error('Error uploading payment proof:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload payment proof',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/payment/:paymentId/verify
 * Verify manual payment (admin only)
 */
router.post('/:paymentId/verify', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const user = (req as any).user;

    const result = await PayMongoService.verifyManualPayment(
      parseInt(paymentId),
      user.userId
    );

    res.status(result.success ? 200 : 400).json(result);

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/payment/manual/pending
 * Get all pending manual payments (admin only)
 */
router.get('/manual/pending', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { pool } = require('../config/database');
    const connection = await pool.getConnection();

    const [rows] = await connection.execute(
      `SELECT p.*, o.order_ref, o.customer_name, o.customer_email, o.total_amount
       FROM payments p
       JOIN orders o ON p.order_id = o.order_id
       WHERE p.payment_status = 'pending' 
         AND p.payment_method IN ('gcash', 'bank_transfer')
       ORDER BY p.created_at DESC`
    );

    connection.release();

    res.json({
      success: true,
      payments: rows
    });

  } catch (error) {
    console.error('Error getting pending payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending payments',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/payments/evidence/:paymentId
 * Get complete payment evidence for admin verification
 */
router.get('/evidence/:paymentId', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const { pool } = require('../config/database');
    const connection = await pool.getConnection();

    // Get payment details with order information
    const [paymentRows] = await connection.execute(
      `SELECT p.*, o.order_ref, o.customer_name, o.customer_email, o.total_amount, o.status as order_status
       FROM payments p
       JOIN orders o ON p.order_id = o.order_id
       WHERE p.payment_id = ?`,
      [paymentId]
    );

    if (paymentRows.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    const payment = paymentRows[0];
    
    // Prepare payment evidence
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
      
      // PayMongo specific evidence
      paymongo_evidence: payment.payment_method === 'paymongo' ? {
        payment_intent_id: payment.paymongo_payment_intent_id,
        payment_id: payment.paymongo_payment_id,
        payment_link_url: payment.paymongo_link_url,
        payment_link_id: payment.paymongo_link_id
      } : null,
      
      // Manual payment evidence
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

  } catch (error) {
    console.error('Error getting payment evidence:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment evidence',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/payments/verify-paymongo/:paymentId
 * Verify PayMongo payment with external API (admin only)
 */
router.post('/verify-paymongo/:paymentId', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const { pool } = require('../config/database');
    const connection = await pool.getConnection();

    // Get payment details
    const [paymentRows] = await connection.execute(
      'SELECT * FROM payments WHERE payment_id = ? AND payment_method = ?',
      [paymentId, 'paymongo']
    );

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

    // Verify with PayMongo API
    const verification = await PayMongoService.verifyPaymentWithPayMongo(payment.paymongo_payment_intent_id);

    if (verification.success && verification.status === 'succeeded') {
      // Update payment status
      await connection.execute(
        `UPDATE payments 
         SET payment_status = 'paid', 
             paid_at = CURRENT_TIMESTAMP,
             verified_by = ?,
             verified_at = CURRENT_TIMESTAMP
         WHERE payment_id = ?`,
        [(req as any).user.userId, paymentId]
      );

      // Update order status
      await connection.execute(
        `UPDATE orders 
         SET status = 'pending' 
         WHERE order_id = ?`,
        [payment.order_id]
      );

      connection.release();

      res.json({
        success: true,
        message: 'Payment verified with PayMongo and order approved',
        verification: verification
      });
    } else {
      connection.release();
      res.status(400).json({
        success: false,
        message: 'Payment not confirmed by PayMongo',
        verification: verification
      });
    }

  } catch (error) {
    console.error('Error verifying PayMongo payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify PayMongo payment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

