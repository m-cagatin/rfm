"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cloudinary_service_1 = require("../services/cloudinary.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
router.post('/delete', auth_middleware_1.authenticateToken, auth_middleware_1.requireAdmin, async (req, res) => {
    try {
        const { publicId } = req.body;
        if (!publicId) {
            res.status(400).json({
                success: false,
                message: 'publicId is required'
            });
            return;
        }
        const result = await cloudinary_service_1.CloudinaryService.deleteImage(publicId);
        res.status(result.success ? 200 : 400).json({
            success: result.success,
            message: result.success ? 'Image deleted successfully' : 'Failed to delete image',
            result: result.result,
            error: result.error
        });
    }
    catch (error) {
        console.error('Error in delete image route:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/delete-multiple', auth_middleware_1.authenticateToken, auth_middleware_1.requireAdmin, async (req, res) => {
    try {
        const { publicIds } = req.body;
        if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
            res.status(400).json({
                success: false,
                message: 'publicIds array is required'
            });
            return;
        }
        const result = await cloudinary_service_1.CloudinaryService.deleteMultipleImages(publicIds);
        res.status(result.success ? 200 : 207).json({
            success: result.success,
            message: `Deleted ${result.deletedCount}/${publicIds.length} images`,
            deletedCount: result.deletedCount,
            failedCount: result.failedCount,
            results: result.results
        });
    }
    catch (error) {
        console.error('Error in delete multiple images route:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/delete-by-prefix', auth_middleware_1.authenticateToken, auth_middleware_1.requireAdmin, async (req, res) => {
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
        const result = await cloudinary_service_1.CloudinaryService.deleteByPrefix(prefix);
        res.status(result.success ? 200 : 400).json({
            success: result.success,
            message: result.success ? 'Images deleted successfully' : 'Failed to delete images',
            result: result.result,
            error: result.error
        });
    }
    catch (error) {
        console.error('Error in delete by prefix route:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=cloudinary.routes.js.map