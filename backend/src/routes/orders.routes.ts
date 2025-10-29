import { Request, Response, Router } from 'express';
import { OrderService } from '../services/order.service';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// POST /api/orders - Create order from cart
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const customerId = (req as any).user.userId;
    const { customer_name, customer_email, customer_phone, customer_address, notes } = req.body;
    
    if (!customer_name || !customer_email) {
      return res.status(400).json({
        success: false,
        message: 'Customer name and email are required'
      });
    }
    
    const result = await OrderService.createOrder({
      customer_id: customerId,
      customer_name,
      customer_email,
      customer_phone,
      customer_address,
      notes
    });
    
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/orders/status/:status - Get orders by status (admin only)
router.get('/status/:status', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status } = req.params;
    const result = await OrderService.getOrdersByStatus(status);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error getting orders by status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get orders',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/orders - Get all orders (admin only)
router.get('/', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const result = await OrderService.getOrders({ 
      status: status as string | undefined 
    });
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/orders/:id - Get order details
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await OrderService.getOrder(parseInt(id));
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/orders/customer/:customerId - Get customer's orders
router.get('/customer/:customerId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const userId = (req as any).user.userId;
    
    // Check if user is accessing their own orders or is admin
    if (parseInt(customerId) !== userId && (req as any).user.role !== 'employee') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view these orders'
      });
    }
    
    const result = await OrderService.getCustomerOrders(parseInt(customerId));
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PATCH /api/orders/:id/status - Update order status (admin only)
router.patch('/:id/status', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    const result = await OrderService.updateOrderStatus(parseInt(id), status);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/orders/:id - Cancel order
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await OrderService.cancelOrder(parseInt(id));
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/orders/:id/reorder - Reorder items from a previous order
router.post('/:id/reorder', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customerId = (req as any).user.userId;
    
    const result = await OrderService.reorderFromOrder(parseInt(id), customerId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error reordering:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reorder items',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
