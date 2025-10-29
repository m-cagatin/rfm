-- Create customizable_products table
CREATE TABLE IF NOT EXISTS customizable_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- 1. Basic Info
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  brand VARCHAR(100),
  gender ENUM('Unisex', 'Men', 'Women', 'Kids') DEFAULT 'Unisex',
  fit_type ENUM('Classic', 'Slim', 'Oversized') DEFAULT 'Classic',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- 2. Images
  front_image_url VARCHAR(500),
  back_image_url VARCHAR(500),
  additional_image_urls JSON, -- Array of image URLs
  
  -- 3. Material & Fabric
  fabric_composition VARCHAR(255),
  fabric_weight VARCHAR(100),
  texture VARCHAR(100),
  
  -- 4. Sizes & Fit
  available_sizes JSON, -- Array of sizes ["S", "M", "L", etc.]
  size_chart_url VARCHAR(500),
  fit_description VARCHAR(255),
  
  -- 5. Colors & Variants (stored as JSON array)
  available_colors JSON, -- Array of {name: string, hex: string}
  
  -- 6. Print & Customization
  print_method ENUM('DTG', 'Screen Print', 'Embroidery') DEFAULT 'DTG',
  print_areas JSON, -- Array of strings ["Front", "Back", "Sleeve"]
  design_requirements TEXT,
  
  -- 7. Pricing & Stock
  base_cost DECIMAL(10, 2) DEFAULT 0.00,
  retail_price DECIMAL(10, 2) DEFAULT 0.00,
  
  -- 8. Business Details
  turnaround_time VARCHAR(100),
  minimum_order_qty INT DEFAULT 1,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_category (category),
  INDEX idx_is_active (is_active),
  INDEX idx_gender (gender)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create texture_variants table (for uploaded variant images)
CREATE TABLE IF NOT EXISTS texture_variants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (product_id) REFERENCES customizable_products(id) ON DELETE CASCADE,
  INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create stock_entries table (for size/color inventory tracking)
CREATE TABLE IF NOT EXISTS customizable_product_stock (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  size VARCHAR(50) NOT NULL,
  color VARCHAR(100) NOT NULL,
  quantity INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (product_id) REFERENCES customizable_products(id) ON DELETE CASCADE,
  UNIQUE KEY unique_stock (product_id, size, color),
  INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
