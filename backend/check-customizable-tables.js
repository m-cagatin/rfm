require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

// Add SSL for Aiven
if (process.env.DB_HOST?.includes('aivencloud.com')) {
  const certPath = path.join(__dirname, 'certs/ca.pem');
  if (fs.existsSync(certPath)) {
    dbConfig.ssl = {
      ca: fs.readFileSync(certPath),
      rejectUnauthorized: true
    };
    console.log('✅ SSL certificate loaded');
  } else {
    dbConfig.ssl = {
      rejectUnauthorized: false
    };
    console.log('⚠️ Using SSL without local certificate');
  }
}

async function checkTables() {
  let connection;
  try {
    console.log('🔌 Connecting to Aiven database...');
    console.log(`   Host: ${dbConfig.host}`);
    console.log(`   Port: ${dbConfig.port}`);
    console.log(`   Database: ${dbConfig.database}`);
    console.log(`   User: ${dbConfig.user}`);
    console.log('');

    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected successfully!\n');

    // Check all tables
    console.log('📋 Listing all tables:');
    const [tables] = await connection.execute('SHOW TABLES');
    console.log(tables);
    console.log('');

    // Check if customizable_products table exists
    const tableName = 'customizable_products';
    const [tableExists] = await connection.execute(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = ? AND table_name = ?`,
      [dbConfig.database, tableName]
    );

    if (tableExists[0].count > 0) {
      console.log(`✅ Table '${tableName}' EXISTS\n`);
      
      // Get table structure
      console.log(`📊 Structure of '${tableName}' table:`);
      const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
      console.table(columns);
      console.log('');

      // Count records
      const [count] = await connection.execute(`SELECT COUNT(*) as total FROM ${tableName}`);
      console.log(`📈 Total records: ${count[0].total}\n`);

      // Show sample data if exists
      if (count[0].total > 0) {
        const [rows] = await connection.execute(`SELECT * FROM ${tableName} LIMIT 3`);
        console.log('📄 Sample data (first 3 records):');
        console.log(JSON.stringify(rows, null, 2));
      }
    } else {
      console.log(`❌ Table '${tableName}' DOES NOT EXIST\n`);
    }

    // Check customizable_product_images table
    const imagesTable = 'customizable_product_images';
    const [imagesTableExists] = await connection.execute(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = ? AND table_name = ?`,
      [dbConfig.database, imagesTable]
    );

    if (imagesTableExists[0].count > 0) {
      console.log(`\n✅ Table '${imagesTable}' EXISTS\n`);
      
      // Get table structure
      console.log(`📊 Structure of '${imagesTable}' table:`);
      const [imageColumns] = await connection.execute(`DESCRIBE ${imagesTable}`);
      console.table(imageColumns);
      console.log('');

      // Count records
      const [imageCount] = await connection.execute(`SELECT COUNT(*) as total FROM ${imagesTable}`);
      console.log(`📈 Total records: ${imageCount[0].total}\n`);

      // Show sample data if exists
      if (imageCount[0].total > 0) {
        const [imageRows] = await connection.execute(`SELECT * FROM ${imagesTable} LIMIT 5`);
        console.log('📄 Sample data (first 5 records):');
        console.log(JSON.stringify(imageRows, null, 2));
      }
    } else {
      console.log(`\n❌ Table '${imagesTable}' DOES NOT EXIST\n`);
      console.log('🔧 This table is REQUIRED for the new schema!');
      console.log('   Run the migration script to create it.');
    }

    // Check texture_variants table
    const variantsTable = 'texture_variants';
    const [variantsTableExists] = await connection.execute(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = ? AND table_name = ?`,
      [dbConfig.database, variantsTable]
    );

    if (variantsTableExists[0].count > 0) {
      console.log(`\n✅ Table '${variantsTable}' EXISTS`);
      const [variantCount] = await connection.execute(`SELECT COUNT(*) as total FROM ${variantsTable}`);
      console.log(`📈 Total records: ${variantCount[0].total}`);
    } else {
      console.log(`\n⚠️ Table '${variantsTable}' does not exist`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ENOTFOUND') {
      console.error('   → Cannot resolve database host. Check DB_HOST in .env');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('   → Access denied. Check DB_USER and DB_PASSWORD in .env');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   → Connection refused. Check DB_HOST and DB_PORT in .env');
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connection closed');
    }
  }
}

checkTables();
