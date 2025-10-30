"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../config/database");
const router = express_1.default.Router();
router.post('/', async (req, res) => {
    try {
        const { name, category, brand, gender, fit_type, description, front_image_url, back_image_url, additional_image_urls, fabric_composition, fabric_weight, texture, available_sizes, size_chart_url, fit_description, size_pricing, available_colors, variants, print_method, print_areas, design_requirements, retail_price, is_active, turnaround_time, minimum_order_qty } = req.body;
        if (!name || !category || !front_image_url || !back_image_url) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: name, category, front_image_url, back_image_url'
            });
        }
        const query = `
      INSERT INTO customizable_products (
        name, category, gender, fit_type, description,
        front_image_url, back_image_url, additional_image_urls,
        fabric_composition, fabric_weight, texture,
        available_sizes, size_chart_url, fit_description, size_pricing,
        available_colors,
        print_method, print_areas, design_requirements,
        base_cost, retail_price, is_active,
        turnaround_time, minimum_order_qty
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
        const values = [
            name, category, gender || 'Unisex', fit_type || 'Classic', description || null,
            front_image_url, back_image_url, JSON.stringify(additional_image_urls || []),
            fabric_composition || null, fabric_weight || null, texture || null,
            JSON.stringify(available_sizes || []), size_chart_url || null, fit_description || null,
            JSON.stringify(size_pricing || {}),
            JSON.stringify(available_colors || []),
            print_method || 'DTG', JSON.stringify(print_areas || []), design_requirements || null,
            0, retail_price || 0, is_active !== undefined ? is_active : true,
            turnaround_time || '3-5 days', minimum_order_qty || 1
        ];
        const [result] = await database_1.pool.execute(query, values);
        if (variants && variants.length > 0) {
            const variantQuery = `
        INSERT INTO texture_variants (product_id, name, image_url)
        VALUES (?, ?, ?)
      `;
            for (const variant of variants) {
                await database_1.pool.execute(variantQuery, [result.insertId, variant.name, variant.image_url || null]);
            }
        }
        res.status(201).json({
            success: true,
            message: 'Customizable product created successfully',
            data: { id: result.insertId }
        });
    }
    catch (error) {
        console.error('Error creating customizable product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create customizable product',
            error: error.message
        });
    }
});
router.get('/', async (req, res) => {
    try {
        const query = `
      SELECT * FROM customizable_products
      ORDER BY created_at DESC
    `;
        const [rows] = await database_1.pool.execute(query);
        res.json({
            success: true,
            data: rows
        });
    }
    catch (error) {
        console.error('Error fetching customizable products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch customizable products',
            error: error.message
        });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const productQuery = `
      SELECT * FROM customizable_products WHERE id = ?
    `;
        const [productRows] = await database_1.pool.execute(productQuery, [id]);
        if (productRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        const variantsQuery = `
      SELECT * FROM texture_variants WHERE product_id = ?
    `;
        const [variants] = await database_1.pool.execute(variantsQuery, [id]);
        const product = {
            ...productRows[0],
            variants
        };
        res.json({
            success: true,
            data: product
        });
    }
    catch (error) {
        console.error('Error fetching customizable product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch customizable product',
            error: error.message
        });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const query = `
      UPDATE customizable_products SET
        name = ?, category = ?, gender = ?, fit_type = ?, description = ?,
        front_image_url = ?, back_image_url = ?, additional_image_urls = ?,
        fabric_composition = ?, fabric_weight = ?, texture = ?,
        available_sizes = ?, size_chart_url = ?, fit_description = ?, size_pricing = ?,
        available_colors = ?,
        print_method = ?, print_areas = ?, design_requirements = ?,
        base_cost = ?, retail_price = ?, is_active = ?,
        turnaround_time = ?, minimum_order_qty = ?
      WHERE id = ?
    `;
        const values = [
            updateData.name, updateData.category, updateData.gender,
            updateData.fit_type, updateData.description,
            updateData.front_image_url, updateData.back_image_url,
            JSON.stringify(updateData.additional_image_urls || []),
            updateData.fabric_composition, updateData.fabric_weight, updateData.texture,
            JSON.stringify(updateData.available_sizes || []), updateData.size_chart_url,
            updateData.fit_description, JSON.stringify(updateData.size_pricing || {}),
            JSON.stringify(updateData.available_colors || []),
            updateData.print_method, JSON.stringify(updateData.print_areas || []),
            updateData.design_requirements,
            updateData.base_cost, updateData.retail_price, updateData.is_active,
            updateData.turnaround_time, updateData.minimum_order_qty,
            id
        ];
        await database_1.pool.execute(query, values);
        res.json({
            success: true,
            message: 'Product updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating customizable product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update customizable product',
            error: error.message
        });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const query = `DELETE FROM customizable_products WHERE id = ?`;
        await database_1.pool.execute(query, [id]);
        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting customizable product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete customizable product',
            error: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=customizable-products.routes.js.map