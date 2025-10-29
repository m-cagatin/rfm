"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const inventory_service_1 = require("../services/inventory.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get('/low-stock', auth_middleware_1.authenticateToken, auth_middleware_1.requireAdmin, async (req, res) => {
    try {
        const { threshold } = req.query;
        const thresholdValue = threshold ? parseInt(threshold) : 10;
        const result = await inventory_service_1.InventoryService.getLowStockProducts(thresholdValue);
        res.status(result.success ? 200 : 500).json(result);
    }
    catch (error) {
        console.error('Error getting low stock products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get low stock products',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/:productId/stock', async (req, res) => {
    try {
        const { productId } = req.params;
        const result = await inventory_service_1.InventoryService.getProductStock(parseInt(productId));
        res.status(result.success ? 200 : 404).json(result);
    }
    catch (error) {
        console.error('Error getting product stock:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get product stock',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/check-multiple', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const { items } = req.body;
        if (!items || !Array.isArray(items)) {
            return res.status(400).json({
                success: false,
                message: 'Items array is required'
            });
        }
        const result = await inventory_service_1.InventoryService.checkMultipleStock(items);
        res.status(result.success ? 200 : 400).json(result);
    }
    catch (error) {
        console.error('Error checking multiple stock:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check stock',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=inventory.routes.js.map