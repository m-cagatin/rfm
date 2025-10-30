"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_service_1 = require("../services/database.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        const { category, status } = req.query;
        const result = await database_service_1.DatabaseService.getProducts(category, status);
        res.status(result.success ? 200 : 500).json(result);
    }
    catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/', auth_middleware_1.authenticateToken, auth_middleware_1.requireAdmin, async (req, res) => {
    try {
        const { product_name, category, base_price, description, status, stock_quantity, sku, sizes, tags, colors, images, material, gender, allows_customization, production_days, stock_by_size_color } = req.body;
        if (!product_name || !category || !base_price) {
            return res.status(400).json({
                success: false,
                message: 'Product name, category, and base price are required'
            });
        }
        const result = await database_service_1.DatabaseService.createProduct({
            product_name,
            category,
            base_price: parseFloat(base_price),
            description,
            images,
            status,
            stock_quantity: stock_quantity ? parseInt(stock_quantity) : 0,
            sku,
            sizes: sizes || null,
            tags: tags || null,
            colors: colors || null,
            material,
            gender,
            allows_customization: allows_customization ?? true,
            production_days: production_days ? parseInt(production_days) : 3,
            stock_by_size_color: stock_by_size_color || null
        });
        res.status(result.success ? 201 : 400).json(result);
    }
    catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create product',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.put('/:id', auth_middleware_1.authenticateToken, auth_middleware_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = {};
        if (req.body.product_name)
            updateData.product_name = req.body.product_name;
        if (req.body.category)
            updateData.category = req.body.category;
        if (req.body.base_price)
            updateData.base_price = parseFloat(req.body.base_price);
        if (req.body.description !== undefined)
            updateData.description = req.body.description;
        if (req.body.status)
            updateData.status = req.body.status;
        if (req.body.stock_quantity !== undefined)
            updateData.stock_quantity = parseInt(req.body.stock_quantity);
        if (req.body.sku !== undefined)
            updateData.sku = req.body.sku;
        if (req.body.sizes)
            updateData.sizes = req.body.sizes;
        if (req.body.tags)
            updateData.tags = req.body.tags;
        if (req.body.colors)
            updateData.colors = req.body.colors;
        if (req.body.images !== undefined)
            updateData.images = req.body.images;
        if (req.body.material !== undefined)
            updateData.material = req.body.material;
        if (req.body.gender)
            updateData.gender = req.body.gender;
        if (req.body.allows_customization !== undefined)
            updateData.allows_customization = req.body.allows_customization;
        if (req.body.production_days !== undefined)
            updateData.production_days = parseInt(req.body.production_days);
        if (req.body.stock_by_size_color)
            updateData.stock_by_size_color = req.body.stock_by_size_color;
        const result = await database_service_1.DatabaseService.updateProduct(id, updateData);
        res.status(result.success ? 200 : 400).json(result);
    }
    catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update product',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.patch('/:id/archive', auth_middleware_1.authenticateToken, auth_middleware_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await database_service_1.DatabaseService.archiveProduct(id);
        res.status(result.success ? 200 : 404).json(result);
    }
    catch (error) {
        console.error('Error archiving product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to archive product',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.patch('/:id/restore', auth_middleware_1.authenticateToken, auth_middleware_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await database_service_1.DatabaseService.restoreProduct(id);
        res.status(result.success ? 200 : 404).json(result);
    }
    catch (error) {
        console.error('Error restoring product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to restore product',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.delete('/:id', auth_middleware_1.authenticateToken, auth_middleware_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await database_service_1.DatabaseService.deleteProductPermanently(id);
        res.status(result.success ? 200 : 404).json(result);
    }
    catch (error) {
        console.error('Error permanently deleting product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to permanently delete product',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await database_service_1.DatabaseService.getProduct(id);
        res.status(result.success ? 200 : 404).json(result);
    }
    catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=catalog.routes.js.map