import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/database';

export interface CanvasData {
  id?: number;
  name: string;
  canvas_data?: any;
  created_at?: string;
  updated_at?: string;
}

export interface UserData {
  id?: number;
  FullName?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  Email?: string;
  email?: string;
  Phone?: string;
  phone?: string;
  Roles?: string;
  roles?: string[];
  Status?: 'Active' | 'Inactive';
  status?: 'Active' | 'Inactive';
  hired_date?: string;
  hiredDate?: string;
  last_login?: string | null;
  lastLogin?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export class DatabaseService {

  // === UTILITIES ===
  static parseRoles(raw: any): string[] {
    try {
      if (Array.isArray(raw)) return raw;
      if (raw == null) return [];
      if (Buffer.isBuffer(raw)) {
        const str = raw.toString('utf8').trim();
        if (str.startsWith('[')) return JSON.parse(str);
        return str.split(',').map(r => r.trim()).filter(Boolean);
      }
      if (typeof raw === 'object') return Array.isArray(raw) ? raw : [];
      const asString = String(raw).trim();
      if (asString.startsWith('[')) return JSON.parse(asString);
      return asString.split(',').map(r => r.trim()).filter(Boolean);
    } catch (error) {
      console.error('Error parsing roles:', error, 'Raw value:', raw);
      return [];
    }
  }

  // === CANVAS METHODS ===
  static async saveCanvas(canvasData: any, name: string): Promise<ApiResponse<CanvasData>> {
    try {
      const connection = await pool.getConnection();
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO canvases (name, canvas_data) VALUES (?, ?)`,
        [name, JSON.stringify(canvasData)]
      );
      connection.release();
      return {
        success: result.affectedRows > 0,
        message: 'Canvas saved successfully',
        data: {
          id: result.insertId,
          name,
          canvas_data: canvasData,
          created_at: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Database error in saveCanvas:', error);
      return { success: false, message: 'Database error occurred', error: (error as Error).message };
    }
  }

  static async getCanvasList(): Promise<ApiResponse<CanvasData[]>> {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT id, name, created_at, updated_at FROM canvases ORDER BY updated_at DESC`
      );
      connection.release();
      return { success: true, data: rows as any };
    } catch (error) {
      return { success: false, message: 'Failed to fetch canvas list', error: (error as Error).message };
    }
  }

