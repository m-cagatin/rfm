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
exports.pool = exports.dbConfig = void 0;
exports.testConnection = testConnection;
exports.initializeDatabase = initializeDatabase;
exports.closeDatabase = closeDatabase;
const dotenv = __importStar(require("dotenv"));
const fs = __importStar(require("fs"));
const mysql = __importStar(require("mysql2/promise"));
const path = __importStar(require("path"));
dotenv.config();
exports.dbConfig = {
    host: process.env['DB_HOST'] || 'localhost',
    port: parseInt(process.env['DB_PORT'] || '3306'),
    user: process.env['DB_USER'] || 'root',
    password: process.env['DB_PASSWORD'] || '',
    database: process.env['DB_NAME'] || 'rfm_db',
    connectionLimit: 10,
    acquireTimeout: 60000,
    timeout: 60000,
    decimalNumbers: true,
};
if (process.env['DB_HOST']?.includes('aivencloud.com')) {
    const certPath = path.join(__dirname, '../../certs/ca.pem');
    if (fs.existsSync(certPath)) {
        exports.dbConfig.ssl = {
            ca: fs.readFileSync(certPath),
            rejectUnauthorized: true
        };
        console.log('✅ SSL certificate loaded for Aiven connection');
    }
    else {
        exports.dbConfig.ssl = {
            rejectUnauthorized: false
        };
        console.log('⚠️ Using SSL without local certificate for Aiven connection');
    }
}
exports.pool = mysql.createPool(exports.dbConfig);
async function testConnection() {
    try {
        const connection = await exports.pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
        return true;
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
}
async function initializeDatabase() {
    try {
        const connection = await exports.pool.getConnection();
        const createCanvasesTable = `
      CREATE TABLE IF NOT EXISTS canvases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        canvas_data JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
        await connection.execute(createCanvasesTable);
        const createUsersTable = `
      CREATE TABLE IF NOT EXISTS Users (
        UserId INT AUTO_INCREMENT PRIMARY KEY,
        FullName VARCHAR(255) NOT NULL,
        Email VARCHAR(255) UNIQUE NOT NULL,
        Phone VARCHAR(20),
        PasswordHash VARCHAR(255) DEFAULT '$2b$10$defaultHashForNewUsers12345678901234567890123456789',
        Roles JSON NOT NULL,
        Status ENUM('Active', 'Inactive') DEFAULT 'Active',
        hired_date DATE,
        last_login TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (Email),
        INDEX idx_status (Status),
        INDEX idx_hired_date (hired_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
        await connection.execute(createCanvasesTable);
        await connection.execute(createUsersTable);
        const createCatalogClothingTable = `
      CREATE TABLE IF NOT EXISTS catalog_clothing (
        product_id INT AUTO_INCREMENT PRIMARY KEY,
        product_name VARCHAR(255) NOT NULL UNIQUE,
        category VARCHAR(100) NOT NULL,
        base_price DECIMAL(10, 2) NOT NULL,
        description TEXT,
        image_url VARCHAR(500) NOT NULL,
        cloudinary_public_id VARCHAR(255),
        status ENUM('Active', 'Inactive', 'Archived') DEFAULT 'Active',
        stock_quantity INT DEFAULT 0,
        sku VARCHAR(100) UNIQUE,
        sizes JSON DEFAULT NULL,
        tags JSON DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_status (status),
        INDEX idx_product_name (product_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
        await connection.execute(createCatalogClothingTable);
        const [rows] = await connection.execute('SELECT COUNT(*) as count FROM Users');
        const userCount = rows[0].count;
        if (userCount === 0) {
            const insertSampleUsers = `
        INSERT INTO Users (FullName, Email, Phone, Roles, Status, hired_date, last_login) VALUES
        ('JHON MICHAEL CARREON', 'mikjhoncarreon@gmail.com', '+639603479818', '["Ripper", "Designer"]', 'Active', '2025-10-02', '2025-10-07 09:20:00'),
        ('LEO ESPINOSA', 'leoespinosa@gmail.com', '+639367946987', '["Seamster", "Cutter"]', 'Active', '2025-09-30', '2025-10-06 08:09:00'),
        ('BILGIAN A. MUÑOZ', 'bgoutlookph@gmail.com', '+639631897621', '["Designer", "HT Operator"]', 'Active', '2025-09-30', NULL),
        ('FLORAMAE DIMPAS', 'test@rfm-prints.com', '+63123456789', '["Cutter"]', 'Active', '2025-10-02', NULL);
      `;
            await connection.execute(insertSampleUsers);
            console.log('✅ Sample users inserted successfully');
        }
        console.log('✅ Database tables initialized successfully');
        connection.release();
    }
    catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
}
async function closeDatabase() {
    try {
        await exports.pool.end();
        console.log('✅ Database connection pool closed');
    }
    catch (error) {
        console.error('❌ Error closing database connection pool:', error);
    }
}
//# sourceMappingURL=database.js.map