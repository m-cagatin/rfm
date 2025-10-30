-- Migration: Create product_images table and restructure schema
-- Since no important data exists, we can clean up old columns immediately

-- Step 1: Remove old image columns (no longer needed)
ALTER TABLE catalog_clothing DROP COLUMN image_url;
ALTER TABLE catalog_clothing DROP COLUMN images;
ALTER TABLE catalog_clothing DROP COLUMN cloudinary_public_id;

-- Step 2: Add product_code column
ALTER TABLE catalog_clothing
ADD COLUMN product_code VARCHAR(8) UNIQUE AFTER product_id;

-- Step 3: Create product_images table
CREATE TABLE IF NOT EXISTS product_images (
  image_id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  cloudinary_public_id VARCHAR(255),
  display_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraint with CASCADE delete
  FOREIGN KEY (product_id) REFERENCES catalog_clothing(product_id) ON DELETE CASCADE,
  
  -- Indexes for faster queries
  INDEX idx_product_id (product_id),
  INDEX idx_display_order (display_order),
  
  -- Ensure display_order is unique per product
  UNIQUE KEY unique_product_display (product_id, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
