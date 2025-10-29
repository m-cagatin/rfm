import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/database';

export interface CartItem {
  cart_item_id?: number;
  customer_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  size?: string;
  color?: string;
  unit_price: number;
  customization_data?: any;
  created_at?: string;
  updated_at?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export class CartService {
  // Get all cart items for a customer
  static async getCart(customerId: number): Promise<ApiResponse<CartItem[]>> {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM cart_items WHERE customer_id = ? ORDER BY created_at DESC',
        [customerId]
      );
      connection.release();
      
      const items = (rows as any[]).map(row => ({
        ...row,
        unit_price: Number(row.unit_price)
      }));
      
      return { success: true, data: items };
    } catch (error) {
      console.error('Error getting cart:', error);
      return { success: false, message: 'Failed to get cart', error: (error as Error).message };
    }
  }

  // Add item to cart (or update if exists)
  static async addToCart(cartItem: Omit<CartItem, 'cart_item_id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<CartItem>> {
    try {
      const connection = await pool.getConnection();
      
      // Check if item already exists (same product, size, color)
      const [existing] = await connection.execute<RowDataPacket[]>(
        `SELECT * FROM cart_items 
         WHERE customer_id = ? AND product_id = ? AND size = ? AND color = ?`,
        [cartItem.customer_id, cartItem.product_id, cartItem.size || null, cartItem.color || null]
      );
      
      if (existing.length > 0) {
        // Update quantity
        const newQty = existing[0]['quantity'] + cartItem.quantity;
        await connection.execute(
          'UPDATE cart_items SET quantity = ? WHERE cart_item_id = ?',
          [newQty, existing[0]['cart_item_id']]
        );
        connection.release();
        return { success: true, message: 'Cart updated', data: { ...existing[0], quantity: newQty } as CartItem };
      } else {
        // Insert new item
        const [result] = await connection.execute<ResultSetHeader>(
          `INSERT INTO cart_items 
           (customer_id, product_id, product_name, quantity, size, color, unit_price, customization_data) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            cartItem.customer_id,
            cartItem.product_id,
            cartItem.product_name,
            cartItem.quantity,
            cartItem.size || null,
            cartItem.color || null,
            cartItem.unit_price,
            cartItem.customization_data ? JSON.stringify(cartItem.customization_data) : null
          ]
        );
        connection.release();
        return { success: true, message: 'Item added to cart', data: { cart_item_id: result.insertId, ...cartItem } };
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      return { success: false, message: 'Failed to add to cart', error: (error as Error).message };
    }
  }

  // Update cart item quantity
  static async updateQuantity(cartItemId: number, quantity: number, customerId: number): Promise<ApiResponse> {
    try {
      const connection = await pool.getConnection();
      const [result] = await connection.execute<ResultSetHeader>(
        'UPDATE cart_items SET quantity = ? WHERE cart_item_id = ? AND customer_id = ?',
        [quantity, cartItemId, customerId]
      );
      connection.release();
      
      if (result.affectedRows === 0) {
        return { success: false, message: 'Cart item not found' };
      }
      
      return { success: true, message: 'Quantity updated' };
    } catch (error) {
      console.error('Error updating quantity:', error);
      return { success: false, message: 'Failed to update quantity', error: (error as Error).message };
    }
  }

  // Remove item from cart
  static async removeFromCart(cartItemId: number, customerId: number): Promise<ApiResponse> {
    try {
      const connection = await pool.getConnection();
      const [result] = await connection.execute<ResultSetHeader>(
        'DELETE FROM cart_items WHERE cart_item_id = ? AND customer_id = ?',
        [cartItemId, customerId]
      );
      connection.release();
      
      if (result.affectedRows === 0) {
        return { success: false, message: 'Cart item not found' };
      }
      
      return { success: true, message: 'Item removed from cart' };
    } catch (error) {
      console.error('Error removing from cart:', error);
      return { success: false, message: 'Failed to remove item', error: (error as Error).message };
    }
  }

  // Clear entire cart
  static async clearCart(customerId: number): Promise<ApiResponse> {
    try {
      const connection = await pool.getConnection();
      await connection.execute('DELETE FROM cart_items WHERE customer_id = ?', [customerId]);
      connection.release();
      
      return { success: true, message: 'Cart cleared' };
    } catch (error) {
      console.error('Error clearing cart:', error);
      return { success: false, message: 'Failed to clear cart', error: (error as Error).message };
    }
  }

  // Merge guest cart (from localStorage)
  static async mergeGuestCart(customerId: number, guestItems: Omit<CartItem, 'customer_id' | 'cart_item_id'>[]): Promise<ApiResponse> {
    try {
      for (const item of guestItems) {
        await this.addToCart({
          customer_id: customerId,
          ...item
        });
      }
      
      return { success: true, message: 'Guest cart merged successfully' };
    } catch (error) {
      console.error('Error merging guest cart:', error);
      return { success: false, message: 'Failed to merge cart', error: (error as Error).message };
    }
  }
}
