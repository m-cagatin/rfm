"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderService = void 0;
const database_1 = require("../config/database");
const inventory_service_1 = require("./inventory.service");
const email_service_1 = require("./email.service");
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
            await connection.execute('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
            await connection.beginTransaction();
            const [cartItems] = await connection.execute('SELECT * FROM cart_items WHERE customer_id = ?', [orderData.customer_id]);
            if (cartItems.length === 0) {
                await connection.rollback();
                connection.release();
                return { success: false, message: 'Cart is empty' };
            }
            for (const item of cartItems) {
                const stockCheck = await inventory_service_1.InventoryService.deductStock(connection, item['product_id'], item['quantity']);
                if (!stockCheck.success) {
                    await connection.rollback();
                    connection.release();
                    return {
                        success: false,
                        message: stockCheck.message || 'Insufficient stock for one or more items'
                    };
                }
            }
            const total = cartItems.reduce((sum, item) => sum + (Number(item['unit_price']) * item['quantity']), 0);
            const orderRef = await this.generateOrderRef();
            const [orderResult] = await connection.execute(`INSERT INTO orders 
         (order_ref, customer_id, customer_name, customer_email, customer_phone, customer_address, total_amount, notes, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'payment_pending')`, [
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
            await connection.commit();
            connection.release();
            const createdOrder = {
                order_id: orderId,
                order_ref: orderRef,
                ...orderData,
                total_amount: total,
                status: 'payment_pending'
            };
            email_service_1.EmailService.sendOrderConfirmation(createdOrder).catch(err => {
                console.error('Failed to send order confirmation email:', err);
            });
            return {
                success: true,
                message: 'Order created successfully',
                data: createdOrder
            };
        }
        catch (error) {
            await connection.rollback();
            connection.release();
            console.error('Error creating order:', error);
            return { success: false, message: 'Failed to create order', error: error.message };
        }
    }
    static async restoreOrderStock(orderId) {
        const connection = await database_1.pool.getConnection();
        try {
            await connection.beginTransaction();
            const [items] = await connection.execute('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [orderId]);
            for (const item of items) {
                await inventory_service_1.InventoryService.restoreStock(connection, item['product_id'], item['quantity']);
            }
            await connection.commit();
            connection.release();
            return {
                success: true,
                message: 'Stock restored successfully'
            };
        }
        catch (error) {
            await connection.rollback();
            connection.release();
            console.error('Error restoring order stock:', error);
            return {
                success: false,
                message: 'Failed to restore stock',
                error: error.message
            };
        }
    }
    static async getOrderStatusHistory(orderId) {
        try {
            const connection = await database_1.pool.getConnection();
            const [rows] = await connection.execute(`SELECT 
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
         ORDER BY osh.changed_at ASC`, [orderId]);
            connection.release();
            return {
                success: true,
                data: rows
            };
        }
        catch (error) {
            console.error('Error getting order status history:', error);
            return {
                success: false,
                message: 'Failed to get order status history',
                error: error.message
            };
        }
    }
    static async logStatusChange(orderId, newStatus, previousStatus = null, changedBy = 'system', notes = null) {
        try {
            const connection = await database_1.pool.getConnection();
            await connection.execute(`INSERT INTO order_status_history 
         (order_id, status, previous_status, changed_by, notes)
         VALUES (?, ?, ?, ?, ?)`, [orderId, newStatus, previousStatus, changedBy, notes]);
            connection.release();
            console.log(`✅ Status change logged: Order ${orderId} ${previousStatus} → ${newStatus}`);
        }
        catch (error) {
            console.error('Error logging status change:', error);
        }
    }
    static async getOrdersByStatus(status) {
        try {
            const connection = await database_1.pool.getConnection();
            const [rows] = await connection.execute(`SELECT o.*, p.payment_method, p.payment_status, p.amount as payment_amount, 
                p.payment_proof_url, p.reference_number as payment_reference, p.created_at as payment_created_at
         FROM orders o
         LEFT JOIN payments p ON o.order_id = p.order_id
         WHERE o.status = ?
         ORDER BY o.created_at DESC`, [status]);
            connection.release();
            return {
                success: true,
                data: rows
            };
        }
        catch (error) {
            console.error('Error getting orders by status:', error);
            return {
                success: false,
                message: 'Failed to get orders',
                error: error.message
            };
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
            const [orderRows] = await connection.execute('SELECT * FROM orders WHERE order_id = ?', [orderId]);
            const [result] = await connection.execute('UPDATE orders SET status = ? WHERE order_id = ?', [status, orderId]);
            connection.release();
            if (result.affectedRows === 0) {
                return { success: false, message: 'Order not found' };
            }
            if (orderRows.length > 0) {
                const order = orderRows[0];
                email_service_1.EmailService.sendOrderStatusUpdate(order, status).catch(err => {
                    console.error('Failed to send status update email:', err);
                });
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
    static async reorderFromOrder(orderId, customerId) {
        const connection = await database_1.pool.getConnection();
        try {
            await connection.beginTransaction();
            const [orderRows] = await connection.execute('SELECT * FROM orders WHERE order_id = ? AND customer_id = ?', [orderId, customerId]);
            if (orderRows.length === 0) {
                await connection.rollback();
                connection.release();
                return { success: false, message: 'Order not found or access denied' };
            }
            const order = orderRows[0];
            const [orderItemRows] = await connection.execute('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
            if (orderItemRows.length === 0) {
                await connection.rollback();
                connection.release();
                return { success: false, message: 'No items found in the original order' };
            }
            await connection.execute('DELETE FROM cart_items WHERE customer_id = ?', [customerId]);
            for (const item of orderItemRows) {
                const [productRows] = await connection.execute('SELECT * FROM catalog_clothing WHERE product_id = ?', [item['product_id']]);
                if (productRows.length === 0) {
                    console.warn(`Product ${item['product_id']} no longer exists, skipping...`);
                    continue;
                }
                const product = productRows[0];
                await connection.execute(`INSERT INTO cart_items 
           (customer_id, product_id, product_name, quantity, size, color, unit_price, customization_data)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                    customerId,
                    item['product_id'],
                    product['product_name'],
                    item['quantity'],
                    item['size'],
                    item['color'],
                    product['price'],
                    item['customization_data']
                ]);
            }
            await connection.commit();
            connection.release();
            return {
                success: true,
                message: `Successfully added ${orderItemRows.length} items from order ${order['order_ref']} to your cart`
            };
        }
        catch (error) {
            await connection.rollback();
            connection.release();
            console.error('Error reordering:', error);
            return {
                success: false,
                message: 'Failed to reorder items',
                error: error.message
            };
        }
    }
}
exports.OrderService = OrderService;
//# sourceMappingURL=order.service.js.map