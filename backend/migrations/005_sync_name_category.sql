-- Migration 005: Sync name with category for existing products
-- This ensures any existing products have consistent name/category values

-- Update products where name is different from category
-- (Useful if you have test data with different values)
UPDATE customizable_products 
SET name = category 
WHERE name != category OR name IS NULL;

-- Optional: Add a comment to document the field relationship
ALTER TABLE customizable_products 
MODIFY COLUMN name VARCHAR(255) NOT NULL COMMENT 'Product name (typically same as category, e.g., T-Shirt, Hoodie)';

ALTER TABLE customizable_products 
MODIFY COLUMN category VARCHAR(100) NOT NULL COMMENT 'Product category/type (e.g., T-Shirt, Hoodie, Polo)';

-- Add index on name for faster lookups
CREATE INDEX idx_name ON customizable_products(name);
