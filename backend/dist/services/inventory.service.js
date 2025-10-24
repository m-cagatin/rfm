"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const database_1 = require("../config/database");
class InventoryService {
    static async checkStockAvailability(productId, quantity) {
        try {
            const connection = await database_1.pool.getConnection();
            const [rows] = await connection.execute('SELECT product_id, product_name, stock_quantity FROM catalog_clothing WHERE product_id = ?', [productId]);
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
        }
        catch (error) {
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
    static async checkMultipleStock(items) {
        try {
            const checks = [];
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
        }
        catch (error) {
            console.error('Error checking multiple stock:', error);
            return {
                success: false,
                message: 'Failed to check stock availability',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    static async deductStock(connection, productId, quantity) {
        try {
            const [rows] = await connection.execute('SELECT product_id, product_name, stock_quantity FROM catalog_clothing WHERE product_id = ? FOR UPDATE', [productId]);
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
            const [result] = await connection.execute('UPDATE catalog_clothing SET stock_quantity = stock_quantity - ? WHERE product_id = ?', [quantity, productId]);
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
        }
        catch (error) {
            console.error('Error deducting stock:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to deduct stock'
            };
        }
    }
    static async restoreStock(connection, productId, quantity) {
        try {
            const [result] = await connection.execute('UPDATE catalog_clothing SET stock_quantity = stock_quantity + ? WHERE product_id = ?', [quantity, productId]);
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
        }
        catch (error) {
            console.error('Error restoring stock:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to restore stock'
            };
        }
    }
    static async getLowStockProducts(threshold = 10) {
        try {
            const connection = await database_1.pool.getConnection();
            const [rows] = await connection.execute(`SELECT product_id, product_name, category, stock_quantity, base_price, status
         FROM catalog_clothing
         WHERE stock_quantity < ? AND status = 'Active'
         ORDER BY stock_quantity ASC`, [threshold]);
            connection.release();
            return {
                success: true,
                data: rows.map(row => ({
                    ...row,
                    base_price: Number(row['base_price'])
                }))
            };
        }
        catch (error) {
            console.error('Error getting low stock products:', error);
            return {
                success: false,
                message: 'Failed to get low stock products',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    static async getProductStock(productId) {
        try {
            const connection = await database_1.pool.getConnection();
            const [rows] = await connection.execute('SELECT stock_quantity FROM catalog_clothing WHERE product_id = ?', [productId]);
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
        }
        catch (error) {
            console.error('Error getting product stock:', error);
            return {
                success: false,
                message: 'Failed to get product stock',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}
exports.InventoryService = InventoryService;
//# sourceMappingURL=inventory.service.js.map