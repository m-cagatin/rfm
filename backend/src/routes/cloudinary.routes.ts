import express, { Request, Response, Router } from 'express';
import { CloudinaryService } from '../services/cloudinary.service';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';

const router: Router = express.Router();

/**
 * POST /api/cloudinary/delete
 * Delete a single image from Cloudinary
 * Requires: Admin authentication
 * Body: { publicId: string }
 */
router.post('/delete', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { publicId } = req.body;
    
    if (!publicId) {
      res.status(400).json({
        success: false,
        message: 'publicId is required'
      });
      return;
    }
    
    const result = await CloudinaryService.deleteImage(publicId);
    
    res.status(result.success ? 200 : 400).json({
      success: result.success,
      message: result.success ? 'Image deleted successfully' : 'Failed to delete image',
      result: result.result,
      error: result.error
    });
  } catch (error) {
    console.error('Error in delete image route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/cloudinary/delete-multiple
 * Delete multiple images from Cloudinary
 * Requires: Admin authentication
 * Body: { publicIds: string[] }
 */
router.post('/delete-multiple', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { publicIds } = req.body;
    
    if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
      res.status(400).json({
        success: false,
        message: 'publicIds array is required'
      });
      return;
    }
    
    const result = await CloudinaryService.deleteMultipleImages(publicIds);
    
    res.status(result.success ? 200 : 207).json({
      success: result.success,
      message: `Deleted ${result.deletedCount}/${publicIds.length} images`,
      deletedCount: result.deletedCount,
      failedCount: result.failedCount,
      results: result.results
    });
  } catch (error) {
    console.error('Error in delete multiple images route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/cloudinary/delete-by-prefix
 * Delete all images matching a prefix (folder)
 * USE WITH EXTREME CAUTION
 * Requires: Admin authentication
 * Body: { prefix: string, confirmDeletion: boolean }
 */
router.post('/delete-by-prefix', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { prefix, confirmDeletion } = req.body;
    
    if (!prefix) {
      res.status(400).json({
        success: false,
        message: 'prefix is required'
      });
      return;
    }
    
    if (!confirmDeletion) {
      res.status(400).json({
        success: false,
        message: 'confirmDeletion must be true to proceed with bulk deletion'
      });
      return;
    }
    
    const result = await CloudinaryService.deleteByPrefix(prefix);
    
    res.status(result.success ? 200 : 400).json({
      success: result.success,
      message: result.success ? 'Images deleted successfully' : 'Failed to delete images',
      result: result.result,
      error: result.error
    });
  } catch (error) {
    console.error('Error in delete by prefix route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
