"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../config/database");
const router = express_1.default.Router();
router.post('/', async (req, res) => {
    let connection;
    try {
        connection = await database_1.pool.getConnection();
        const { name, category, gender, fit_type, description, images, fabric_composition, fabric_weight, texture, available_sizes, fit_description, size_pricing, color_name, color_hex, variant_name, variant_image_url, variant_image_public_id, print_method, print_areas, design_requirements, base_cost, retail_price, is_active, turnaround_time, minimum_order_qty } = req.body;
        console.log('📥 POST /customizable-products:', { name, category, images: images?.length });
        const errors = {};
        if (!name)
            errors.name = 'Product name is required';
        if (!category)
            errors.category = 'Product category is required';
        if (!images || !Array.isArray(images) || images.length < 2) {
            errors.images = 'At least 2 images required (front and back)';
        }
        else {
            const hasFront = images.some((img) => img.imageType === 'front');
            const hasBack = images.some((img) => img.imageType === 'back');
            if (!hasFront)
                errors.images_front = 'Front image is required';
            if (!hasBack)
                errors.images_back = 'Back image is required';
        }
        if (Object.keys(errors).length > 0) {
            if (connection)
                connection.release();
            return res.status(400).json({
                success: false,
                errors
            });
        }
        await connection.beginTransaction();
        const [maxCode] = await connection.execute("SELECT MAX(CAST(SUBSTRING(product_code, 3) AS UNSIGNED)) as max_num FROM customizable_products WHERE product_code LIKE 'CP%'");
        const nextNum = (maxCode[0]?.max_num || 0) + 1;
        const product_code = `CP${String(nextNum).padStart(6, '0')}`;
        const productQuery = `
      INSERT INTO customizable_products (
        product_code, name, category, gender, fit_type, description,
        fabric_composition, fabric_weight, texture,
        available_sizes, fit_description, size_pricing,
        color_name, color_hex,
        variant_name, variant_image_url, variant_image_public_id,
        print_method, print_areas, design_requirements,
        base_cost, retail_price, is_active,
        turnaround_time, minimum_order_qty
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
        const productValues = [
            product_code, name, category,
            gender || 'Unisex', fit_type || 'Classic', description || null,
            fabric_composition || null, fabric_weight || null, texture || null,
            JSON.stringify(available_sizes || []),
            fit_description || null, JSON.stringify(size_pricing || {}),
            color_name || null, color_hex || null,
            variant_name || null, variant_image_url || null, variant_image_public_id || null,
            print_method || 'DTG', JSON.stringify(print_areas || []),
            design_requirements || null,
            base_cost || 0, retail_price || 0,
            is_active !== undefined ? (is_active ? 1 : 0) : 1,
            turnaround_time || null, minimum_order_qty || 1
        ];
        const [result] = await connection.execute(productQuery, productValues);
        const productId = result.insertId;
        console.log('✅ Product created:', productId);
        const imageQuery = `
      INSERT INTO customizable_product_images 
      (product_id, image_url, cloudinary_public_id, image_type, display_order)
      VALUES (?, ?, ?, ?, ?)
    `;
        for (const img of images) {
            await connection.execute(imageQuery, [
                productId, img.url, img.publicId || null,
                img.imageType, img.displayOrder || 1
            ]);
        }
        console.log(`✅ Inserted ${images.length} images`);
        await connection.commit();
        connection.release();
        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: { id: productId, product_code }
        });
    }
    catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            }
            catch (e) { }
            connection.release();
        }
        console.error('❌ Error creating product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create product',
            error: error.message
        });
    }
});
router.get('/', async (req, res) => {
    let connection;
    try {
        connection = await database_1.pool.getConnection();
        const query = `
      SELECT 
        p.*,
        GROUP_CONCAT(
          JSON_OBJECT(
            'image_id', i.image_id,
            'url', i.image_url,
            'publicId', i.cloudinary_public_id,
            'image_type', i.image_type,
            'displayOrder', i.display_order
          )
          ORDER BY i.display_order, i.image_id
        ) as images
      FROM customizable_products p
      LEFT JOIN customizable_product_images i ON p.id = i.product_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;
        const [rows] = await connection.execute(query);
        connection.release();
        const products = rows.map((row) => {
            let images = [];
            if (row.images) {
                try {
                    images = JSON.parse(`[${row.images}]`);
                }
                catch (error) {
                    console.error('Error parsing images for product:', row.id);
                    images = [];
                }
            }
            return {
                id: row.id,
                product_code: row.product_code,
                name: row.name,
                category: row.category,
                gender: row.gender,
                fit_type: row.fit_type,
                description: row.description,
                is_active: Boolean(row.is_active),
                fabric_composition: row.fabric_composition,
                fabric_weight: row.fabric_weight,
                texture: row.texture,
                available_sizes: row.available_sizes,
                fit_description: row.fit_description,
                size_pricing: row.size_pricing,
                color_name: row.color_name,
                color_hex: row.color_hex,
                variant_name: row.variant_name,
                variant_image_url: row.variant_image_url,
                variant_image_public_id: row.variant_image_public_id,
                print_method: row.print_method,
                print_areas: row.print_areas,
                design_requirements: row.design_requirements,
                base_cost: parseFloat(row.base_cost || 0),
                retail_price: parseFloat(row.retail_price || 0),
                turnaround_time: row.turnaround_time,
                minimum_order_qty: row.minimum_order_qty,
                created_at: row.created_at,
                updated_at: row.updated_at,
                images: images
            };
        });
        res.json({
            success: true,
            data: products
        });
    }
    catch (error) {
        if (connection)
            connection.release();
        console.error('❌ Error fetching products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products',
            error: error.message
        });
    }
});
router.get('/:id', async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        connection = await database_1.pool.getConnection();
        const query = `
      SELECT 
        p.*,
        GROUP_CONCAT(
          JSON_OBJECT(
            'image_id', i.image_id,
            'url', i.image_url,
            'publicId', i.cloudinary_public_id,
            'image_type', i.image_type,
            'displayOrder', i.display_order
          )
          ORDER BY i.display_order, i.image_id
        ) as images
      FROM customizable_products p
      LEFT JOIN customizable_product_images i ON p.id = i.product_id
      WHERE p.id = ?
      GROUP BY p.id
    `;
        const [rows] = await connection.execute(query, [id]);
        if (rows.length === 0) {
            connection.release();
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        const row = rows[0];
        let images = [];
        if (row.images) {
            try {
                images = JSON.parse(`[${row.images}]`);
            }
            catch (error) {
                console.error('Error parsing images');
                images = [];
            }
        }
        connection.release();
        const product = {
            id: row.id,
            product_code: row.product_code,
            name: row.name,
            category: row.category,
            gender: row.gender,
            fit_type: row.fit_type,
            description: row.description,
            is_active: Boolean(row.is_active),
            fabric_composition: row.fabric_composition,
            fabric_weight: row.fabric_weight,
            texture: row.texture,
            available_sizes: row.available_sizes,
            fit_description: row.fit_description,
            size_pricing: row.size_pricing,
            color_name: row.color_name,
            color_hex: row.color_hex,
            variant_name: row.variant_name,
            variant_image_url: row.variant_image_url,
            variant_image_public_id: row.variant_image_public_id,
            print_method: row.print_method,
            print_areas: row.print_areas,
            design_requirements: row.design_requirements,
            base_cost: parseFloat(row.base_cost || 0),
            retail_price: parseFloat(row.retail_price || 0),
            turnaround_time: row.turnaround_time,
            minimum_order_qty: row.minimum_order_qty,
            created_at: row.created_at,
            updated_at: row.updated_at,
            images: images
        };
        res.json({
            success: true,
            data: product
        });
    }
    catch (error) {
        if (connection)
            connection.release();
        console.error('❌ Error fetching product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product',
            error: error.message
        });
    }
});
router.put('/:id', async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        connection = await database_1.pool.getConnection();
        const { name, category, gender, fit_type, description, images, fabric_composition, fabric_weight, texture, available_sizes, fit_description, size_pricing, color_name, color_hex, variant_name, variant_image_url, variant_image_public_id, print_method, print_areas, design_requirements, base_cost, retail_price, is_active, turnaround_time, minimum_order_qty } = req.body;
        console.log('📝 PUT /customizable-products/:id', id);
        const errors = {};
        if (!name)
            errors.name = 'Product name is required';
        if (!category)
            errors.category = 'Product category is required';
        if (!images || !Array.isArray(images) || images.length < 2) {
            errors.images = 'At least 2 images required (front and back)';
        }
        else {
            const hasFront = images.some((img) => img.imageType === 'front');
            const hasBack = images.some((img) => img.imageType === 'back');
            if (!hasFront)
                errors.images_front = 'Front image is required';
            if (!hasBack)
                errors.images_back = 'Back image is required';
        }
        if (Object.keys(errors).length > 0) {
            if (connection)
                connection.release();
            return res.status(400).json({
                success: false,
                errors
            });
        }
        await connection.beginTransaction();
        const updateQuery = `
      UPDATE customizable_products SET
        name = ?, category = ?, gender = ?, fit_type = ?, description = ?,
        fabric_composition = ?, fabric_weight = ?, texture = ?,
        available_sizes = ?, fit_description = ?, size_pricing = ?,
        color_name = ?, color_hex = ?,
        variant_name = ?, variant_image_url = ?, variant_image_public_id = ?,
        print_method = ?, print_areas = ?, design_requirements = ?,
        base_cost = ?, retail_price = ?, is_active = ?,
        turnaround_time = ?, minimum_order_qty = ?
      WHERE id = ?
    `;
        await connection.execute(updateQuery, [
            name, category, gender, fit_type, description,
            fabric_composition, fabric_weight, texture,
            JSON.stringify(available_sizes || []),
            fit_description, JSON.stringify(size_pricing || {}),
            color_name || null, color_hex || null,
            variant_name || null, variant_image_url || null, variant_image_public_id || null,
            print_method,
            JSON.stringify(print_areas || []), design_requirements,
            base_cost, retail_price,
            is_active !== undefined ? (is_active ? 1 : 0) : 1,
            turnaround_time, minimum_order_qty, id
        ]);
        if (images && Array.isArray(images)) {
            await connection.execute('DELETE FROM customizable_product_images WHERE product_id = ?', [id]);
            if (images.length > 0) {
                const imageQuery = `
          INSERT INTO customizable_product_images 
          (product_id, image_url, cloudinary_public_id, image_type, display_order)
          VALUES (?, ?, ?, ?, ?)
        `;
                for (const img of images) {
                    await connection.execute(imageQuery, [
                        id, img.url, img.publicId || null,
                        img.imageType, img.displayOrder || 1
                    ]);
                }
            }
        }
        await connection.commit();
        connection.release();
        console.log('✅ Product updated:', id);
        res.json({
            success: true,
            message: 'Product updated successfully'
        });
    }
    catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            }
            catch (e) { }
            connection.release();
        }
        console.error('❌ Error updating product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update product',
            error: error.message
        });
    }
});
router.delete('/:id', async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        connection = await database_1.pool.getConnection();
        const [result] = await connection.execute('DELETE FROM customizable_products WHERE id = ?', [id]);
        connection.release();
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        console.log('✅ Product deleted:', id);
        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    }
    catch (error) {
        if (connection)
            connection.release();
        console.error('❌ Error deleting product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete product',
            error: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=customizable-products.routes.js.map