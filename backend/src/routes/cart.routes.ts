import { Request, Response, Router } from 'express';
import { CartService } from '../services/cart.service';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// GET /api/cart - Get logged-in user's cart
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const customerId = (req as any).user.userId;
    const result = await CartService.getCart(customerId);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cart',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/cart - Add item to cart
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const customerId = (req as any).user.userId;
    const { product_id, product_name, quantity, size, color, unit_price, customization_data } = req.body;
    
    if (!product_id || !product_name || !quantity || !unit_price) {
      return res.status(400).json({
        success: false,
        message: 'Product ID, name, quantity, and price are required'
      });
    }
    
    const result = await CartService.addToCart({
      customer_id: customerId,
      product_id,
      product_name,
      quantity,
      size,
      color,
      unit_price: parseFloat(unit_price),
      customization_data
    });
    
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add to cart',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/cart/:itemId - Update cart item quantity
router.put('/:itemId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const customerId = (req as any).user.userId;
    const { itemId } = req.params;
    const { quantity } = req.body;
    
    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Valid quantity is required'
      });
    }
    
    const result = await CartService.updateQuantity(parseInt(itemId), quantity, customerId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cart',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/cart/:itemId - Remove item from cart
router.delete('/:itemId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const customerId = (req as any).user.userId;
    const { itemId } = req.params;
    
    const result = await CartService.removeFromCart(parseInt(itemId), customerId);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove item',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/cart - Clear entire cart
router.delete('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const customerId = (req as any).user.userId;
    const result = await CartService.clearCart(customerId);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/cart/merge - Merge guest cart on login
router.post('/merge', authenticateToken, async (req: Request, res: Response) => {
  try {
    const customerId = (req as any).user.userId;
    const { items } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required'
      });
    }
    
    const result = await CartService.mergeGuestCart(customerId, items);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error merging cart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to merge cart',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
