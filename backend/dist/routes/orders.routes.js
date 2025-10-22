"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const order_service_1 = require("../services/order.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.post('/', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const customerId = req.user.userId;
        const { customer_name, customer_email, customer_phone, customer_address, notes } = req.body;
        if (!customer_name || !customer_email) {
            return res.status(400).json({
                success: false,
                message: 'Customer name and email are required'
            });
        }
        const result = await order_service_1.OrderService.createOrder({
            customer_id: customerId,
            customer_name,
            customer_email,
            customer_phone,
            customer_address,
            notes
        });
        res.status(result.success ? 201 : 400).json(result);
    }
    catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/', auth_middleware_1.authenticateToken, auth_middleware_1.requireAdmin, async (req, res) => {
    try {
        const { status } = req.query;
        const result = await order_service_1.OrderService.getOrders({
            status: status
        });
        res.status(result.success ? 200 : 500).json(result);
    }
    catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/:id', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await order_service_1.OrderService.getOrder(parseInt(id));
        res.status(result.success ? 200 : 404).json(result);
    }
    catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/customer/:customerId', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const { customerId } = req.params;
        const userId = req.user.userId;
        if (parseInt(customerId) !== userId && req.user.role !== 'employee') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized to view these orders'
            });
        }
        const result = await order_service_1.OrderService.getCustomerOrders(parseInt(customerId));
        res.status(result.success ? 200 : 500).json(result);
    }
    catch (error) {
        console.error('Error fetching customer orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.patch('/:id/status', auth_middleware_1.authenticateToken, auth_middleware_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }
        const result = await order_service_1.OrderService.updateOrderStatus(parseInt(id), status);
        res.status(result.success ? 200 : 404).json(result);
    }
    catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.delete('/:id', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await order_service_1.OrderService.cancelOrder(parseInt(id));
        res.status(result.success ? 200 : 404).json(result);
    }
    catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel order',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=orders.routes.js.map