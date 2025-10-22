"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderService = void 0;
const database_1 = require("../config/database");
class OrderService {
    static async generateOrderRef() {
        try {
            const connection = await database_1.pool.getConnection();
            const [rows] = await connection.execute('SELECT order_ref FROM orders ORDER BY order_id DESC LIMIT 1');
            connection.release();
            if (rows.length === 0) {
                return 'ORD-001';
            }
            const lastRef = rows[0]['order_ref'];
            const num = parseInt(lastRef.split('-')[1]) + 1;
            return `ORD-${num.toString().padStart(3, '0')}`;
        }
        catch (error) {
            console.error('Error generating order ref:', error);
            return `ORD-${Date.now()}`;
        }
    }
    static async createOrder(orderData) {
        const connection = await database_1.pool.getConnection();
        try {
            await connection.beginTransaction();
            const [cartItems] = await connection.execute('SELECT * FROM cart_items WHERE customer_id = ?', [orderData.customer_id]);
            if (cartItems.length === 0) {
                await connection.rollback();
                connection.release();
                return { success: false, message: 'Cart is empty' };
            }
            const total = cartItems.reduce((sum, item) => sum + (Number(item['unit_price']) * item['quantity']), 0);
            const orderRef = await this.generateOrderRef();
            const [orderResult] = await connection.execute(`INSERT INTO orders 
         (order_ref, customer_id, customer_name, customer_email, customer_phone, customer_address, total_amount, notes, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`, [
                orderRef,
                orderData.customer_id,
                orderData.customer_name,
                orderData.customer_email,
                orderData.customer_phone || null,
                orderData.customer_address || null,
                total,
                orderData.notes || null
            ]);
            const orderId = orderResult.insertId;
            for (const item of cartItems) {
                const subtotal = Number(item['unit_price']) * item['quantity'];
                await connection.execute(`INSERT INTO order_items 
           (order_id, product_id, product_name, quantity, size, color, unit_price, subtotal, customization_data) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                    orderId,
                    item['product_id'],
                    item['product_name'],
                    item['quantity'],
                    item['size'] || null,
                    item['color'] || null,
                    item['unit_price'],
                    subtotal,
                    item['customization_data'] || null
                ]);
            }
            await connection.execute('DELETE FROM cart_items WHERE customer_id = ?', [orderData.customer_id]);
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
        }
        catch (error) {
            await connection.rollback();
            connection.release();
            console.error('Error creating order:', error);
            return { success: false, message: 'Failed to create order', error: error.message };
        }
    }
    static async getOrders(filters) {
        try {
            const connection = await database_1.pool.getConnection();
            let query = 'SELECT * FROM orders WHERE 1=1';
            const params = [];
            if (filters?.status) {
                query += ' AND status = ?';
                params.push(filters.status);
            }
            if (filters?.customerId) {
                query += ' AND customer_id = ?';
                params.push(filters.customerId);
            }
            query += ' ORDER BY order_date DESC';
            const [rows] = await connection.execute(query, params);
            connection.release();
            const orders = rows.map(row => ({
                ...row,
                total_amount: Number(row.total_amount)
            }));
            return { success: true, data: orders };
        }
        catch (error) {
            console.error('Error getting orders:', error);
            return { success: false, message: 'Failed to get orders', error: error.message };
        }
    }
    static async getOrder(orderId) {
        try {
            const connection = await database_1.pool.getConnection();
            const [orderRows] = await connection.execute('SELECT * FROM orders WHERE order_id = ?', [orderId]);
            if (orderRows.length === 0) {
                connection.release();
                return { success: false, message: 'Order not found' };
            }
            const order = orderRows[0];
            const [itemRows] = await connection.execute('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
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
        }
        catch (error) {
            console.error('Error getting order:', error);
            return { success: false, message: 'Failed to get order', error: error.message };
        }
    }
    static async getCustomerOrders(customerId) {
        return this.getOrders({ customerId });
    }
    static async updateOrderStatus(orderId, status) {
        try {
            const connection = await database_1.pool.getConnection();
            const [result] = await connection.execute('UPDATE orders SET status = ? WHERE order_id = ?', [status, orderId]);
            connection.release();
            if (result.affectedRows === 0) {
                return { success: false, message: 'Order not found' };
            }
            return { success: true, message: 'Order status updated' };
        }
        catch (error) {
            console.error('Error updating order status:', error);
            return { success: false, message: 'Failed to update status', error: error.message };
        }
    }
    static async cancelOrder(orderId) {
        return this.updateOrderStatus(orderId, 'cancelled');
    }
}
exports.OrderService = OrderService;
//# sourceMappingURL=order.service.js.map