-- Migration: Drop size_chart_url column from customizable_products table
-- Reason: Size chart will be displayed directly in frontend UI instead of storing in database
-- Date: 2025-11-01

-- Drop the size_chart_url column
ALTER TABLE customizable_products 
DROP COLUMN size_chart_url;

-- Migration applied successfully
-- The size_chart_url column has been removed from the customizable_products table
