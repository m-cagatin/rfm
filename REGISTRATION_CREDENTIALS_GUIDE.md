# 🔐 REGISTRATION & CREDENTIALS GUIDE - ORDER SUBMISSION

## 📋 **REGISTRATION SYSTEM OVERVIEW**

Your RFM system has a **comprehensive registration process** with proper validation. Here's what's required:

---

## 🆔 **REGISTRATION REQUIREMENTS**

### ✅ **Required Fields** (Must fill to register)

| Field | Type | Validation | Example |
|-------|------|------------|---------|
| **Full Name** | Text | Min 2 characters | "John Doe Smith" |
| **Email Address** | Email | Valid email format | "john.doe@example.com" |
| **Phone Number** | Tel | Pattern validation | "+63 917 123 4567" |
| **Address** | Textarea | Min 10 characters | "123 Rizal Street, Barangay San Jose" |
| **City** | Text | Required | "Manila" |
| **Province** | Text | Required | "Metro Manila" |
| **Postal Code** | Text | Required | "1000" |
| **Country** | Dropdown | Required | "Philippines" (default) |
| **Preferred Contact** | Select | Required | "Email" / "Phone" / "SMS" |
| **Password** | Password | Min 6 characters | "SecurePass123!" |
| **Confirm Password** | Password | Must match password | "SecurePass123!" |

### 📝 **Optional Fields** (Can be left blank)

| Field | Purpose | Example |
|-------|---------|---------|
| **Date of Birth** | Demographics | "1990-05-15" |
| **Emergency Contact Name** | Safety | "Jane Doe" |
| **Emergency Contact Phone** | Safety | "+63 917 987 6543" |
| **Marketing Consent** | Communications | ✓ Checkbox |

---

## 🧪 **TEST CREDENTIALS FOR IMMEDIATE TESTING**

### **Option 1: Quick Test Account**
```
✅ RECOMMENDED FOR TESTING:
Full Name: Test Customer
Email: test@example.com
Phone: +63 917 123 4567
Address: 123 Test Street, Test Barangay
City: Manila
Province: Metro Manila  
Postal Code: 1000
Country: Philippines
Preferred Contact: Email
Password: test123
Confirm Password: test123
```

### **Option 2: Admin Test Account** 
```
✅ FOR ADMIN TESTING:
Full Name: Admin User
Email: admin@rfm.com
Phone: +63 917 999 8888
Address: 456 Admin Avenue, Business District
City: Makati
Province: Metro Manila
Postal Code: 1200  
Country: Philippines
Preferred Contact: Email
Password: admin123
Confirm Password: admin123
```

### **Option 3: Customer Persona Test**
```
✅ REALISTIC CUSTOMER:
Full Name: Maria Santos
Email: maria.santos@gmail.com  
Phone: +63 917 555 2468
Address: 789 Sampaguita Street, Barangay Maligaya
City: Quezon City
Province: Metro Manila
Postal Code: 1100
Country: Philippines
Preferred Contact: SMS
Password: maria2024
Confirm Password: maria2024
```

---

## 🚀 **ORDER SUBMISSION PROCESS**

### **What Customers Need for Orders:**

#### **1. Account Registration** ✅ 
- Complete registration form (required fields above)
- Email verification (if implemented)
- Valid login credentials

#### **2. Product Selection** ✅
- Browse product catalog at `/apparel`
- Select products to add to cart
- Choose size/color variations (if available)

#### **3. Cart Management** ✅ 
- Add/remove items from cart
- Update quantities
- Review total pricing

#### **4. Checkout Information** ✅
- **Pre-filled from registration**: Name, Email, Phone, Address
- **Additional Order Info**:
  - Special delivery instructions (optional)
  - Order notes/requests (optional)
  - Confirmation of contact details

#### **5. Order Confirmation** ✅
- Review final order details
- Confirm shipping information  
- Submit order for processing

---

## 🔒 **AUTHENTICATION FLOW**

### **For New Customers:**
```
1. Visit: http://localhost:4200/signup
2. Fill registration form with required fields
3. Submit → Account created + Auto login
4. Cart items (if any) automatically merged
5. Proceed directly to checkout
```

### **For Existing Customers:**
```
1. Visit: http://localhost:4200/login
2. Enter email + password
3. Login → Cart items merged (guest + user)
4. Continue shopping or checkout
```

