-- Create catalog_clothing table for RFM System
USE rfm_db;

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

-- Verify table was created
SHOW TABLES LIKE 'catalog_clothing';
DESCRIBE catalog_clothing;

