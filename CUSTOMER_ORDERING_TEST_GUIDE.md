# 🧪 CUSTOMER ORDERING SYSTEM - TEST GUIDE

## 🚀 Quick Start Testing

### Prerequisites ✅
- ✅ Backend server: `npm run dev` (Port 3001)
- ✅ Frontend server: `npm start` (Port 4200)
- ✅ Database: MySQL with all tables created

---

## 📋 COMPLETE TESTING CHECKLIST

### 🌐 Access Points
- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3001/api
- **Admin Panel**: http://localhost:4200/admin

---

## 🛒 CUSTOMER ORDERING FLOW - STEP BY STEP

### **SCENARIO 1: GUEST USER ORDERING** 👤

#### Step 1: Browse Products
1. ✅ **Navigate**: http://localhost:4200
2. ✅ **Click**: "Apparel" in navigation or "Browse Products"
3. ✅ **Verify**: Products display with images, prices, details
4. ✅ **Check**: Product cards show "Add to Cart" buttons

**Expected Result**: Product catalog displays with enhanced product information

#### Step 2: Add to Cart (As Guest)
1. ✅ **Click**: "Add to Cart" on any product
2. ✅ **Verify**: Success message appears
3. ✅ **Navigate**: http://localhost:4200/cart
4. ✅ **Check**: Item appears in cart with correct details

**Expected Result**: Cart shows item stored in localStorage

#### Step 3: Attempt Checkout (Redirects to Login)
1. ✅ **Click**: "Proceed to Checkout" in cart
2. ✅ **Verify**: Redirected to login page
3. ✅ **Check**: Message about login requirement

**Expected Result**: Guest must login to proceed

#### Step 4: Register New Account
1. ✅ **Navigate**: http://localhost:4200/signup
2. ✅ **Fill Form**:
   ```
   Name: Test Customer
   Email: testcustomer@example.com
   Password: Test123!
   Phone: +1234567890
   Address: 123 Test Street
   City: Test City
   ```
3. ✅ **Click**: "Sign Up"
4. ✅ **Verify**: Account created successfully

**Expected Result**: New account created, user logged in, cart merged

#### Step 5: Complete Checkout
1. ✅ **Navigate**: http://localhost:4200/checkout
2. ✅ **Verify**: Form pre-filled with user data
3. ✅ **Verify**: Cart items display correctly
4. ✅ **Add Notes**: "Please handle with care"
5. ✅ **Click**: "Place Order"
6. ✅ **Verify**: Success page shows order number

**Expected Result**: Order created with reference number (ORD-001, ORD-002, etc.)

---

### **SCENARIO 2: LOGGED USER ORDERING** 👨‍💼

#### Step 1: Login with Existing Account
1. ✅ **Navigate**: http://localhost:4200/login
2. ✅ **Use Credentials**:
   ```
   Email: testcustomer@example.com
   Password: Test123!
   ```
3. ✅ **Click**: "Login"
4. ✅ **Verify**: Logged in successfully

#### Step 2: Add Multiple Products to Cart
1. ✅ **Navigate**: http://localhost:4200/apparel
2. ✅ **Add**: 3 different products to cart
3. ✅ **Verify**: Each addition shows success message
4. ✅ **Check**: Cart icon shows item count

#### Step 3: Manage Cart Items
1. ✅ **Navigate**: http://localhost:4200/cart
2. ✅ **Update**: Change quantity of one item
3. ✅ **Remove**: Delete one item
4. ✅ **Verify**: Totals update correctly

**Expected Result**: Cart management works smoothly with real-time updates

#### Step 4: Direct Checkout (No Login Required)
1. ✅ **Click**: "Proceed to Checkout"
2. ✅ **Verify**: Direct access to checkout (no login redirect)
3. ✅ **Modify**: Update shipping address if needed
4. ✅ **Add**: Special instructions in notes
5. ✅ **Click**: "Place Order"

**Expected Result**: Order created immediately without friction

---

## 📊 ORDER TRACKING & HISTORY

### Step 1: View Order History
1. ✅ **Navigate**: http://localhost:4200/orders
2. ✅ **Verify**: All orders display with status
3. ✅ **Check**: Order references, dates, amounts
4. ✅ **Click**: "View Details" on any order

**Expected Result**: Complete order history with detailed breakdowns

### Step 2: Order Details Modal
1. ✅ **Verify**: Order information section
2. ✅ **Verify**: Customer information section  
3. ✅ **Verify**: Order items table with quantities, prices
4. ✅ **Check**: Total calculations are correct

**Expected Result**: Detailed order information display

---

## 🏭 ADMIN ORDER MANAGEMENT TEST

