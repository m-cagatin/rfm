// Quick script to check environment variables
require('dotenv').config();

console.log('\n=== Environment Variables Check ===\n');

console.log('Database Config:');
console.log('  DB_HOST:', process.env.DB_HOST ? '✅ Loaded' : '❌ Missing');
console.log('  DB_NAME:', process.env.DB_NAME ? '✅ Loaded' : '❌ Missing');

console.log('\nPayMongo Config:');
console.log('  PAYMONGO_TEST_PUBLIC_KEY:', process.env.PAYMONGO_TEST_PUBLIC_KEY ? '✅ Loaded' : '❌ Missing');
console.log('  PAYMONGO_TEST_SECRET_KEY:', process.env.PAYMONGO_TEST_SECRET_KEY ? '✅ Loaded' : '❌ Missing');
console.log('  PAYMONGO_WEBHOOK_SECRET:', process.env.PAYMONGO_WEBHOOK_SECRET ? '✅ Loaded' : '❌ Missing');
console.log('  PAYMENT_MODE:', process.env.PAYMENT_MODE ? '✅ Loaded' : '❌ Missing');

console.log('\nPayMongo Key Values (first 20 chars):');
if (process.env.PAYMONGO_TEST_PUBLIC_KEY) {
  console.log('  Public Key starts with:', process.env.PAYMONGO_TEST_PUBLIC_KEY.substring(0, 20));
} else {
  console.log('  Public Key: NOT LOADED');
}

if (process.env.PAYMONGO_TEST_SECRET_KEY) {
  console.log('  Secret Key starts with:', process.env.PAYMONGO_TEST_SECRET_KEY.substring(0, 20));
} else {
  console.log('  Secret Key: NOT LOADED');
}

console.log('\n=== All Loaded Environment Variables ===');
const envVars = Object.keys(process.env).filter(key => 
  key.startsWith('DB_') || 
  key.startsWith('PAYMONGO_') || 
  key.startsWith('PAYMENT_') ||
  key.startsWith('PORT') ||
  key.startsWith('NODE_ENV')
);
console.log('Count:', envVars.length);
envVars.forEach(key => {
  console.log(`  ${key}: ${process.env[key] ? '✅' : '❌'}`);
});

console.log('\n');

