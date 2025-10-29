import { Request, Response, Router } from 'express';
import { InventoryService } from '../services/inventory.service';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/inventory/low-stock
 * Get products with low stock (admin only)
 */
router.get('/low-stock', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { threshold } = req.query;
    const thresholdValue = threshold ? parseInt(threshold as string) : 10;
    
    const result = await InventoryService.getLowStockProducts(thresholdValue);
    
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Error getting low stock products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get low stock products',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/inventory/:productId/stock
 * Check stock for a specific product
 */
router.get('/:productId/stock', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    
    const result = await InventoryService.getProductStock(parseInt(productId));
    
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('Error getting product stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get product stock',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/inventory/check-multiple
 * Check stock for multiple products (for cart validation)
 */
router.post('/check-multiple', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required'
      });
    }
    
    const result = await InventoryService.checkMultipleStock(items);
    
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error checking multiple stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check stock',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

