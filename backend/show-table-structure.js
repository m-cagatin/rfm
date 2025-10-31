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
  } else {
    dbConfig.ssl = {
      rejectUnauthorized: false
    };
  }
}

async function showStructure() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database\n');

    // Get customizable_products structure
    console.log('='.repeat(80));
    console.log('TABLE: customizable_products');
    console.log('='.repeat(80));
    const [columns1] = await connection.execute('DESCRIBE customizable_products');
    columns1.forEach(col => {
      console.log(`${col.Field.padEnd(25)} ${col.Type.padEnd(40)} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('TABLE: customizable_product_images');
    console.log('='.repeat(80));
    const [columns2] = await connection.execute('DESCRIBE customizable_product_images');
    columns2.forEach(col => {
      console.log(`${col.Field.padEnd(25)} ${col.Type.padEnd(40)} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('TABLE: texture_variants');
    console.log('='.repeat(80));
    const [columns3] = await connection.execute('DESCRIBE texture_variants');
    columns3.forEach(col => {
      console.log(`${col.Field.padEnd(25)} ${col.Type.padEnd(40)} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('TABLE: customizable_product_stock');
    console.log('='.repeat(80));
    const [columns4] = await connection.execute('DESCRIBE customizable_product_stock');
    columns4.forEach(col => {
      console.log(`${col.Field.padEnd(25)} ${col.Type.padEnd(40)} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

showStructure();
