import * as bcrypt from 'bcrypt';
import { pool } from '../config/database';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { JwtService } from './jwt.service';

const SALT_ROUNDS = 10;

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: 'customer' | 'employee';
  phone?: string;
  address?: string;
  roles?: string[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  user?: AuthUser;
  token?: string;
}

export class AuthService {
  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Register a new customer account
   */
  static async registerCustomer(
    email: string,
    password: string,
    fullName: string,
    phone?: string,
    address?: string
  ): Promise<ApiResponse<AuthUser>> {
    try {
      const connection = await pool.getConnection();

      // Check if email already exists
      const [existing] = await connection.execute<RowDataPacket[]>(
        'SELECT CustomerId FROM customer_accounts WHERE CustomerEmail = ?',
        [email]
      );

      if (existing.length > 0) {
        connection.release();
        return {
          success: false,
          message: 'Email already registered',
          error: 'DUPLICATE_EMAIL'
        };
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Insert new customer
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO customer_accounts 
         (CustomerEmail, CustomerPasswordHash, CustomerFullName, CustomerPhone, CustomerAddress) 
         VALUES (?, ?, ?, ?, ?)`,
        [email, passwordHash, fullName, phone || null, address || null]
      );

      const userData = {
        id: result.insertId,
        email,
        name: fullName,
        role: 'customer' as const,
        phone,
        address
      };

      // Generate JWT token for newly registered user
      const token = JwtService.generateToken({
        userId: result.insertId,
        email: email,
        role: 'customer'
      });

      connection.release();

      return {
        success: true,
        message: 'Customer registered successfully',
        token: token,
        user: userData
      };
    } catch (error) {
      console.error('Error registering customer:', error);
      return {
        success: false,
        message: 'Failed to register customer',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Login user - checks both customer_accounts and Users tables
   */
  static async loginUser(email: string, password: string): Promise<ApiResponse<AuthUser>> {
    try {
      const connection = await pool.getConnection();

      // First, try customer_accounts table
      const [customerRows] = await connection.execute<RowDataPacket[]>(
        `SELECT CustomerId, CustomerEmail, CustomerPasswordHash, CustomerFullName, 
                CustomerPhone, CustomerAddress 
         FROM customer_accounts 
         WHERE CustomerEmail = ?`,
        [email]
      );

      if (customerRows.length > 0) {
        const customer = customerRows[0];
        const isValid = await this.comparePassword(password, customer['CustomerPasswordHash']);

        if (isValid) {
          // Update last_login
          await connection.execute(
            'UPDATE customer_accounts SET last_login = CURRENT_TIMESTAMP WHERE CustomerId = ?',
            [customer['CustomerId']]
          );

          const userData = {
            id: customer['CustomerId'],
            email: customer['CustomerEmail'],
            name: customer['CustomerFullName'],
            role: 'customer' as const,
            phone: customer['CustomerPhone'],
            address: customer['CustomerAddress']
          };

          // Generate JWT token
          const token = JwtService.generateToken({
            userId: customer['CustomerId'],
            email: customer['CustomerEmail'],
            role: 'customer'
          });

          connection.release();

          return {
            success: true,
            message: 'Login successful',
            token: token,
            user: userData
          };
        } else {
          connection.release();
          return {
            success: false,
            message: 'Invalid password',
            error: 'INVALID_PASSWORD'
          };
        }
      }

      // If not found in customer_accounts, try Users table (employees)
      const [userRows] = await connection.execute<RowDataPacket[]>(
        `SELECT UserId, Email, PasswordHash, FullName, Phone, Roles 
         FROM Users 
         WHERE Email = ?`,
        [email]
      );

      if (userRows.length > 0) {
        const user = userRows[0];
        const isValid = await this.comparePassword(password, user['PasswordHash']);

        if (isValid) {
          // Parse roles
          const roles = this.parseRoles(user['Roles']);
          
          // Check if user has admin role
          if (!roles.includes('admin')) {
            connection.release();
            return {
              success: false,
              message: 'Access denied. Admin role required.',
              error: 'NO_ADMIN_ROLE'
            };
          }

          // Update last_login
          await connection.execute(
            'UPDATE Users SET last_login = CURRENT_TIMESTAMP WHERE UserId = ?',
            [user['UserId']]
          );

          const userData = {
            id: user['UserId'],
            email: user['Email'],
            name: user['FullName'],
            role: 'employee' as const,
            phone: user['Phone'],
            roles: roles
          };

          // Generate JWT token
          const token = JwtService.generateToken({
            userId: user['UserId'],
            email: user['Email'],
            role: 'employee',
            roles: roles
          });

          connection.release();

          return {
            success: true,
            message: 'Login successful',
            token: token,
            user: userData
          };
        } else {
          connection.release();
          return {
            success: false,
            message: 'Invalid password',
            error: 'INVALID_PASSWORD'
          };
        }
      }

      // User not found in either table
      connection.release();
      return {
        success: false,
        message: 'Email not found',
        error: 'USER_NOT_FOUND'
      };
    } catch (error) {
      console.error('Error during login:', error);
      return {
        success: false,
        message: 'Login failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get customer profile by ID
   */
  static async getCustomerProfile(customerId: number): Promise<ApiResponse<AuthUser>> {
    try {
      const connection = await pool.getConnection();

      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT CustomerId, CustomerEmail, CustomerFullName, CustomerPhone, 
                CustomerAddress, created_at, last_login
         FROM customer_accounts 
         WHERE CustomerId = ?`,
        [customerId]
      );

      connection.release();

      if (rows.length === 0) {
        return {
          success: false,
          message: 'Customer not found'
        };
      }

      const customer = rows[0];
      return {
        success: true,
        user: {
          id: customer['CustomerId'],
          email: customer['CustomerEmail'],
          name: customer['CustomerFullName'],
          role: 'customer',
          phone: customer['CustomerPhone'],
          address: customer['CustomerAddress']
        }
      };
    } catch (error) {
      console.error('Error fetching customer profile:', error);
      return {
        success: false,
        message: 'Failed to fetch customer profile',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get employee profile by ID
   */
  static async getEmployeeProfile(userId: number): Promise<ApiResponse<AuthUser>> {
    try {
      const connection = await pool.getConnection();

      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT UserId, Email, FullName, Phone, Roles, Status, hired_date, last_login
         FROM Users 
         WHERE UserId = ?`,
        [userId]
      );

      connection.release();

      if (rows.length === 0) {
        return {
          success: false,
          message: 'Employee not found'
        };
      }

      const user = rows[0];
      const roles = this.parseRoles(user['Roles']);

      return {
        success: true,
        user: {
          id: user['UserId'],
          email: user['Email'],
          name: user['FullName'],
          role: 'employee',
          phone: user['Phone'],
          roles: roles
        }
      };
    } catch (error) {
      console.error('Error fetching employee profile:', error);
      return {
        success: false,
        message: 'Failed to fetch employee profile',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Parse roles from JSON field
   */
  private static parseRoles(raw: any): string[] {
    try {
      if (Array.isArray(raw)) return raw;
      if (raw == null) return [];
      
      if (Buffer.isBuffer(raw)) {
        const str = raw.toString('utf8').trim();
        if (str.startsWith('[')) return JSON.parse(str);
        return str.split(',').map(r => r.trim()).filter(Boolean);
      }
      
      if (typeof raw === 'object') {
        return Array.isArray(raw) ? raw : [];
      }
      
      const asString = String(raw).trim();
      if (asString.startsWith('[')) {
        return JSON.parse(asString);
      }
      
      return asString.split(',').map(r => r.trim()).filter(Boolean);
    } catch (error) {
      console.error('Error parsing roles:', error);
      return [];
    }
  }
}

