-- Migration: Create customizable_product_images table and restructure schema
-- Similar to catalog_clothing migration (007)
-- Accounts for: texture_variants and customizable_product_stock (both have CASCADE, no changes needed)

-- Step 1: Add product_code column (if not exists)
-- Already exists, skipping

-- Step 2: Drop old image columns
ALTER TABLE customizable_products DROP COLUMN front_image_url;
ALTER TABLE customizable_products DROP COLUMN back_image_url;
ALTER TABLE customizable_products DROP COLUMN additional_image_urls;

-- Step 3: Create new images table with image_type support
CREATE TABLE IF NOT EXISTS customizable_product_images (
  image_id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  cloudinary_public_id VARCHAR(255),
  image_type ENUM('front', 'back', 'additional') NOT NULL,
  display_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraint with CASCADE delete
  FOREIGN KEY (product_id) REFERENCES customizable_products(id) ON DELETE CASCADE,
  
  -- Indexes for faster queries
  INDEX idx_product_id (product_id),
  INDEX idx_image_type (image_type),
  
  -- Ensure display_order is unique per product and type
  UNIQUE KEY unique_product_type_display (product_id, image_type, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Note: texture_variants and customizable_product_stock already have CASCADE delete
-- No changes needed for those tables
