"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_service_1 = require("../services/database.service");
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
router.post('/', async (req, res) => {
    try {
        const { product_name, category, base_price, description, image_url, cloudinary_public_id, status, stock_quantity, sku, sizes, tags } = req.body;
        if (!product_name || !category || !base_price || !image_url) {
            return res.status(400).json({
                success: false,
                message: 'Product name, category, base price, and image URL are required'
            });
        }
        const result = await database_service_1.DatabaseService.createProduct({
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
router.put('/:id', async (req, res) => {
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
        if (req.body.image_url)
            updateData.image_url = req.body.image_url;
        if (req.body.cloudinary_public_id)
            updateData.cloudinary_public_id = req.body.cloudinary_public_id;
        if (req.body.status)
            updateData.status = req.body.status;
        if (req.body.stock_quantity !== undefined)
            updateData.stock_quantity = parseInt(req.body.stock_quantity);
        if (req.body.sku !== undefined)
            updateData.sku = req.body.sku;
        if (req.body.sizes)
            updateData.sizes = JSON.stringify(req.body.sizes);
        if (req.body.tags)
            updateData.tags = JSON.stringify(req.body.tags);
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
router.patch('/:id/archive', async (req, res) => {
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
router.patch('/:id/restore', async (req, res) => {
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
router.delete('/:id', async (req, res) => {
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
exports.default = router;
//# sourceMappingURL=catalog.routes.js.map