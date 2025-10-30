"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudinaryService = void 0;
const cloudinary_1 = require("cloudinary");
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});
class CloudinaryService {
    static async deleteImage(publicId) {
        try {
            console.log(`🗑️ Attempting to delete image from Cloudinary: ${publicId}`);
            const result = await cloudinary_1.v2.uploader.destroy(publicId, {
                invalidate: true,
                resource_type: 'image'
            });
            if (result.result === 'ok') {
                console.log(`✓ Successfully deleted: ${publicId}`);
                return {
                    success: true,
                    result: result.result
                };
            }
            else if (result.result === 'not found') {
                console.warn(`⚠️ Image not found in Cloudinary: ${publicId}`);
                return {
                    success: false,
                    result: result.result,
                    error: 'Image not found'
                };
            }
            else {
                console.error(`✗ Failed to delete: ${publicId}`, result);
                return {
                    success: false,
                    result: result.result,
                    error: 'Deletion failed'
                };
            }
        }
        catch (error) {
            console.error('Error deleting image from Cloudinary:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    static async deleteMultipleImages(publicIds) {
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
        }
        catch (error) {
            console.error('Error deleting multiple images:', error);
            return {
                success: false,
                deletedCount: 0,
                failedCount: publicIds.length,
                results: []
            };
        }
    }
    static async deleteByPrefix(prefix) {
        try {
            console.log(`🗑️ Deleting all images with prefix: ${prefix}`);
            const result = await cloudinary_1.v2.api.delete_resources_by_prefix(prefix, {
                invalidate: true,
                resource_type: 'image'
            });
            console.log(`✓ Deleted ${result.deleted_counts?.original || 0} images`);
            return {
                success: true,
                result: `Deleted ${result.deleted_counts?.original || 0} images`
            };
        }
        catch (error) {
            console.error('Error deleting images by prefix:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}
exports.CloudinaryService = CloudinaryService;
//# sourceMappingURL=cloudinary.service.js.map