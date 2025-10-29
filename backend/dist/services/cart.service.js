"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartService = void 0;
const database_1 = require("../config/database");
class CartService {
    static async getCart(customerId) {
        try {
            const connection = await database_1.pool.getConnection();
            const [rows] = await connection.execute('SELECT * FROM cart_items WHERE customer_id = ? ORDER BY created_at DESC', [customerId]);
            connection.release();
            const items = rows.map(row => ({
                ...row,
                unit_price: Number(row.unit_price)
            }));
            return { success: true, data: items };
        }
        catch (error) {
            console.error('Error getting cart:', error);
            return { success: false, message: 'Failed to get cart', error: error.message };
        }
    }
    static async addToCart(cartItem) {
        try {
            const connection = await database_1.pool.getConnection();
            const [existing] = await connection.execute(`SELECT * FROM cart_items 
         WHERE customer_id = ? AND product_id = ? AND size = ? AND color = ?`, [cartItem.customer_id, cartItem.product_id, cartItem.size || null, cartItem.color || null]);
            if (existing.length > 0) {
                const newQty = existing[0]['quantity'] + cartItem.quantity;
                await connection.execute('UPDATE cart_items SET quantity = ? WHERE cart_item_id = ?', [newQty, existing[0]['cart_item_id']]);
                connection.release();
                return { success: true, message: 'Cart updated', data: { ...existing[0], quantity: newQty } };
            }
            else {
                const [result] = await connection.execute(`INSERT INTO cart_items 
           (customer_id, product_id, product_name, quantity, size, color, unit_price, customization_data) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                    cartItem.customer_id,
                    cartItem.product_id,
                    cartItem.product_name,
                    cartItem.quantity,
                    cartItem.size || null,
                    cartItem.color || null,
                    cartItem.unit_price,
                    cartItem.customization_data ? JSON.stringify(cartItem.customization_data) : null
                ]);
                connection.release();
                return { success: true, message: 'Item added to cart', data: { cart_item_id: result.insertId, ...cartItem } };
            }
        }
        catch (error) {
            console.error('Error adding to cart:', error);
            return { success: false, message: 'Failed to add to cart', error: error.message };
        }
    }
    static async updateQuantity(cartItemId, quantity, customerId) {
        try {
            const connection = await database_1.pool.getConnection();
            const [result] = await connection.execute('UPDATE cart_items SET quantity = ? WHERE cart_item_id = ? AND customer_id = ?', [quantity, cartItemId, customerId]);
            connection.release();
            if (result.affectedRows === 0) {
                return { success: false, message: 'Cart item not found' };
            }
            return { success: true, message: 'Quantity updated' };
        }
        catch (error) {
            console.error('Error updating quantity:', error);
            return { success: false, message: 'Failed to update quantity', error: error.message };
        }
    }
    static async removeFromCart(cartItemId, customerId) {
        try {
            const connection = await database_1.pool.getConnection();
            const [result] = await connection.execute('DELETE FROM cart_items WHERE cart_item_id = ? AND customer_id = ?', [cartItemId, customerId]);
            connection.release();
            if (result.affectedRows === 0) {
                return { success: false, message: 'Cart item not found' };
            }
            return { success: true, message: 'Item removed from cart' };
        }
        catch (error) {
            console.error('Error removing from cart:', error);
            return { success: false, message: 'Failed to remove item', error: error.message };
        }
    }
    static async clearCart(customerId) {
        try {
            const connection = await database_1.pool.getConnection();
            await connection.execute('DELETE FROM cart_items WHERE customer_id = ?', [customerId]);
            connection.release();
            return { success: true, message: 'Cart cleared' };
        }
        catch (error) {
            console.error('Error clearing cart:', error);
            return { success: false, message: 'Failed to clear cart', error: error.message };
        }
    }
    static async mergeGuestCart(customerId, guestItems) {
        try {
            for (const item of guestItems) {
                await this.addToCart({
                    customer_id: customerId,
                    ...item
                });
            }
            return { success: true, message: 'Guest cart merged successfully' };
        }
        catch (error) {
            console.error('Error merging guest cart:', error);
            return { success: false, message: 'Failed to merge cart', error: error.message };
        }
    }
}
exports.CartService = CartService;
//# sourceMappingURL=cart.service.js.map