import express, { Request, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../config/database';

const router = express.Router();

// Create customizable product
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name, category, brand, gender, fit_type, description,
      front_image_url, back_image_url, additional_image_urls,
      fabric_composition, fabric_weight, texture,
      available_sizes, size_chart_url, fit_description, size_pricing,
      available_colors, variants,
      print_method, print_areas, design_requirements,
      retail_price, is_active,
      turnaround_time, minimum_order_qty
    } = req.body;

    // Validate required fields
    if (!name || !category || !front_image_url || !back_image_url) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, category, front_image_url, back_image_url'
      });
    }

    const query = `
      INSERT INTO customizable_products (
        name, category, brand, gender, fit_type, description,
        front_image_url, back_image_url, additional_image_urls,
        fabric_composition, fabric_weight, texture,
        available_sizes, size_chart_url, fit_description, size_pricing,
        available_colors,
        print_method, print_areas, design_requirements,
        base_cost, retail_price, is_active,
        turnaround_time, minimum_order_qty
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      name, category, brand || null, gender || 'Unisex', fit_type || 'Classic', description || null,
      front_image_url, back_image_url, JSON.stringify(additional_image_urls || []),
      fabric_composition || null, fabric_weight || null, texture || null,
      JSON.stringify(available_sizes || []), size_chart_url || null, fit_description || null, 
      JSON.stringify(size_pricing || {}),
      JSON.stringify(available_colors || []),
      print_method || 'DTG', JSON.stringify(print_areas || []), design_requirements || null,
      0, retail_price || 0, is_active !== undefined ? is_active : true,
      turnaround_time || '3-5 days', minimum_order_qty || 1
    ];

    const [result] = await pool.execute<ResultSetHeader>(query, values);

    // Save variants if provided
    if (variants && variants.length > 0) {
      const variantQuery = `
        INSERT INTO texture_variants (product_id, name, image_url)
        VALUES (?, ?, ?)
      `;
      
      for (const variant of variants) {
        await pool.execute(variantQuery, [result.insertId, variant.name, variant.image_url || null]);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Customizable product created successfully',
      data: { id: result.insertId }
    });

  } catch (error: any) {
    console.error('Error creating customizable product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create customizable product',
      error: error.message
    });
  }
});

// Get all customizable products
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT * FROM customizable_products
      ORDER BY created_at DESC
    `;

    const [rows] = await pool.execute<RowDataPacket[]>(query);

    res.json({
      success: true,
      data: rows
    });

  } catch (error: any) {
    console.error('Error fetching customizable products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customizable products',
      error: error.message
    });
  }
});

// Get single customizable product by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const productQuery = `
      SELECT * FROM customizable_products WHERE id = ?
    `;
    const [productRows] = await pool.execute<RowDataPacket[]>(productQuery, [id]);

    if (productRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get variants
    const variantsQuery = `
      SELECT * FROM texture_variants WHERE product_id = ?
    `;
    const [variants] = await pool.execute<RowDataPacket[]>(variantsQuery, [id]);

    const product = {
      ...productRows[0],
      variants
    };

    res.json({
      success: true,
      data: product
    });

  } catch (error: any) {
    console.error('Error fetching customizable product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customizable product',
      error: error.message
    });
  }
});

// Update customizable product
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const query = `
      UPDATE customizable_products SET
        name = ?, category = ?, brand = ?, gender = ?, fit_type = ?, description = ?,
        front_image_url = ?, back_image_url = ?, additional_image_urls = ?,
        fabric_composition = ?, fabric_weight = ?, texture = ?,
        available_sizes = ?, size_chart_url = ?, fit_description = ?,
        available_colors = ?,
        print_method = ?, print_areas = ?, design_requirements = ?,
        base_cost = ?, retail_price = ?, is_active = ?,
        turnaround_time = ?, minimum_order_qty = ?
      WHERE id = ?
    `;

    const values = [
      updateData.name, updateData.category, updateData.brand, updateData.gender, 
      updateData.fit_type, updateData.description,
      updateData.front_image_url, updateData.back_image_url, 
      JSON.stringify(updateData.additional_image_urls || []),
      updateData.fabric_composition, updateData.fabric_weight, updateData.texture,
      JSON.stringify(updateData.available_sizes || []), updateData.size_chart_url, 
      updateData.fit_description,
      JSON.stringify(updateData.available_colors || []),
      updateData.print_method, JSON.stringify(updateData.print_areas || []), 
      updateData.design_requirements,
      updateData.base_cost, updateData.retail_price, updateData.is_active,
      updateData.turnaround_time, updateData.minimum_order_qty,
      id
    ];

    await pool.execute(query, values);

    res.json({
      success: true,
      message: 'Product updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating customizable product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update customizable product',
      error: error.message
    });
  }
});

// Delete customizable product
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Variants will be deleted automatically due to CASCADE
    const query = `DELETE FROM customizable_products WHERE id = ?`;
    await pool.execute(query, [id]);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting customizable product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete customizable product',
      error: error.message
    });
  }
});

export default router;
