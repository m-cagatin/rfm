-- Migration 006: Update fit_type enum to include more options
-- Add more comprehensive fit type options for different clothing styles

ALTER TABLE customizable_products 
MODIFY COLUMN fit_type ENUM(
  'Classic',
  'Slim Fit',
  'Regular Fit', 
  'Relaxed Fit',
  'Oversized',
  'Tapered',
  'Athletic Fit',
  'Muscle Fit'
) DEFAULT 'Classic' 
COMMENT 'Fit style of the garment';