  static async getCanvas(id: string): Promise<ApiResponse<CanvasData>> {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT * FROM canvases WHERE id = ?`,
        [id]
      );
      connection.release();
      if (rows.length === 0) return { success: false, message: 'Canvas not found' };
      const canvas = rows[0];
      return {
        success: true,
        data: {
          id: canvas['id'],
          name: canvas['name'],
          canvas_data: JSON.parse(canvas['canvas_data']),
          created_at: canvas['created_at'],
          updated_at: canvas['updated_at']
        }
      };
    } catch (error) {
      console.error('Database error in getCanvas:', error);
      return { success: false, message: 'Failed to fetch canvas', error: (error as Error).message };
    }
  }

  static async updateCanvas(id: string, canvasData: any, name?: string): Promise<ApiResponse<CanvasData>> {
    try {
      const connection = await pool.getConnection();
      let query = `UPDATE canvases SET canvas_data = ?, updated_at = CURRENT_TIMESTAMP`;
      const params: any[] = [JSON.stringify(canvasData)];
      if (name) { query += `, name = ?`; params.push(name); }
      query += ` WHERE id = ?`; params.push(id);

      const [result] = await connection.execute<ResultSetHeader>(query, params);
      connection.release();

      return result.affectedRows > 0
        ? { success: true, message: 'Canvas updated successfully', data: { id: parseInt(id), name, canvas_data: canvasData } }
        : { success: false, message: 'Canvas not found or no changes made' };
    } catch (error) {
      console.error('Database error in updateCanvas:', error);
      return { success: false, message: 'Failed to update canvas', error: (error as Error).message };
    }
  }

  static async deleteCanvas(id: string): Promise<ApiResponse> {
    try {
      const connection = await pool.getConnection();
      const [result] = await connection.execute<ResultSetHeader>(`DELETE FROM canvases WHERE id = ?`, [id]);
      connection.release();
      return result.affectedRows > 0
        ? { success: true, message: 'Canvas deleted successfully' }
        : { success: false, message: 'Canvas not found' };
    } catch (error) {
      console.error('Database error in deleteCanvas:', error);
      return { success: false, message: 'Failed to delete canvas', error: (error as Error).message };
    }
  }

  // === USER METHODS ===
  static async getUsers(role?: string, status?: string): Promise<ApiResponse<UserData[]>> {
    try {
      const connection = await pool.getConnection();
      let query = `SELECT UserId, FullName, Email, Phone, Roles, Status, hired_date, last_login, created_at FROM Users`;
      const conditions: string[] = [];
      const params: any[] = [];
      if (status && status !== 'All Employees') { conditions.push('Status = ?'); params.push(status); }
      if (role && role !== 'All Employees' && !['Active', 'Inactive'].includes(role)) { conditions.push('Roles LIKE ?'); params.push(`%${role}%`); }
      if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
      query += ' ORDER BY created_at DESC';

      const [rows] = await connection.execute<RowDataPacket[]>(query, params);
      connection.release();

      const users: UserData[] = rows.map(row => {
        const nameParts = row['FullName'].trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
        const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';
        const rolesData = this.parseRoles(row['Roles']);
        return {
          id: row['UserId'],
          firstName,
          middleName: middleName || undefined,
          lastName,
          email: row['Email'],
          phone: row['Phone'],
          roles: rolesData,
          status: row['Status'],
          hiredDate: row['hired_date'],
          lastLogin: row['last_login'],
          created_at: row['created_at'],
          updated_at: row['updated_at']
        };
      });

      return { success: true, data: users };
    } catch (error) {
      return { success: false, message: 'Failed to fetch users', error: (error as Error).message };
    }
  }

  static async getUser(id: string): Promise<ApiResponse<UserData>> {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT UserId, FullName, Email, Phone, Roles, Status, hired_date, last_login, created_at FROM Users WHERE UserId = ?`,
        [id]
      );
      connection.release();
      if (rows.length === 0) return { success: false, message: 'User not found' };

      const u = rows[0];
      const nameParts = u['FullName'].trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
      const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';
      const rolesData = this.parseRoles(u['Roles']);

