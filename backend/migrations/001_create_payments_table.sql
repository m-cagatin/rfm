-- ============================================
-- MIGRATION: Create payments table
-- Date: 2025-10-24
-- Description: Add payment tracking for orders
-- ============================================

CREATE TABLE IF NOT EXISTS payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  payment_method ENUM('paymongo', 'gcash', 'bank_transfer', 'cod') NOT NULL,
  payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
  amount DECIMAL(10,2) NOT NULL,
  
  -- PayMongo specific fields
  paymongo_payment_id VARCHAR(255),
  paymongo_payment_intent_id VARCHAR(255),
  paymongo_link_url VARCHAR(500),
  paymongo_link_id VARCHAR(255),
  
  -- Manual payment fields
  payment_proof_url VARCHAR(500),
  cloudinary_public_id VARCHAR(255),
  reference_number VARCHAR(100),
  
  -- Verification fields
  verified_by INT,
  verified_at TIMESTAMP NULL,
  
  -- Timestamps
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by) REFERENCES Users(UserId),
  
  -- Indexes
  INDEX idx_order_id (order_id),
  INDEX idx_status (payment_status),
  INDEX idx_method (payment_method),
  INDEX idx_paymongo_payment_id (paymongo_payment_id),
  INDEX idx_created_at (created_at)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Add payment_id to orders table (optional reference)
-- ============================================
ALTER TABLE orders 
  ADD COLUMN payment_id INT NULL AFTER total_amount,
  ADD FOREIGN KEY (payment_id) REFERENCES payments(payment_id);

-- ============================================
-- Success message
-- ============================================
SELECT 'Payments table created successfully!' AS status;

