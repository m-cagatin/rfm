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
                CustomerPhone, CustomerAddress, CustomerCity, CustomerProvince, 
                CustomerPostalCode, CustomerCountry, DateOfBirth, EmergencyContactName,
                EmergencyContactPhone, PreferredContactMethod, MarketingConsent
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
                error: 'EMAIL_NOT_FOUND'
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
                CustomerAddress, CustomerCity, CustomerProvince, CustomerPostalCode, 
                CustomerCountry, DateOfBirth, EmergencyContactName, EmergencyContactPhone,
                PreferredContactMethod, MarketingConsent, created_at, last_login
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
    static async updateCustomerProfile(customerId, profileData) {
        try {
            const connection = await database_1.pool.getConnection();
            if (profileData.email) {
                const [existingCustomer] = await connection.execute('SELECT CustomerId FROM customer_accounts WHERE CustomerEmail = ? AND CustomerId != ?', [profileData.email, customerId]);
                const [existingUser] = await connection.execute('SELECT UserId FROM Users WHERE Email = ?', [profileData.email]);
                if (existingCustomer.length > 0 || existingUser.length > 0) {
                    connection.release();
                    return {
                        success: false,
                        message: 'Email already exists',
                        error: 'DUPLICATE_EMAIL'
                    };
                }
            }
            const updateFields = [];
            const params = [];
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
            const [rows] = await connection.execute(`SELECT CustomerId, CustomerEmail, CustomerFullName, CustomerPhone, 
                CustomerAddress, CustomerCity, CustomerProvince, CustomerPostalCode, 
                CustomerCountry, DateOfBirth, EmergencyContactName, EmergencyContactPhone,
                PreferredContactMethod, MarketingConsent, created_at, last_login
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
        }
        catch (error) {
            console.error('Error updating customer profile:', error);
            return {
                success: false,
                message: 'Failed to update profile',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    static async changePassword(userId, role, oldPassword, newPassword) {
        try {
            const connection = await database_1.pool.getConnection();
            let currentHash;
            if (role === 'customer') {
                const [rows] = await connection.execute('SELECT CustomerPasswordHash FROM customer_accounts WHERE CustomerId = ?', [userId]);
                if (rows.length === 0) {
                    connection.release();
                    return {
                        success: false,
                        message: 'Customer not found'
                    };
                }
                currentHash = rows[0]['CustomerPasswordHash'];
            }
            else {
                const [rows] = await connection.execute('SELECT PasswordHash FROM Users WHERE UserId = ?', [userId]);
                if (rows.length === 0) {
                    connection.release();
                    return {
                        success: false,
                        message: 'Employee not found'
                    };
                }
                currentHash = rows[0]['PasswordHash'];
            }
            const isOldPasswordValid = await this.comparePassword(oldPassword, currentHash);
            if (!isOldPasswordValid) {
                connection.release();
                return {
                    success: false,
                    message: 'Current password is incorrect'
                };
            }
            const newPasswordHash = await this.hashPassword(newPassword);
            if (role === 'customer') {
                await connection.execute('UPDATE customer_accounts SET CustomerPasswordHash = ? WHERE CustomerId = ?', [newPasswordHash, userId]);
            }
            else {
                await connection.execute('UPDATE Users SET PasswordHash = ? WHERE UserId = ?', [newPasswordHash, userId]);
            }
            connection.release();
            return {
                success: true,
                message: 'Password changed successfully'
            };
        }
        catch (error) {
            console.error('Error changing password:', error);
            return {
                success: false,
                message: 'Failed to change password',
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