import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as mysql from 'mysql2/promise';
import * as path from 'path';

// Load environment variables
dotenv.config();

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
  acquireTimeout: number;
  timeout: number;
  ssl?: any;
  // Ensure DECIMAL columns (e.g., base_price) are returned as numbers
  decimalNumbers?: boolean;
}

export const dbConfig: DatabaseConfig = {
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

// Add SSL configuration for Aiven cloud database
if (process.env['DB_HOST']?.includes('aivencloud.com')) {
  const certPath = path.join(__dirname, '../../certs/ca.pem');
  if (fs.existsSync(certPath)) {
    dbConfig.ssl = {
      ca: fs.readFileSync(certPath),
      rejectUnauthorized: true
    };
    console.log('✅ SSL certificate loaded for Aiven connection');
  } else {
    // Fallback for Aiven - they also accept SSL without local cert
    dbConfig.ssl = {
      rejectUnauthorized: false
    };
    console.log('⚠️ Using SSL without local certificate for Aiven connection');
  }
}

// Create connection pool
export const pool = mysql.createPool(dbConfig);

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Initialize database (create tables if they don't exist)
export async function initializeDatabase(): Promise<void> {
  try {
    const connection = await pool.getConnection();
    
    // Create canvases table if it doesn't exist
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
    // Create Users table if it doesn't exist
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
    
    // Create catalog_clothing table if it doesn't exist
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
    
    // Insert sample users if table is empty
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM Users');
    const userCount = (rows as any)[0].count;
    
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
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Graceful shutdown
export async function closeDatabase(): Promise<void> {
  try {
    await pool.end();
    console.log('✅ Database connection pool closed');
  } catch (error) {
    console.error('❌ Error closing database connection pool:', error);
  }
}