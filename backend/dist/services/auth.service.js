"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcrypt = __importStar(require("bcrypt"));
const database_1 = require("../config/database");
const jwt_service_1 = require("./jwt.service");
const SALT_ROUNDS = 10;
class AuthService {
    static async hashPassword(password) {
        return await bcrypt.hash(password, SALT_ROUNDS);
    }
    static async comparePassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }
    static async registerCustomer(email, password, fullName, phone, address, city, province, postalCode, country, dateOfBirth, emergencyContactName, emergencyContactPhone, preferredContactMethod, marketingConsent) {
        try {
            const connection = await database_1.pool.getConnection();
            const [existing] = await connection.execute('SELECT CustomerId FROM customer_accounts WHERE CustomerEmail = ?', [email]);
            if (existing.length > 0) {
                connection.release();
                return {
                    success: false,
                    message: 'Email already registered',
                    error: 'DUPLICATE_EMAIL'
                };
            }
            const passwordHash = await this.hashPassword(password);
            const [result] = await connection.execute(`INSERT INTO customer_accounts 
         (CustomerEmail, CustomerPasswordHash, CustomerFullName, CustomerPhone, CustomerAddress, 
          CustomerCity, CustomerProvince, CustomerPostalCode, CustomerCountry, DateOfBirth,
          EmergencyContactName, EmergencyContactPhone, PreferredContactMethod, MarketingConsent) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                email, passwordHash, fullName, phone, address,
                city || null, province || null, postalCode || null, country || 'Philippines',
                dateOfBirth || null, emergencyContactName || null, emergencyContactPhone || null,
                preferredContactMethod || 'email', marketingConsent || false
            ]);
            const userData = {
                id: result.insertId,
                email,
                name: fullName,
                role: 'customer',
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
            const token = jwt_service_1.JwtService.generateToken({
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
        }
        catch (error) {
            console.error('Error registering customer:', error);
            return {
                success: false,
                message: 'Failed to register customer',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    static async loginUser(email, password) {
        try {
            const connection = await database_1.pool.getConnection();
            const [customerRows] = await connection.execute(`SELECT CustomerId, CustomerEmail, CustomerPasswordHash, CustomerFullName, 
                CustomerPhone, CustomerAddress
         FROM customer_accounts 
         WHERE CustomerEmail = ?`, [email]);
            if (customerRows.length > 0) {
                const customer = customerRows[0];
                const isValid = await this.comparePassword(password, customer['CustomerPasswordHash']);
                if (isValid) {
                    await connection.execute('UPDATE customer_accounts SET last_login = CURRENT_TIMESTAMP WHERE CustomerId = ?', [customer['CustomerId']]);
                    const userData = {
                        id: customer['CustomerId'],
                        email: customer['CustomerEmail'],
                        name: customer['CustomerFullName'],
                        role: 'customer',
                        phone: customer['CustomerPhone'],
                        address: customer['CustomerAddress']
                    };
                    const token = jwt_service_1.JwtService.generateToken({
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
                }
                else {
                    connection.release();
                    return {
                        success: false,
                        message: 'Invalid password',
                        error: 'INVALID_PASSWORD'
                    };
                }
            }
            const [userRows] = await connection.execute(`SELECT UserId, Email, PasswordHash, FullName, Phone, Roles 
         FROM Users 
         WHERE Email = ?`, [email]);
            if (userRows.length > 0) {
                const user = userRows[0];
                const isValid = await this.comparePassword(password, user['PasswordHash']);
                if (isValid) {
                    const roles = this.parseRoles(user['Roles']);
                    if (!roles.includes('admin')) {
                        connection.release();
                        return {
                            success: false,
                            message: 'Access denied. Admin role required.',
                            error: 'NO_ADMIN_ROLE'
                        };
                    }
                    await connection.execute('UPDATE Users SET last_login = CURRENT_TIMESTAMP WHERE UserId = ?', [user['UserId']]);
                    const userData = {
                        id: user['UserId'],
                        email: user['Email'],
                        name: user['FullName'],
                        role: 'employee',
                        phone: user['Phone'],
                        roles: roles
                    };
                    const token = jwt_service_1.JwtService.generateToken({
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
                }
                else {
                    connection.release();
                    return {
                        success: false,
                        message: 'Invalid password',
                        error: 'INVALID_PASSWORD'
                    };
                }
            }
            connection.release();
            return {
                success: false,
                message: 'Email not found',
                error: 'USER_NOT_FOUND'
            };
        }
        catch (error) {
            console.error('Error during login:', error);
            return {
                success: false,
                message: 'Login failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    static async getCustomerProfile(customerId) {
        try {
            const connection = await database_1.pool.getConnection();
            const [rows] = await connection.execute(`SELECT CustomerId, CustomerEmail, CustomerFullName, CustomerPhone, 
                CustomerAddress, created_at, last_login
         FROM customer_accounts 
         WHERE CustomerId = ?`, [customerId]);
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
        }
        catch (error) {
            console.error('Error fetching customer profile:', error);
            return {
                success: false,
                message: 'Failed to fetch customer profile',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    static async getEmployeeProfile(userId) {
        try {
            const connection = await database_1.pool.getConnection();
            const [rows] = await connection.execute(`SELECT UserId, Email, FullName, Phone, Roles, Status, hired_date, last_login
         FROM Users 
         WHERE UserId = ?`, [userId]);
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
        }
        catch (error) {
            console.error('Error fetching employee profile:', error);
            return {
                success: false,
                message: 'Failed to fetch employee profile',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    static parseRoles(raw) {
        try {
            if (Array.isArray(raw))
                return raw;
            if (raw == null)
                return [];
            if (Buffer.isBuffer(raw)) {
                const str = raw.toString('utf8').trim();
                if (str.startsWith('['))
                    return JSON.parse(str);
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
        }
        catch (error) {
            console.error('Error parsing roles:', error);
            return [];
        }
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map