import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/database';
import { CartItem } from './cart.service';
import { InventoryService } from './inventory.service';
import { EmailService } from './email.service';

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
      // Set transaction isolation level for stronger consistency
      await connection.execute('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
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
      
      // 2. Check stock availability for all items (with row locks)
      for (const item of cartItems) {
        const stockCheck = await InventoryService.deductStock(
          connection,
          item['product_id'],
          item['quantity']
        );
        
        if (!stockCheck.success) {
          await connection.rollback();
          connection.release();
          return { 
            success: false, 
            message: stockCheck.message || 'Insufficient stock for one or more items'
          };
        }
      }
      
      // 3. Calculate total
      const total = cartItems.reduce((sum, item) => 
        sum + (Number(item['unit_price']) * item['quantity']), 0
      );
      
      // 4. Generate order reference
      const orderRef = await this.generateOrderRef();
      
      // 5. Create order with payment_pending status (will be updated to pending after payment)
      const [orderResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO orders 
         (order_ref, customer_id, customer_name, customer_email, customer_phone, customer_address, total_amount, notes, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'payment_pending')`,
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
      
      // 6. Create order items from cart
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
      
      // 7. DO NOT clear cart yet - wait for payment confirmation
      // Cart will be cleared after payment is successful
      
      await connection.commit();
      connection.release();
      
      const createdOrder: Order = {
        order_id: orderId,
        order_ref: orderRef,
        ...orderData,
        total_amount: total,
        status: 'payment_pending'
      };
      
      // Send order confirmation email (async, don't wait)
      EmailService.sendOrderConfirmation(createdOrder).catch(err => {
        console.error('Failed to send order confirmation email:', err);
      });
      
      return {
        success: true,
        message: 'Order created successfully',
        data: createdOrder
      };
    } catch (error) {
      // Rollback transaction - this will automatically restore stock due to transaction rollback
      await connection.rollback();
      connection.release();
      console.error('Error creating order:', error);
      return { success: false, message: 'Failed to create order', error: (error as Error).message };
    }
  }

  // Restore stock when order is cancelled or payment fails
  static async restoreOrderStock(orderId: number): Promise<ApiResponse> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Get order items
      const [items] = await connection.execute<RowDataPacket[]>(
        'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
        [orderId]
      );
      
      // Restore stock for each item
      for (const item of items) {
        await InventoryService.restoreStock(
          connection,
          item['product_id'],
          item['quantity']
        );
      }
      
      await connection.commit();
      connection.release();
      
      return {
        success: true,
        message: 'Stock restored successfully'
      };
    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error('Error restoring order stock:', error);
      return {
        success: false,
        message: 'Failed to restore stock',
        error: (error as Error).message
      };
    }
  }

  // Get order status history
  static async getOrderStatusHistory(orderId: number): Promise<ApiResponse<any[]>> {
    try {
      const connection = await pool.getConnection();
      
      const [rows] = await connection.execute(
        `SELECT 
          osh.id,
          osh.status,
          osh.previous_status,
          osh.changed_at,
          osh.changed_by,
          osh.notes,
          o.order_ref
         FROM order_status_history osh
         JOIN orders o ON osh.order_id = o.order_id
         WHERE osh.order_id = ?
         ORDER BY osh.changed_at ASC`,
        [orderId]
      );
      
      connection.release();
      
      return {
        success: true,
        data: rows as any[]
      };
    } catch (error) {
      console.error('Error getting order status history:', error);
      return {
        success: false,
        message: 'Failed to get order status history',
        error: (error as Error).message
      };
    }
  }

  // Log status change
  static async logStatusChange(
    orderId: number, 
    newStatus: string, 
    previousStatus: string | null = null,
    changedBy: string = 'system',
    notes: string | null = null
  ): Promise<void> {
    try {
      const connection = await pool.getConnection();
      
      await connection.execute(
        `INSERT INTO order_status_history 
         (order_id, status, previous_status, changed_by, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, newStatus, previousStatus, changedBy, notes]
      );
      
      connection.release();
      console.log(`✅ Status change logged: Order ${orderId} ${previousStatus} → ${newStatus}`);
    } catch (error) {
      console.error('Error logging status change:', error);
    }
  }

  // Get orders by specific status (admin only)
  static async getOrdersByStatus(status: string): Promise<ApiResponse<Order[]>> {
    try {
      const connection = await pool.getConnection();
      
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT o.*, p.payment_method, p.payment_status, p.amount as payment_amount, 
                p.payment_proof_url, p.reference_number as payment_reference, p.created_at as payment_created_at
         FROM orders o
         LEFT JOIN payments p ON o.order_id = p.order_id
         WHERE o.status = ?
         ORDER BY o.created_at DESC`,
        [status]
      );
      
      connection.release();
      
      return {
        success: true,
        data: rows as Order[]
      };
    } catch (error) {
      console.error('Error getting orders by status:', error);
      return {
        success: false,
        message: 'Failed to get orders',
        error: (error as Error).message
      };
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
      
      // Get order details for email
      const [orderRows] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM orders WHERE order_id = ?',
        [orderId]
      );
      
      const [result] = await connection.execute<ResultSetHeader>(
        'UPDATE orders SET status = ? WHERE order_id = ?',
        [status, orderId]
      );
      connection.release();
      
      if (result.affectedRows === 0) {
        return { success: false, message: 'Order not found' };
      }
      
      // Send status update email (async, don't wait)
      if (orderRows.length > 0) {
        const order = orderRows[0] as any;
        EmailService.sendOrderStatusUpdate(order, status).catch(err => {
          console.error('Failed to send status update email:', err);
        });
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

  // Reorder - Add items from a previous order back to cart
  static async reorderFromOrder(orderId: number, customerId: number): Promise<ApiResponse> {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // 1. Get the original order details
      const [orderRows] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM orders WHERE order_id = ? AND customer_id = ?',
        [orderId, customerId]
      );
      
      if (orderRows.length === 0) {
        await connection.rollback();
        connection.release();
        return { success: false, message: 'Order not found or access denied' };
      }
      
      const order = orderRows[0];
      
      // 2. Get all items from the original order
      const [orderItemRows] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM order_items WHERE order_id = ?',
        [orderId]
      );
      
      if (orderItemRows.length === 0) {
        await connection.rollback();
        connection.release();
        return { success: false, message: 'No items found in the original order' };
      }
      
      // 3. Clear current cart (optional - you might want to ask user first)
      await connection.execute(
        'DELETE FROM cart_items WHERE customer_id = ?',
        [customerId]
      );
      
      // 4. Add each order item back to the cart
      for (const item of orderItemRows) {
        // Check if product still exists and is available
        const [productRows] = await connection.execute<RowDataPacket[]>(
          'SELECT * FROM catalog_clothing WHERE product_id = ?',
          [item['product_id']]
        );
        
        if (productRows.length === 0) {
          console.warn(`Product ${item['product_id']} no longer exists, skipping...`);
          continue;
        }
        
        const product = productRows[0];
        
        // Add to cart with current product price (prices may have changed)
        await connection.execute(
          `INSERT INTO cart_items 
           (customer_id, product_id, product_name, quantity, size, color, unit_price, customization_data)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            customerId,
            item['product_id'],
            product['product_name'], // Use current product name
            item['quantity'],
            item['size'],
            item['color'],
            product['price'], // Use current price, not old price
            item['customization_data']
          ]
        );
      }
      
      await connection.commit();
      connection.release();
      
      return { 
        success: true, 
        message: `Successfully added ${orderItemRows.length} items from order ${order['order_ref']} to your cart`
      };
      
    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error('Error reordering:', error);
      return { 
        success: false, 
        message: 'Failed to reorder items', 
        error: (error as Error).message 
      };
    }
  }
}