      return {
        success: true,
        data: {
          id: u['UserId'],
          firstName,
          middleName: middleName || undefined,
          lastName,
          email: u['Email'],
          phone: u['Phone'],
          roles: rolesData,
          status: u['Status'],
          hiredDate: u['hired_date'],
          lastLogin: u['last_login'],
          created_at: u['created_at'],
          updated_at: u['updated_at']
        }
      };
    } catch (error) {
      return { success: false, message: 'Failed to fetch user', error: (error as Error).message };
    }
  }

  static async createUser(userData: Omit<UserData, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<UserData>> {
    try {
      const connection = await pool.getConnection();
      const defaultPasswordHash = '$2b$10$defaultHashForNewUsers12345678901234567890123456789';
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO Users (FullName, Email, Phone, PasswordHash, Roles, Status, hired_date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userData.FullName, userData.Email, userData.Phone || '', defaultPasswordHash, userData.Roles, userData.Status, userData.hired_date || null]
      );
      connection.release();
      return { success: true, message: 'User created successfully', data: { id: result.insertId, ...userData, created_at: new Date().toISOString() } };
    } catch (error) {
      return { success: false, message: 'Failed to create user', error: (error as Error).message };
    }
  }

  static async updateUser(id: string, userData: Partial<UserData>): Promise<ApiResponse> {
    try {
      const connection = await pool.getConnection();
      const updateFields: string[] = [];
      const params: any[] = [];

      if (userData.FullName) { updateFields.push('FullName = ?'); params.push(userData.FullName); }
      if (userData.Email) { updateFields.push('Email = ?'); params.push(userData.Email); }
      if (userData.Phone) { updateFields.push('Phone = ?'); params.push(userData.Phone); }
      if (userData.Roles) { updateFields.push('Roles = ?'); params.push(userData.Roles); }
      if (userData.Status) { updateFields.push('Status = ?'); params.push(userData.Status); }
      if (userData.hired_date) { updateFields.push('hired_date = ?'); params.push(userData.hired_date); }

      if (!updateFields.length) return { success: false, message: 'No fields to update' };
      params.push(id);

      const query = `UPDATE Users SET ${updateFields.join(', ')} WHERE UserId = ?`;
      const [result] = await connection.execute<ResultSetHeader>(query, params);
      connection.release();

      return { success: result.affectedRows > 0, message: result.affectedRows > 0 ? 'User updated successfully' : 'No changes made' };
    } catch (error) {
      return { success: false, message: 'Failed to update user', error: (error as Error).message };
    }
  }

  static async deleteUser(id: string): Promise<ApiResponse> {
    try {
      const connection = await pool.getConnection();
      const [result] = await connection.execute<ResultSetHeader>(`DELETE FROM Users WHERE UserId = ?`, [id]);
      connection.release();
      return { success: result.affectedRows > 0, message: result.affectedRows > 0 ? 'User deleted successfully' : 'User not found' };
    } catch (error) {
      return { success: false, message: 'Failed to delete user', error: (error as Error).message };
    }
  }

  static async updateUserLastLogin(id: string): Promise<ApiResponse> {
    try {
      const connection = await pool.getConnection();
      const [result] = await connection.execute<ResultSetHeader>(
        `UPDATE Users SET last_login = CURRENT_TIMESTAMP WHERE UserId = ?`,
        [id]
      );
      connection.release();
      return { success: result.affectedRows > 0, message: result.affectedRows > 0 ? 'Last login updated' : 'User not found' };
    } catch (error) {
      return { success: false, message: 'Failed to update last login', error: (error as Error).message };
    }
  }

  // === DATABASE HEALTH CHECK ===
  static async healthCheck(): Promise<ApiResponse> {
    try {
      const connection = await pool.getConnection();
      await connection.execute('SELECT 1 + 1 AS result');
      connection.release();
      return { success: true, message: 'Database connection OK' };
    } catch (error) {
      console.error('Database health check failed:', error);
      return { success: false, message: 'Database connection failed', error: (error as Error).message };
    }
  }

  // ==================== PRODUCT/CATALOG METHODS ====================

  // Create product
  static async createProduct(productData: {
    product_name: string;
    category: string;
    base_price: number;
    description?: string;
    image_url: string;
    cloudinary_public_id?: string;
    status?: string;
    stock_quantity?: number;
    sku?: string;
    sizes?: string;
    tags?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const connection = await pool.getConnection();
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO catalog_clothing 
         (product_name, category, base_price, description, image_url, cloudinary_public_id, status, stock_quantity, sku, sizes, tags) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          productData.product_name,
          productData.category,
          productData.base_price,
          productData.description || null,
          productData.image_url,
          productData.cloudinary_public_id || null,
          productData.status || 'Active',
          productData.stock_quantity || 0,
          productData.sku || null,
          productData.sizes || null,
          productData.tags || null
        ]
      );
      connection.release();
      return {
        success: true,
        message: 'Product created successfully',
        data: { product_id: result.insertId, ...productData }
      };
    } catch (error: any) {
      console.error('Database error in createProduct:', error);
      // Handle duplicate product name
      if (error.code === 'ER_DUP_ENTRY') {
        return { success: false, message: 'A product with this name already exists', error: error.message };
      }
      return { success: false, message: 'Database error occurred', error: error.message };
    }
  }

  // Get all products with optional filtering
  static async getProducts(category?: string, status?: string): Promise<ApiResponse<any[]>> {
    try {
      const connection = await pool.getConnection();
      let query = 'SELECT * FROM catalog_clothing WHERE 1=1';
      const params: any[] = [];
      
      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }
      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const [rows] = await connection.execute(query, params);
      connection.release();
      // Normalize types to ensure frontend gets numbers for DECIMAL fields
      const normalized = (rows as any[]).map((r) => ({
        ...r,
        base_price: r.base_price !== undefined && r.base_price !== null ? Number(r.base_price) : r.base_price,
        stock_quantity: r.stock_quantity !== undefined && r.stock_quantity !== null ? Number(r.stock_quantity) : r.stock_quantity,
      }));
      return { success: true, data: normalized };
    } catch (error) {
      console.error('Database error in getProducts:', error);
      return { success: false, message: 'Database error occurred', error: (error as Error).message };
    }
  }

  // Get single product
  static async getProduct(productId: string): Promise<ApiResponse<any>> {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute(
        'SELECT * FROM catalog_clothing WHERE product_id = ?',
        [productId]
      );
      connection.release();
      const products = (rows as any[]).map((r) => ({
        ...r,
        base_price: r.base_price !== undefined && r.base_price !== null ? Number(r.base_price) : r.base_price,
        stock_quantity: r.stock_quantity !== undefined && r.stock_quantity !== null ? Number(r.stock_quantity) : r.stock_quantity,
      }));
      if (products.length === 0) {
        return { success: false, message: 'Product not found' };
      }
      return { success: true, data: products[0] };
    } catch (error) {
      console.error('Database error in getProduct:', error);
      return { success: false, message: 'Database error occurred', error: (error as Error).message };
    }
  }

  // Update product
  static async updateProduct(productId: string, updateData: any): Promise<ApiResponse<any>> {
    try {
      const connection = await pool.getConnection();
      const fields = Object.keys(updateData);
      const values = Object.values(updateData);
      
      if (fields.length === 0) {
        return { success: false, message: 'No fields to update' };
      }
      
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const query = `UPDATE catalog_clothing SET ${setClause} WHERE product_id = ?`;
      
      const [result] = await connection.execute<ResultSetHeader>(query, [...values, productId]);
      connection.release();
      
      if (result.affectedRows === 0) {
        return { success: false, message: 'Product not found' };
      }
      
      return { success: true, message: 'Product updated successfully' };
    } catch (error: any) {
      console.error('Database error in updateProduct:', error);
      // Handle duplicate product name
      if (error.code === 'ER_DUP_ENTRY') {
        return { success: false, message: 'A product with this name already exists', error: error.message };
      }
      return { success: false, message: 'Database error occurred', error: error.message };
    }
  }

  // Archive product (soft delete)
  static async archiveProduct(productId: string): Promise<ApiResponse<any>> {
    try {
      const connection = await pool.getConnection();
      const [result] = await connection.execute<ResultSetHeader>(
        'UPDATE catalog_clothing SET status = ? WHERE product_id = ?',
        ['Archived', productId]
      );
      connection.release();
      
      if (result.affectedRows === 0) {
        return { success: false, message: 'Product not found' };
      }
      
      return { success: true, message: 'Product archived successfully' };
    } catch (error) {
      console.error('Database error in archiveProduct:', error);
      return { success: false, message: 'Database error occurred', error: (error as Error).message };
    }
  }

  // Restore archived product
  static async restoreProduct(productId: string): Promise<ApiResponse<any>> {
    try {
      const connection = await pool.getConnection();
      const [result] = await connection.execute<ResultSetHeader>(
        'UPDATE catalog_clothing SET status = ? WHERE product_id = ?',
        ['Active', productId]
      );
      connection.release();
      
      if (result.affectedRows === 0) {
        return { success: false, message: 'Product not found' };
      }
      
      return { success: true, message: 'Product restored successfully' };
    } catch (error) {
      console.error('Database error in restoreProduct:', error);
      return { success: false, message: 'Database error occurred', error: (error as Error).message };
    }
  }

  // Permanently delete product (hard delete - IRREVERSIBLE)
  static async deleteProductPermanently(productId: string): Promise<ApiResponse<any>> {
    try {
      const connection = await pool.getConnection();
      const [result] = await connection.execute<ResultSetHeader>(
        'DELETE FROM catalog_clothing WHERE product_id = ?',
        [productId]
      );
      connection.release();
      
      if (result.affectedRows === 0) {
        return { success: false, message: 'Product not found' };
      }
      
      return { success: true, message: 'Product permanently deleted' };
    } catch (error) {
      console.error('Database error in deleteProductPermanently:', error);
      return { success: false, message: 'Database error occurred', error: (error as Error).message };
    }
  }
}
