const mysql = require('mysql2/promise');

async function migrateSchema() {
  const conn = await mysql.createConnection({
    host: 'rfmdb-euniquecorn.d.aivencloud.com',
    port: 28152,
    user: 'Marcc',
    password: 'Marcc1234',
    database: 'rfm_db'
  });

  try {
    console.log('🚀 Starting schema migration...\n');

    // Step 1: Add new columns
    console.log('Step 1: Adding new single-selection columns...');
    await conn.execute(`
      ALTER TABLE customizable_products
      ADD COLUMN color_name VARCHAR(100) NULL AFTER available_colors,
      ADD COLUMN color_hex VARCHAR(7) NULL AFTER color_name,
      ADD COLUMN variant_name VARCHAR(255) NULL AFTER color_hex,
      ADD COLUMN variant_image_url VARCHAR(500) NULL AFTER variant_name,
      ADD COLUMN variant_image_public_id VARCHAR(500) NULL AFTER variant_image_url
    `);
    console.log('✓ New columns added\n');

    // Step 2: Remove old column
    console.log('Step 2: Removing old available_colors column...');
    await conn.execute('ALTER TABLE customizable_products DROP COLUMN available_colors');
    console.log('✓ available_colors column removed\n');

    // Step 3: Drop old table
    console.log('Step 3: Dropping texture_variants table...');
    await conn.execute('DROP TABLE IF EXISTS texture_variants');
    console.log('✓ texture_variants table dropped\n');

    // Step 4: Add indexes
    console.log('Step 4: Adding indexes...');
    await conn.execute('CREATE INDEX idx_color_name ON customizable_products(color_name)');
    await conn.execute('CREATE INDEX idx_variant_name ON customizable_products(variant_name)');
    console.log('✓ Indexes created\n');

    console.log('✅ Schema migration complete!\n');

    // Verify
    const [rows] = await conn.execute(`
      SHOW COLUMNS FROM customizable_products 
      WHERE Field IN ('color_name', 'color_hex', 'variant_name', 'variant_image_url', 'variant_image_public_id')
    `);
    
    console.log('New columns in customizable_products:');
    console.table(rows.map(r => ({
      Field: r.Field,
      Type: r.Type,
      Null: r.Null,
      Default: r.Default
    })));

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await conn.end();
  }
}

migrateSchema().catch(console.error);
