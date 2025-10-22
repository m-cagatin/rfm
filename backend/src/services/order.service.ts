import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/database';
import { CartItem } from './cart.service';

export interface Order {
  order_id?: number;
  order_ref: string;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  customer_address?: string;
  total_amount: number;
  status?: string;
  order_date?: string;
  estimated_completion?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OrderItem {
  item_id?: number;
  order_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  size?: string;
  color?: string;
  unit_price: number;
  subtotal: number;
  customization_data?: any;
  created_at?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export class OrderService {
  // Generate unique order reference
  static async generateOrderRef(): Promise<string> {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT order_ref FROM orders ORDER BY order_id DESC LIMIT 1'
      );
      connection.release();
      
      if (rows.length === 0) {
        return 'ORD-001';
      }
      
      const lastRef = rows[0]['order_ref'];
      const num = parseInt(lastRef.split('-')[1]) + 1;
      return `ORD-${num.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating order ref:', error);
      return `ORD-${Date.now()}`;
    }
  }

  // Create order from cart
  static async createOrder(orderData: {
    customer_id: number;
    customer_name: string;
    customer_email: string;
    customer_phone?: string;
    customer_address?: string;
    notes?: string;
  }): Promise<ApiResponse<Order>> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // 1. Get cart items
      const [cartItems] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM cart_items WHERE customer_id = ?',
        [orderData.customer_id]
      );
      
      if (cartItems.length === 0) {
        await connection.rollback();
        connection.release();
        return { success: false, message: 'Cart is empty' };
      }
      
      // 2. Calculate total
      const total = cartItems.reduce((sum, item) => 
        sum + (Number(item['unit_price']) * item['quantity']), 0
      );
      
      // 3. Generate order reference
      const orderRef = await this.generateOrderRef();
      
      // 4. Create order
      const [orderResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO orders 
         (order_ref, customer_id, customer_name, customer_email, customer_phone, customer_address, total_amount, notes, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          orderRef,
          orderData.customer_id,
          orderData.customer_name,
          orderData.customer_email,
          orderData.customer_phone || null,
          orderData.customer_address || null,
          total,
          orderData.notes || null
        ]
      );
      
      const orderId = orderResult.insertId;
      
      // 5. Create order items from cart
      for (const item of cartItems) {
        const subtotal = Number(item['unit_price']) * item['quantity'];
        await connection.execute(
          `INSERT INTO order_items 
           (order_id, product_id, product_name, quantity, size, color, unit_price, subtotal, customization_data) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            item['product_id'],
            item['product_name'],
            item['quantity'],
            item['size'] || null,
            item['color'] || null,
            item['unit_price'],
            subtotal,
            item['customization_data'] || null
          ]
        );
      }
      
      // 6. Clear cart
      await connection.execute(
        'DELETE FROM cart_items WHERE customer_id = ?',
        [orderData.customer_id]
      );
      
      await connection.commit();
      connection.release();
      
      return {
        success: true,
        message: 'Order created successfully',
        data: {
          order_id: orderId,
          order_ref: orderRef,
          ...orderData,
          total_amount: total,
          status: 'pending'
        }
      };
    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error('Error creating order:', error);
      return { success: false, message: 'Failed to create order', error: (error as Error).message };
    }
  }

  // Get all orders (admin)
  static async getOrders(filters?: { status?: string; customerId?: number }): Promise<ApiResponse<Order[]>> {
    try {
      const connection = await pool.getConnection();
      let query = 'SELECT * FROM orders WHERE 1=1';
      const params: any[] = [];
      
      if (filters?.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }
      
      if (filters?.customerId) {
        query += ' AND customer_id = ?';
        params.push(filters.customerId);
      }
      
      query += ' ORDER BY order_date DESC';
      
      const [rows] = await connection.execute<RowDataPacket[]>(query, params);
      connection.release();
      
      const orders = (rows as any[]).map(row => ({
        ...row,
        total_amount: Number(row.total_amount)
      }));
      
      return { success: true, data: orders };
    } catch (error) {
      console.error('Error getting orders:', error);
      return { success: false, message: 'Failed to get orders', error: (error as Error).message };
    }
  }

  // Get single order with items
  static async getOrder(orderId: number): Promise<ApiResponse<any>> {
    try {
      const connection = await pool.getConnection();
      
      // Get order
      const [orderRows] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM orders WHERE order_id = ?',
        [orderId]
      );
      
      if (orderRows.length === 0) {
        connection.release();
        return { success: false, message: 'Order not found' };
      }
      
      const order = orderRows[0];
      
      // Get order items
      const [itemRows] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM order_items WHERE order_id = ?',
        [orderId]
      );
      
      connection.release();
      
      return {
        success: true,
        data: {
          ...order,
          total_amount: Number(order['total_amount']),
          items: itemRows.map(item => ({
            ...item,
            unit_price: Number(item['unit_price']),
            subtotal: Number(item['subtotal'])
          }))
        }
      };
    } catch (error) {
      console.error('Error getting order:', error);
      return { success: false, message: 'Failed to get order', error: (error as Error).message };
    }
  }

  // Get customer orders
  static async getCustomerOrders(customerId: number): Promise<ApiResponse<Order[]>> {
    return this.getOrders({ customerId });
  }

  // Update order status (for Kanban drag & drop)
  static async updateOrderStatus(orderId: number, status: string): Promise<ApiResponse> {
    try {
      const connection = await pool.getConnection();
      const [result] = await connection.execute<ResultSetHeader>(
        'UPDATE orders SET status = ? WHERE order_id = ?',
        [status, orderId]
      );
      connection.release();
      
      if (result.affectedRows === 0) {
        return { success: false, message: 'Order not found' };
      }
      
      return { success: true, message: 'Order status updated' };
    } catch (error) {
      console.error('Error updating order status:', error);
      return { success: false, message: 'Failed to update status', error: (error as Error).message };
    }
  }

  // Cancel order
  static async cancelOrder(orderId: number): Promise<ApiResponse> {
    return this.updateOrderStatus(orderId, 'cancelled');
  }
}
