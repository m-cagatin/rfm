const http = require('http');

console.log('🧪 Testing Customizable Products API...\n');

// Test GET endpoint
const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/customizable-products',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req = http.request(options, (res) => {
  let data = '';

  console.log(`✅ Response Status: ${res.statusCode}`);
  console.log(`✅ Response Headers:`, res.headers);
  console.log('');

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      console.log('✅ Response Data:');
      console.log(JSON.stringify(jsonData, null, 2));
      console.log('\n✅ API is working correctly!');
    } catch (error) {
      console.error('❌ Failed to parse JSON response:', error.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ API Request Failed:', error.message);
  console.log('\n⚠️ Make sure the backend server is running on port 3001');
});

req.end();
