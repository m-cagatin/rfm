import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
// Make sure to add these to your .env file:
// CLOUDINARY_CLOUD_NAME=your_cloud_name
// CLOUDINARY_API_KEY=your_api_key
// CLOUDINARY_API_SECRET=your_api_secret

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export interface DeleteResult {
  success: boolean;
  result?: string;
  error?: string;
}

export class CloudinaryService {
  /**
   * Delete a single image from Cloudinary
   * @param publicId - The public_id of the image (including folder path)
   * @returns Promise with deletion result
   */
  static async deleteImage(publicId: string): Promise<DeleteResult> {
    try {
      console.log(`🗑️ Attempting to delete image from Cloudinary: ${publicId}`);
      
      const result = await cloudinary.uploader.destroy(publicId, {
        invalidate: true, // Invalidate CDN cache
        resource_type: 'image'
      });
      
      if (result.result === 'ok') {
        console.log(`✓ Successfully deleted: ${publicId}`);
        return {
          success: true,
          result: result.result
        };
      } else if (result.result === 'not found') {
        console.warn(`⚠️ Image not found in Cloudinary: ${publicId}`);
        return {
          success: false,
          result: result.result,
          error: 'Image not found'
        };
      } else {
        console.error(`✗ Failed to delete: ${publicId}`, result);
        return {
          success: false,
          result: result.result,
          error: 'Deletion failed'
        };
      }
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete multiple images from Cloudinary
   * @param publicIds - Array of public_ids to delete
   * @returns Promise with deletion results
   */
  static async deleteMultipleImages(publicIds: string[]): Promise<{
    success: boolean;
    deletedCount: number;
    failedCount: number;
    results: DeleteResult[];
  }> {
    try {
      console.log(`🗑️ Deleting ${publicIds.length} images from Cloudinary...`);
      
      const deletePromises = publicIds.map(id => this.deleteImage(id));
      const results = await Promise.all(deletePromises);
      
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.length - successCount;
      
      console.log(`✓ Deleted ${successCount}/${publicIds.length} images`);
      
      return {
        success: failedCount === 0,
        deletedCount: successCount,
        failedCount,
        results
      };
    } catch (error) {
      console.error('Error deleting multiple images:', error);
      return {
        success: false,
        deletedCount: 0,
        failedCount: publicIds.length,
        results: []
      };
    }
  }

  /**
   * Delete images by prefix (folder)
   * USE WITH CAUTION - Deletes all images matching the prefix
   * @param prefix - The folder prefix (e.g., 'rfm_images/catalog/')
   */
  static async deleteByPrefix(prefix: string): Promise<DeleteResult> {
    try {
      console.log(`🗑️ Deleting all images with prefix: ${prefix}`);
      
      const result = await cloudinary.api.delete_resources_by_prefix(prefix, {
        invalidate: true,
        resource_type: 'image'
      });
      
      console.log(`✓ Deleted ${result.deleted_counts?.original || 0} images`);
      
      return {
        success: true,
        result: `Deleted ${result.deleted_counts?.original || 0} images`
      };
    } catch (error) {
      console.error('Error deleting images by prefix:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