### Step 1: Access Admin Panel
1. ✅ **Login as Admin**: Use admin credentials
2. ✅ **Navigate**: http://localhost:4200/admin/orders
3. ✅ **Verify**: Kanban board displays with orders

### Step 2: Test Order Status Updates
1. ✅ **Drag**: Order from "Pending" to "Designing"
2. ✅ **Verify**: Order moves visually
3. ✅ **Check**: Status updates in database
4. ✅ **Test**: Dropdown status change as alternative

**Expected Result**: Orders move between stages, status updates persist

---

## 🧪 SPECIFIC TEST CASES

### **TEST 1: Cart Persistence** 
```
Scenario: Guest adds items, closes browser, reopens
Steps:
1. Add items to cart as guest
2. Close browser completely
3. Reopen browser, navigate to /cart
Expected: Items still in cart (localStorage)
```

### **TEST 2: Cart Merging**
```
Scenario: Guest cart merges on login
Steps:
1. Add 2 items as guest
2. Login to existing account with 1 item in database
3. Check cart after login
Expected: 3 items total (guest + user cart merged)
```

### **TEST 3: Order Creation Transaction**
```
Scenario: Order creation clears cart
Steps:
1. Add items to cart
2. Complete checkout
3. Navigate back to cart
Expected: Cart is empty after successful order
```

### **TEST 4: Authentication Required**
```
Scenario: Protected routes redirect to login
Steps:
1. Logout completely
2. Try to access /checkout, /orders directly
Expected: Redirected to /login
```

### **TEST 5: Order Status Flow**
```
Scenario: Customer sees status updates
Steps:
1. Create order as customer
2. Admin updates status in Kanban
3. Customer refreshes order history
Expected: Updated status visible to customer
```

---

## 🔍 WHAT TO LOOK FOR

### ✅ **Success Indicators**
- Products load with images and details
- Cart items persist and calculate correctly
- Smooth login/signup process
- Order creation generates reference numbers
- Status updates work both ways (admin → customer)
- No console errors in browser
- API responses are successful (200/201 status codes)

### ❌ **Potential Issues**
- Products not loading (check backend connection)
- Cart items disappearing (localStorage issues)
- Login failures (check database connection)
- Order creation errors (check cart → order conversion)
- Status updates not saving (check API calls)

---

## 🛠️ TROUBLESHOOTING

### **Issue: Products Not Loading**
```
Check:
1. Backend server running on port 3001
2. Database connection working
3. Network tab in browser for API calls
4. Console for JavaScript errors
```

### **Issue: Login Failures** 
```
Check:
1. User exists in customer_accounts table
2. Password hashing is working
3. JWT token generation
4. Browser network tab for auth requests
```

### **Issue: Cart Not Working**
```
Check:
1. LocalStorage in browser (F12 → Application → Storage)
2. Database cart_items table for logged users
3. Cart service API calls
4. Authentication status
```

### **Issue: Orders Not Creating**
```
Check:
1. All required tables exist (orders, order_items, cart_items)
2. Database transaction not failing
3. Foreign key constraints
4. API response in network tab
```

---

## 📱 MOBILE TESTING

### Additional Tests on Mobile
1. ✅ **Responsive Design**: Test on phone screen size
2. ✅ **Touch Interactions**: Tap buttons work smoothly  
3. ✅ **Form Inputs**: Easy typing on mobile keyboards
4. ✅ **Navigation**: Menu works on small screens

---

## 🎯 SUCCESS CRITERIA

### **Customer Experience Goals**
- [ ] **Easy Product Discovery**: Products load quickly with good images
- [ ] **Smooth Cart Management**: Add/remove/update works without issues
- [ ] **Simple Checkout**: Minimal steps, pre-filled forms
- [ ] **Clear Order Tracking**: Easy to find and understand order status
- [ ] **Mobile Friendly**: Works well on all device sizes

### **Technical Goals**
- [ ] **No Console Errors**: Clean browser console
- [ ] **Fast Loading**: Pages load under 3 seconds
- [ ] **Data Accuracy**: All calculations and displays correct
- [ ] **Persistent State**: Cart and login state maintained
- [ ] **API Reliability**: All backend calls succeed

---

## 📞 SUPPORT

If you encounter issues during testing:

1. **Check Browser Console**: F12 → Console for errors
2. **Check Network Tab**: F12 → Network for failed API calls  
3. **Verify Database**: Ensure all tables have data
4. **Restart Servers**: Stop and restart both frontend/backend
5. **Clear Browser Cache**: Hard refresh or incognito mode

---

**Ready to test! Start with Scenario 1 for the full guest-to-customer journey.** 🚀
