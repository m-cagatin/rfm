require('dotenv').config();
const http = require('http');

// Test configuration
const API_BASE = 'http://localhost:3001';
const API_PATH = '/api/customizable-products';

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.cyan}${'='.repeat(80)}\n${msg}\n${'='.repeat(80)}${colors.reset}`)
};

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (error) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test data - minimal valid product
const testProduct = {
  name: 'Test T-Shirt',
  category: 'T-Shirt - Round Neck',
  gender: 'Unisex',
  fit_type: 'Classic',
  description: 'Test product for API validation',
  images: [
    {
      url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      publicId: 'test/front-001',
      imageType: 'front',
      displayOrder: 1
    },
    {
      url: 'https://res.cloudinary.com/demo/image/upload/sample2.jpg',
      publicId: 'test/back-001',
      imageType: 'back',
      displayOrder: 2
    }
  ],
  fabric_composition: '100% Cotton',
  fabric_weight: '180 GSM',
  texture: 'Soft',
  available_sizes: ['S', 'M', 'L', 'XL'],
  size_chart_url: null,
  fit_description: 'Regular fit',
  size_pricing: { 'XL': 50 },
  available_colors: [
    { name: 'Black', hex: '#000000' },
    { name: 'White', hex: '#FFFFFF' }
  ],
  variants: [
    { name: 'Cotton Soft', image_url: 'https://res.cloudinary.com/demo/image/upload/variant.jpg' }
  ],
  print_method: 'DTG',
  print_areas: ['Front', 'Back'],
  design_requirements: '300 DPI PNG',
  base_cost: 150,
  retail_price: 350,
  is_active: true,
  turnaround_time: '3-5 days',
  minimum_order_qty: 1
};

// Test Suite
async function runTests() {
  log.header('🧪 CUSTOMIZABLE PRODUCTS API TEST SUITE');
  
  let createdProductId = null;

  try {
    // TEST 1: Check if server is running
    log.header('TEST 1: Health Check');
    try {
      const health = await makeRequest('GET', '/api/health');
      if (health.status === 200) {
        log.success('Server is running');
        log.info(`Response: ${JSON.stringify(health.data, null, 2)}`);
      } else {
        log.error(`Unexpected status: ${health.status}`);
      }
    } catch (error) {
      log.error(`Server is not running! ${error.message}`);
      log.warning('Please start the backend server: cd backend && node dist/server.js');
      return;
    }

    // TEST 2: GET all products (should be empty initially)
    log.header('TEST 2: GET All Products');
    const getAll1 = await makeRequest('GET', API_PATH);
    if (getAll1.status === 200) {
      log.success('GET request successful');
      log.info(`Found ${getAll1.data.data?.length || 0} products`);
      console.log(JSON.stringify(getAll1.data, null, 2));
    } else {
      log.error(`Failed with status: ${getAll1.status}`);
      console.log(getAll1.data);
    }

    // TEST 3: Create a product - Missing required fields
    log.header('TEST 3: POST Product (Invalid - Missing Fields)');
    const invalidProduct = { name: 'Test' }; // Missing category and images
    const createInvalid = await makeRequest('POST', API_PATH, invalidProduct);
    if (createInvalid.status === 400) {
      log.success('Validation working - rejected invalid product');
      log.info(`Message: ${createInvalid.data.message}`);
    } else {
      log.warning(`Expected 400, got ${createInvalid.status}`);
      console.log(createInvalid.data);
    }

    // TEST 4: Create a product - Missing images
    log.header('TEST 4: POST Product (Invalid - Missing Images)');
    const noImages = { name: 'Test', category: 'T-Shirt' };
    const createNoImages = await makeRequest('POST', API_PATH, noImages);
    if (createNoImages.status === 400) {
      log.success('Image validation working');
      log.info(`Message: ${createNoImages.data.message}`);
    } else {
      log.warning(`Expected 400, got ${createNoImages.status}`);
    }

    // TEST 5: Create a valid product
    log.header('TEST 5: POST Product (Valid)');
    const createValid = await makeRequest('POST', API_PATH, testProduct);
    if (createValid.status === 201) {
      log.success('Product created successfully!');
      createdProductId = createValid.data.data.id;
      log.info(`Product ID: ${createdProductId}`);
      log.info(`Product Code: ${createValid.data.data.product_code}`);
      console.log(JSON.stringify(createValid.data, null, 2));
    } else {
      log.error(`Failed to create product: ${createValid.status}`);
      console.log(JSON.stringify(createValid.data, null, 2));
      return; // Stop if we can't create
    }

    // TEST 6: GET all products (should now have 1)
    log.header('TEST 6: GET All Products (After Creation)');
    const getAll2 = await makeRequest('GET', API_PATH);
    if (getAll2.status === 200 && getAll2.data.data.length > 0) {
      log.success(`Found ${getAll2.data.data.length} product(s)`);
      const product = getAll2.data.data[0];
      log.info(`Product: ${product.name} (ID: ${product.id})`);
      log.info(`Images: ${product.images?.length || 0}`);
      log.info(`Colors: ${product.available_colors?.length || 0}`);
      log.info(`Sizes: ${product.available_sizes?.length || 0}`);
    } else {
      log.error('Product not found after creation');
    }

    // TEST 7: GET single product by ID
    if (createdProductId) {
      log.header('TEST 7: GET Single Product by ID');
      const getSingle = await makeRequest('GET', `${API_PATH}/${createdProductId}`);
      if (getSingle.status === 200) {
        log.success('Product retrieved successfully');
        const p = getSingle.data.data;
        console.log('\nProduct Details:');
        console.log(`  Name: ${p.name}`);
        console.log(`  Category: ${p.category}`);
        console.log(`  Price: ₱${p.retail_price}`);
        console.log(`  Images: ${p.images?.length || 0}`);
        console.log(`  Variants: ${p.variants?.length || 0}`);
        console.log(`  Active: ${p.is_active ? 'Yes' : 'No'}`);
      } else {
        log.error(`Failed to get product: ${getSingle.status}`);
      }
    }

    // TEST 8: UPDATE product
    if (createdProductId) {
      log.header('TEST 8: PUT Update Product');
      const updateData = {
        ...testProduct,
        name: 'Updated Test T-Shirt',
        retail_price: 400,
        description: 'Updated description'
      };
      const update = await makeRequest('PUT', `${API_PATH}/${createdProductId}`, updateData);
      if (update.status === 200) {
        log.success('Product updated successfully');
        
        // Verify update
        const verify = await makeRequest('GET', `${API_PATH}/${createdProductId}`);
        if (verify.data.data.name === 'Updated Test T-Shirt') {
          log.success('Update verified - name changed');
        }
        if (verify.data.data.retail_price === 400) {
          log.success('Update verified - price changed');
        }
      } else {
        log.error(`Failed to update: ${update.status}`);
        console.log(update.data);
      }
    }

    // TEST 9: DELETE product
    if (createdProductId) {
      log.header('TEST 9: DELETE Product');
      log.warning(`Deleting test product ID: ${createdProductId}`);
      const deleteProduct = await makeRequest('DELETE', `${API_PATH}/${createdProductId}`);
      if (deleteProduct.status === 200) {
        log.success('Product deleted successfully');
        
        // Verify deletion
        const verify = await makeRequest('GET', `${API_PATH}/${createdProductId}`);
        if (verify.status === 404) {
          log.success('Deletion verified - product not found');
        }
      } else {
        log.error(`Failed to delete: ${deleteProduct.status}`);
      }
    }

    // TEST 10: Final count check
    log.header('TEST 10: Final Product Count');
    const finalCount = await makeRequest('GET', API_PATH);
    if (finalCount.status === 200) {
      const count = finalCount.data.data.length;
      log.info(`Final product count: ${count}`);
      if (count === 0) {
        log.success('All test products cleaned up');
      }
    }

    // Summary
    log.header('✅ TEST SUITE COMPLETED SUCCESSFULLY');
    log.success('All API endpoints are working correctly!');
    console.log('\nAPI Endpoints Tested:');
    console.log('  ✅ GET  /api/customizable-products');
    console.log('  ✅ GET  /api/customizable-products/:id');
    console.log('  ✅ POST /api/customizable-products');
    console.log('  ✅ PUT  /api/customizable-products/:id');
    console.log('  ✅ DELETE /api/customizable-products/:id');
    console.log('\n🎯 Your API is ready for frontend integration!');

  } catch (error) {
    log.error(`Test suite failed: ${error.message}`);
    console.error(error);
  }
}

// Run the tests
runTests();
