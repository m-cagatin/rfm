import { Request, Response, Router } from 'express';
import { DatabaseService } from '../services/database.service';

const router = Router();

// GET /api/catalog - Get all products
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, status } = req.query;
    const result = await DatabaseService.getProducts(
      category as string | undefined,
      status as string | undefined
    );
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/catalog/:id - Get single product
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await DatabaseService.getProduct(id);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/catalog - Create product
router.post('/', async (req: Request, res: Response) => {
  try {
    const { product_name, category, base_price, description, image_url, cloudinary_public_id, status, stock_quantity, sku, sizes, tags } = req.body;
    
    if (!product_name || !category || !base_price || !image_url) {
      return res.status(400).json({
        success: false,
        message: 'Product name, category, base price, and image URL are required'
      });
    }
    
    const result = await DatabaseService.createProduct({
      product_name,
      category,
      base_price: parseFloat(base_price),
      description,
      image_url,
      cloudinary_public_id,
      status,
      stock_quantity: stock_quantity ? parseInt(stock_quantity) : 0,
      sku,
      sizes: sizes ? JSON.stringify(sizes) : null,
      tags: tags ? JSON.stringify(tags) : null
    });
    
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/catalog/:id - Update product
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData: any = {};
    
    if (req.body.product_name) updateData.product_name = req.body.product_name;
    if (req.body.category) updateData.category = req.body.category;
    if (req.body.base_price) updateData.base_price = parseFloat(req.body.base_price);
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.image_url) updateData.image_url = req.body.image_url;
    if (req.body.cloudinary_public_id) updateData.cloudinary_public_id = req.body.cloudinary_public_id;
    if (req.body.status) updateData.status = req.body.status;
    if (req.body.stock_quantity !== undefined) updateData.stock_quantity = parseInt(req.body.stock_quantity);
    if (req.body.sku !== undefined) updateData.sku = req.body.sku;
    if (req.body.sizes) updateData.sizes = JSON.stringify(req.body.sizes);
    if (req.body.tags) updateData.tags = JSON.stringify(req.body.tags);
    
    const result = await DatabaseService.updateProduct(id, updateData);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PATCH /api/catalog/:id/archive - Archive product (soft delete)
router.patch('/:id/archive', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await DatabaseService.archiveProduct(id);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('Error archiving product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive product',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PATCH /api/catalog/:id/restore - Restore archived product
router.patch('/:id/restore', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await DatabaseService.restoreProduct(id);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('Error restoring product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore product',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/catalog/:id - Permanently delete product (hard delete)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await DatabaseService.deleteProductPermanently(id);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('Error permanently deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to permanently delete product',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

