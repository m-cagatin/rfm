-- Add size_pricing column to customizable_products table
-- This stores additional charges for specific sizes as JSON
-- Example: {"XL": 50, "2XL": 100, "3XL": 150}

ALTER TABLE customizable_products 
ADD COLUMN size_pricing JSON COMMENT 'Size-based pricing add-ons' 
AFTER fit_description;
