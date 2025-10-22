"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cart_service_1 = require("../services/cart.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get('/', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const customerId = req.user.userId;
        const result = await cart_service_1.CartService.getCart(customerId);
        res.status(result.success ? 200 : 500).json(result);
    }
    catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cart',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const customerId = req.user.userId;
        const { product_id, product_name, quantity, size, color, unit_price, customization_data } = req.body;
        if (!product_id || !product_name || !quantity || !unit_price) {
            return res.status(400).json({
                success: false,
                message: 'Product ID, name, quantity, and price are required'
            });
        }
        const result = await cart_service_1.CartService.addToCart({
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
    }
    catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add to cart',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.put('/:itemId', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const customerId = req.user.userId;
        const { itemId } = req.params;
        const { quantity } = req.body;
        if (!quantity || quantity < 1) {
            return res.status(400).json({
                success: false,
                message: 'Valid quantity is required'
            });
        }
        const result = await cart_service_1.CartService.updateQuantity(parseInt(itemId), quantity, customerId);
        res.status(result.success ? 200 : 400).json(result);
    }
    catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update cart',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.delete('/:itemId', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const customerId = req.user.userId;
        const { itemId } = req.params;
        const result = await cart_service_1.CartService.removeFromCart(parseInt(itemId), customerId);
        res.status(result.success ? 200 : 404).json(result);
    }
    catch (error) {
        console.error('Error removing from cart:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove item',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.delete('/', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const customerId = req.user.userId;
        const result = await cart_service_1.CartService.clearCart(customerId);
        res.status(result.success ? 200 : 500).json(result);
    }
    catch (error) {
        console.error('Error clearing cart:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear cart',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/merge', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const customerId = req.user.userId;
        const { items } = req.body;
        if (!items || !Array.isArray(items)) {
            return res.status(400).json({
                success: false,
                message: 'Items array is required'
            });
        }
        const result = await cart_service_1.CartService.mergeGuestCart(customerId, items);
        res.status(result.success ? 200 : 400).json(result);
    }
    catch (error) {
        console.error('Error merging cart:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to merge cart',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=cart.routes.js.map