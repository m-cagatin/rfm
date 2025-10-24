import { pool } from '../config/database';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export interface StockCheck {
  product_id: number;
  product_name: string;
  requested_quantity: number;
  available_quantity: number;
  sufficient: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export class InventoryService {
  /**
   * Check if sufficient stock is available for a product
   */
  static async checkStockAvailability(
    productId: number,
    quantity: number
  ): Promise<StockCheck> {
    try {
      const connection = await pool.getConnection();
      
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT product_id, product_name, stock_quantity FROM catalog_clothing WHERE product_id = ?',
        [productId]
      );
      
      connection.release();
      
      if (rows.length === 0) {
        return {
          product_id: productId,
          product_name: 'Unknown',
          requested_quantity: quantity,
          available_quantity: 0,
          sufficient: false
        };
      }
      
      const product = rows[0];
      const available = product['stock_quantity'];
      
      return {
        product_id: productId,
        product_name: product['product_name'],
        requested_quantity: quantity,
        available_quantity: available,
        sufficient: available >= quantity
      };
    } catch (error) {
      console.error('Error checking stock availability:', error);
      return {
        product_id: productId,
        product_name: 'Unknown',
        requested_quantity: quantity,
        available_quantity: 0,
        sufficient: false
      };
    }
  }

  /**
   * Check stock for multiple products (for cart)
   */
  static async checkMultipleStock(
    items: Array<{ product_id: number; quantity: number }>
  ): Promise<ApiResponse<StockCheck[]>> {
    try {
      const checks: StockCheck[] = [];
      
      for (const item of items) {
        const check = await this.checkStockAvailability(item.product_id, item.quantity);
        checks.push(check);
      }
      
      const allSufficient = checks.every(check => check.sufficient);
      const insufficientItems = checks.filter(check => !check.sufficient);
      
      if (!allSufficient) {
        const itemsList = insufficientItems
          .map(item => `${item.product_name} (requested: ${item.requested_quantity}, available: ${item.available_quantity})`)
          .join(', ');
        
        return {
          success: false,
          message: `Insufficient stock for: ${itemsList}`,
          data: checks
        };
      }
      
      return {
        success: true,
        message: 'All items have sufficient stock',
        data: checks
      };
    } catch (error) {
      console.error('Error checking multiple stock:', error);
      return {
        success: false,
        message: 'Failed to check stock availability',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Deduct stock for a product (within a transaction)
   */
  static async deductStock(
    connection: any,
    productId: number,
    quantity: number
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // Lock the row and check stock
      const [rows] = await connection.execute(
        'SELECT product_id, product_name, stock_quantity FROM catalog_clothing WHERE product_id = ? FOR UPDATE',
        [productId]
      ) as [RowDataPacket[], any];
      
      if (rows.length === 0) {
        return {
          success: false,
          message: `Product ${productId} not found`
        };
      }
      
      const product = rows[0];
      const currentStock = product['stock_quantity'];
      
      if (currentStock < quantity) {
        return {
          success: false,
          message: `Insufficient stock for ${product['product_name']}. Available: ${currentStock}, Requested: ${quantity}`
        };
      }
      
      // Deduct stock
      const [result] = await connection.execute(
        'UPDATE catalog_clothing SET stock_quantity = stock_quantity - ? WHERE product_id = ?',
        [quantity, productId]
      ) as [ResultSetHeader, any];
      
      if (result.affectedRows === 0) {
        return {
          success: false,
          message: 'Failed to deduct stock'
        };
      }
      
      return {
        success: true,
        message: `Stock deducted successfully for ${product['product_name']}`
      };
    } catch (error) {
      console.error('Error deducting stock:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to deduct stock'
      };
    }
  }

  /**
   * Restore stock for a product (rollback)
   */
  static async restoreStock(
    connection: any,
    productId: number,
    quantity: number
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const [result] = await connection.execute(
        'UPDATE catalog_clothing SET stock_quantity = stock_quantity + ? WHERE product_id = ?',
        [quantity, productId]
      ) as [ResultSetHeader, any];
      
      if (result.affectedRows === 0) {
        return {
          success: false,
          message: 'Failed to restore stock'
        };
      }
      
      return {
        success: true,
        message: 'Stock restored successfully'
      };
    } catch (error) {
      console.error('Error restoring stock:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to restore stock'
      };
    }
  }

  /**
   * Get products with low stock
   */
  static async getLowStockProducts(threshold: number = 10): Promise<ApiResponse<any[]>> {
    try {
      const connection = await pool.getConnection();
      
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT product_id, product_name, category, stock_quantity, base_price, status
         FROM catalog_clothing
         WHERE stock_quantity < ? AND status = 'Active'
         ORDER BY stock_quantity ASC`,
        [threshold]
      );
      
      connection.release();
      
      return {
        success: true,
        data: rows.map(row => ({
          ...row,
          base_price: Number(row['base_price'])
        }))
      };
    } catch (error) {
      console.error('Error getting low stock products:', error);
      return {
        success: false,
        message: 'Failed to get low stock products',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get current stock for a product
   */
  static async getProductStock(productId: number): Promise<ApiResponse<number>> {
    try {
      const connection = await pool.getConnection();
      
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT stock_quantity FROM catalog_clothing WHERE product_id = ?',
        [productId]
      );
      
      connection.release();
      
      if (rows.length === 0) {
        return {
          success: false,
          message: 'Product not found'
        };
      }
      
      return {
        success: true,
        data: rows[0]['stock_quantity']
      };
    } catch (error) {
      console.error('Error getting product stock:', error);
      return {
        success: false,
        message: 'Failed to get product stock',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

