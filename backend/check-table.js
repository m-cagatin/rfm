const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

async function checkTable() {
  try {
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
      } else {
        dbConfig.ssl = {
          rejectUnauthorized: false
        };
      }
    }

    console.log('🔗 Connecting to database...');
    const connection = await mysql.createConnection(dbConfig);
    
    // Show tables
    console.log('📋 Available tables:');
    const [tables] = await connection.execute('SHOW TABLES');
    console.log(tables);
    
    // Describe catalog_clothing table structure
    console.log('\n📋 catalog_clothing table structure:');
    const [columns] = await connection.execute('DESCRIBE catalog_clothing');
    console.log(columns);
    
    // Show sample data
    console.log('\n📋 Sample data from catalog_clothing:');
    const [rows] = await connection.execute('SELECT * FROM catalog_clothing LIMIT 5');
    console.log(rows);
    
    await connection.end();
    console.log('✅ Done');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkTable();