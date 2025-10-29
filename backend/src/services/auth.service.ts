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
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  dateOfBirth?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  preferredContactMethod?: 'email' | 'phone' | 'sms';
  marketingConsent?: boolean;
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
    phone: string,
    address: string,
    city?: string,
    province?: string,
    postalCode?: string,
    country?: string,
    dateOfBirth?: string,
    emergencyContactName?: string,
    emergencyContactPhone?: string,
    preferredContactMethod?: 'email' | 'phone' | 'sms',
    marketingConsent?: boolean
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

      // Insert new customer with all required fields for orders
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO customer_accounts 
         (CustomerEmail, CustomerPasswordHash, CustomerFullName, CustomerPhone, CustomerAddress, 
          CustomerCity, CustomerProvince, CustomerPostalCode, CustomerCountry, DateOfBirth,
          EmergencyContactName, EmergencyContactPhone, PreferredContactMethod, MarketingConsent) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          email, passwordHash, fullName, phone, address,
          city || null, province || null, postalCode || null, country || 'Philippines',
          dateOfBirth || null, emergencyContactName || null, emergencyContactPhone || null,
          preferredContactMethod || 'email', marketingConsent || false
        ]
      );

      const userData = {
        id: result.insertId,
        email,
        name: fullName,
        role: 'customer' as const,
        phone,
        address,
        city,
        province,
        postalCode,
        country: country || 'Philippines',
        dateOfBirth,
        emergencyContactName,
        emergencyContactPhone,
        preferredContactMethod: preferredContactMethod || 'email',
        marketingConsent: marketingConsent || false
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

      // First, try customer_accounts table (with all columns)
      const [customerRows] = await connection.execute<RowDataPacket[]>(
        `SELECT CustomerId, CustomerEmail, CustomerPasswordHash, CustomerFullName, 
                CustomerPhone, CustomerAddress, CustomerCity, CustomerProvince, 
                CustomerPostalCode, CustomerCountry, DateOfBirth, EmergencyContactName,
                EmergencyContactPhone, PreferredContactMethod, MarketingConsent
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
            address: customer['CustomerAddress'],
            city: customer['CustomerCity'],
            province: customer['CustomerProvince'],
            postalCode: customer['CustomerPostalCode'],
            country: customer['CustomerCountry'],
            dateOfBirth: customer['DateOfBirth'],
            emergencyContactName: customer['EmergencyContactName'],
            emergencyContactPhone: customer['EmergencyContactPhone'],
            preferredContactMethod: customer['PreferredContactMethod'],
            marketingConsent: customer['MarketingConsent']
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
        error: 'EMAIL_NOT_FOUND'
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
                CustomerAddress, CustomerCity, CustomerProvince, CustomerPostalCode, 
                CustomerCountry, DateOfBirth, EmergencyContactName, EmergencyContactPhone,
                PreferredContactMethod, MarketingConsent, created_at, last_login
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
          address: customer['CustomerAddress'],
          city: customer['CustomerCity'],
          province: customer['CustomerProvince'],
          postalCode: customer['CustomerPostalCode'],
          country: customer['CustomerCountry'],
          dateOfBirth: customer['DateOfBirth'],
          emergencyContactName: customer['EmergencyContactName'],
          emergencyContactPhone: customer['EmergencyContactPhone'],
          preferredContactMethod: customer['PreferredContactMethod'],
          marketingConsent: customer['MarketingConsent']
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
   * Update customer profile
   */
  static async updateCustomerProfile(customerId: number, profileData: Partial<AuthUser>): Promise<ApiResponse<AuthUser>> {
    try {
      const connection = await pool.getConnection();

      // Check if email is being changed and validate uniqueness across both tables
      if (profileData.email) {
        const [existingCustomer] = await connection.execute<RowDataPacket[]>(
          'SELECT CustomerId FROM customer_accounts WHERE CustomerEmail = ? AND CustomerId != ?',
          [profileData.email, customerId]
        );

        const [existingUser] = await connection.execute<RowDataPacket[]>(
          'SELECT UserId FROM Users WHERE Email = ?',
          [profileData.email]
        );

        if (existingCustomer.length > 0 || existingUser.length > 0) {
          connection.release();
          return {
            success: false,
            message: 'Email already exists',
            error: 'DUPLICATE_EMAIL'
          };
        }
      }

      // Build update query dynamically
      const updateFields: string[] = [];
      const params: any[] = [];

      if (profileData.name) {
        updateFields.push('CustomerFullName = ?');
        params.push(profileData.name);
      }
      if (profileData.email) {
        updateFields.push('CustomerEmail = ?');
        params.push(profileData.email);
      }
      if (profileData.phone) {
        updateFields.push('CustomerPhone = ?');
        params.push(profileData.phone);
      }
      if (profileData.address) {
        updateFields.push('CustomerAddress = ?');
        params.push(profileData.address);
      }
      if (profileData.city !== undefined) {
        updateFields.push('CustomerCity = ?');
        params.push(profileData.city);
      }
      if (profileData.province !== undefined) {
        updateFields.push('CustomerProvince = ?');
        params.push(profileData.province);
      }
      if (profileData.postalCode !== undefined) {
        updateFields.push('CustomerPostalCode = ?');
        params.push(profileData.postalCode);
      }
      if (profileData.country !== undefined) {
        updateFields.push('CustomerCountry = ?');
        params.push(profileData.country);
      }
      if (profileData.dateOfBirth !== undefined) {
        updateFields.push('DateOfBirth = ?');
        params.push(profileData.dateOfBirth);
      }
      if (profileData.emergencyContactName !== undefined) {
        updateFields.push('EmergencyContactName = ?');
        params.push(profileData.emergencyContactName);
      }
      if (profileData.emergencyContactPhone !== undefined) {
        updateFields.push('EmergencyContactPhone = ?');
        params.push(profileData.emergencyContactPhone);
      }
      if (profileData.preferredContactMethod !== undefined) {
        updateFields.push('PreferredContactMethod = ?');
        params.push(profileData.preferredContactMethod);
      }
      if (profileData.marketingConsent !== undefined) {
        updateFields.push('MarketingConsent = ?');
        params.push(profileData.marketingConsent ? 1 : 0);
      }

      if (updateFields.length === 0) {
        connection.release();
        return {
          success: false,
          message: 'No fields to update'
        };
      }

      params.push(customerId);
      const query = `UPDATE customer_accounts SET ${updateFields.join(', ')} WHERE CustomerId = ?`;
      
      await connection.execute(query, params);

      // Fetch updated customer data
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT CustomerId, CustomerEmail, CustomerFullName, CustomerPhone, 
                CustomerAddress, CustomerCity, CustomerProvince, CustomerPostalCode, 
                CustomerCountry, DateOfBirth, EmergencyContactName, EmergencyContactPhone,
                PreferredContactMethod, MarketingConsent, created_at, last_login
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
        message: 'Profile updated successfully',
        user: {
          id: customer['CustomerId'],
          email: customer['CustomerEmail'],
          name: customer['CustomerFullName'],
          role: 'customer',
          phone: customer['CustomerPhone'],
          address: customer['CustomerAddress'],
          city: customer['CustomerCity'],
          province: customer['CustomerProvince'],
          postalCode: customer['CustomerPostalCode'],
          country: customer['CustomerCountry'],
          dateOfBirth: customer['DateOfBirth'],
          emergencyContactName: customer['EmergencyContactName'],
          emergencyContactPhone: customer['EmergencyContactPhone'],
          preferredContactMethod: customer['PreferredContactMethod'],
          marketingConsent: customer['MarketingConsent']
        }
      };
    } catch (error) {
      console.error('Error updating customer profile:', error);
      return {
        success: false,
        message: 'Failed to update profile',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Change user password
   */
  static async changePassword(userId: number, role: 'customer' | 'employee', oldPassword: string, newPassword: string): Promise<ApiResponse> {
    try {
      const connection = await pool.getConnection();

      // Get current password hash
      let currentHash: string;
      if (role === 'customer') {
        const [rows] = await connection.execute<RowDataPacket[]>(
          'SELECT CustomerPasswordHash FROM customer_accounts WHERE CustomerId = ?',
          [userId]
        );
        if (rows.length === 0) {
          connection.release();
          return {
            success: false,
            message: 'Customer not found'
          };
        }
        currentHash = rows[0]['CustomerPasswordHash'];
      } else {
        const [rows] = await connection.execute<RowDataPacket[]>(
          'SELECT PasswordHash FROM Users WHERE UserId = ?',
          [userId]
        );
        if (rows.length === 0) {
          connection.release();
          return {
            success: false,
            message: 'Employee not found'
          };
        }
        currentHash = rows[0]['PasswordHash'];
      }

      // Verify old password
      const isOldPasswordValid = await this.comparePassword(oldPassword, currentHash);
      if (!isOldPasswordValid) {
        connection.release();
        return {
          success: false,
          message: 'Current password is incorrect'
        };
      }

      // Hash new password
      const newPasswordHash = await this.hashPassword(newPassword);

      // Update password in appropriate table
      if (role === 'customer') {
        await connection.execute(
          'UPDATE customer_accounts SET CustomerPasswordHash = ? WHERE CustomerId = ?',
          [newPasswordHash, userId]
        );
      } else {
        await connection.execute(
          'UPDATE Users SET PasswordHash = ? WHERE UserId = ?',
          [newPasswordHash, userId]
        );
      }

      connection.release();

      return {
        success: true,
        message: 'Password changed successfully'
      };
    } catch (error) {
      console.error('Error changing password:', error);
      return {
        success: false,
        message: 'Failed to change password',
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