### **Guest Shopping (Limited):**
```
1. Browse products ✅
2. Add to cart (localStorage) ✅  
3. Attempt checkout → Redirected to login ❌
4. Must register/login to complete order
```

---

## 🛡️ **SECURITY & VALIDATION**

### **Password Requirements:**
- ✅ Minimum 6 characters
- ✅ Must match confirmation
- ✅ Secure hashing in database (bcrypt)

### **Email Validation:**
- ✅ Valid email format required
- ✅ Unique email constraint (no duplicates)
- ✅ Used for order confirmations

### **Phone Validation:**
- ✅ Pattern validation for format
- ✅ International format supported (+63, +1, etc.)

### **Address Validation:**
- ✅ Minimum 10 characters for complete address
- ✅ Required for shipping/billing

---

## 📊 **TESTING SCENARIOS**

### **Scenario 1: New Customer Registration**
```
✅ Test Steps:
1. Go to /signup
2. Fill all required fields with test data above
3. Submit form
4. Verify success message
5. Check auto-login works
6. Verify redirect to intended page
```

### **Scenario 2: Login with Existing Credentials**
```
✅ Test Steps:  
1. Go to /login
2. Use: test@example.com / test123
3. Verify successful login
4. Check user data displays correctly
5. Verify cart persistence/merging
```

### **Scenario 3: Order Submission Flow**
```
✅ Test Steps:
1. Login with test credentials
2. Add products to cart
3. Go to /checkout
4. Verify pre-filled customer information
5. Add order notes: "Test order - handle with care"
6. Submit order
7. Verify order confirmation with reference number
8. Check /orders for order history
```

### **Scenario 4: Guest to Customer Conversion**  
```
✅ Test Steps:
1. Browse products as guest
2. Add 2-3 items to cart
3. Go to /cart → verify items in localStorage
4. Try /checkout → redirected to login
5. Register new account
6. Verify cart items merged after registration
7. Complete checkout successfully
```

---

## ❗ **COMMON VALIDATION ERRORS**

### **Registration Errors:**
- ❌ "Full name is required" → Enter at least 2 characters
- ❌ "Please enter a valid email" → Check email format
- ❌ "Phone number is required" → Use format: +63 XXX XXX XXXX
- ❌ "Address must be at least 10 characters" → Enter complete address
- ❌ "Passwords do not match" → Ensure both password fields identical

### **Login Errors:**
- ❌ "Email is required" → Enter registered email
- ❌ "Password is required" → Enter correct password  
- ❌ "Invalid credentials" → Check email/password combination
- ❌ "Account not found" → Register first or check email spelling

---

## 🎯 **ORDER SUBMISSION REQUIREMENTS SUMMARY**

### **What Makes Order Submission Successful:**

✅ **Valid Account**: Complete registration with all required fields  
✅ **Authentication**: Successful login with correct credentials  
✅ **Cart Items**: At least one product added to cart  
✅ **Complete Profile**: Name, email, phone, address all filled  
✅ **System Access**: Both frontend (4200) and backend (3001) running  
✅ **Database**: All tables created and accessible  

---

## 🔧 **TROUBLESHOOTING**

### **If Registration Fails:**
1. Check all required fields are filled
2. Verify email format is correct
3. Ensure passwords match exactly
4. Check backend server is running
5. Verify database connection

### **If Login Fails:**
1. Confirm account was created successfully
2. Check email spelling exactly as registered
3. Verify password is correct (case-sensitive)
4. Try clearing browser cache
5. Check network tab for API errors

### **If Order Submission Fails:**
1. Ensure user is logged in
2. Verify cart has items
3. Check all checkout form validations pass
4. Confirm backend server responding
5. Check database cart/order tables exist

---

## 🚀 **READY TO TEST!**

Your registration and credentials system is **enterprise-level** with:
- ✅ Comprehensive field validation
- ✅ Secure password handling  
- ✅ Complete address collection
- ✅ Flexible contact preferences
- ✅ Guest cart merging capability

**Use the test credentials above to start testing immediately!**

**Next Steps:**
1. Start servers: Frontend (4200) + Backend (3001)
2. Register with test credentials
3. Add products to cart
4. Complete order submission
5. Verify order appears in admin Kanban board

**Everything is ready for full end-to-end testing!** 🎉
