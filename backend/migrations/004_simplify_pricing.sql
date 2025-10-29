-- Simplify pricing structure for customizable products
-- Keep retail_price as the final selling price (what customer sees before shipping)
-- Add size_pricing for size-based premiums

-- Note: retail_price already exists in the table
-- This migration only adds size_pricing column (already in migration 003)
-- base_cost column remains but is hidden from UI (internal tracking only)

-- Shipping fees will be handled separately as a business setting at checkout, not per-product
