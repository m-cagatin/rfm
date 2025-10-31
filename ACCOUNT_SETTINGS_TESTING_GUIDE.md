# Account Settings - Testing Guide

## Quick Test Instructions

### Prerequisites
1. Backend server running on `http://localhost:3000`
2. Frontend running on `http://localhost:4200`
3. Database with `customer_accounts` and `Users` tables

---

## Test Scenario 1: Customer Profile Update

### Steps:
1. **Login as Customer**
   - Go to `http://localhost:4200/login`
   - Login with customer credentials (e.g., from `customer_accounts` table)

2. **Navigate to Account Settings**
   - Click on user profile icon in navigation
   - Click "My Account"
   - OR directly visit: `http://localhost:4200/account-settings`

3. **View Profile (Default Tab)**
   - Should see "Profile Info" tab active
   - Should display all customer information in view mode
   - Should see "Edit Profile" button

4. **Edit Profile**
   - Click "Edit Profile" button
   - Form should appear with all fields populated
   - Try editing:
     - ✅ Full Name
     - ✅ Email (try an existing email to test uniqueness)
     - ✅ Phone
     - ✅ Address fields
     - ✅ Date of Birth
     - ✅ Emergency Contact
     - ✅ Preferred Contact Method (dropdown)
     - ✅ Marketing Consent (checkbox)

5. **Save Changes**
   - Click "Save Changes"
   - Should see loading spinner
   - Should see green success message: "Profile updated successfully!"
   - Should exit edit mode and show updated values
   - Success message should auto-dismiss after 3 seconds

6. **Test Validation**
   - Click "Edit Profile" again
   - Clear required field (e.g., Name)
   - Try to submit - should show validation error
   - Enter invalid email format - should show error
   - Click "Cancel" - should revert changes

7. **Test Email Uniqueness**
   - Click "Edit Profile"
   - Change email to one that already exists in database
   - Click "Save Changes"
   - Should see error: "Email already exists"

---

## Test Scenario 2: Password Change

### Steps:
1. **Switch to Password Tab**
   - Click "Change Password" tab
   - Should see 3 password fields

2. **Change Password**
   - Enter current password
   - Enter new password (min 6 characters)
   - Enter confirm password (matching new password)
   - Click "Change Password"
   - Should see success message: "Password changed successfully!"
   - Form should reset

3. **Test Wrong Old Password**
   - Try changing password with incorrect old password
   - Should see error: "Current password is incorrect"

4. **Test Password Mismatch**
   - Enter different values in "New Password" and "Confirm Password"
   - Should see error: "Passwords do not match"

5. **Test Validation**
   - Try password less than 6 characters
   - Should see error: "Password must be at least 6 characters"

---

## Test Scenario 3: Order History

### Steps:
1. **Switch to Orders Tab**
   - Click "Order History" tab
   - Should load customer's orders

2. **With Orders**
   - Should see order cards with:
     - Order reference number
     - Date and time
     - Total amount
     - Status badge (colored)
     - "View Details" button

3. **Without Orders**
   - Should see empty state
   - Message: "No orders yet"
   - "Start Shopping" button linking to `/catalog`

4. **View Order Details**
   - Click "View Details" on any order
   - Should navigate to order details page

---

## Test Scenario 4: Employee Redirect

### Steps:
1. **Logout**
   - Click Sign Out

2. **Login as Employee**
   - Go to login page
   - Login with employee credentials (from `Users` table with "admin" role)

3. **Try to Access Account Settings**
   - Navigate to `http://localhost:4200/account-settings`
   - Should be **automatically redirected** to `/admin` dashboard
   - Employees cannot edit their own profiles (admin manages this)

---

## Test Scenario 5: Responsive Design

### Steps:
1. **Desktop View**
   - Tabs should be horizontal
   - Forms should be 2 columns where applicable
   - All features visible

2. **Tablet View (768px)**
   - Adjust browser width to ~768px
   - Tabs should still be horizontal
   - Some form fields may stack
   - Reduced padding

3. **Mobile View (576px)**
   - Adjust browser width to ~576px
   - Tabs should stack vertically
   - All form fields should stack
   - Full-width buttons
   - Touch-friendly spacing

---

## Test Scenario 6: Error Handling

### Steps:
1. **Network Error**
   - Disable backend server
   - Try to load profile
   - Should see error message with "Retry" button
   - Click "Retry" - should attempt to reload

2. **Backend Error**
   - Cause backend error (e.g., database connection issue)
   - Should see appropriate error message
   - Should not crash frontend

---

## Expected Results Summary

### ✅ Profile Tab
- [ ] View mode displays all data correctly
- [ ] Edit mode shows form with all fields
- [ ] Save updates database and localStorage
- [ ] Cancel reverts changes
- [ ] Validation works for all fields
- [ ] Email uniqueness check works
- [ ] Success/error messages display correctly

### ✅ Password Tab
- [ ] All 3 fields present
- [ ] Old password verification works
- [ ] New password saves correctly
- [ ] Password mismatch validation works
- [ ] Form resets after success
- [ ] Can login with new password

### ✅ Orders Tab
- [ ] Orders load correctly
- [ ] Order cards display all info
- [ ] Status badges colored correctly
- [ ] Empty state works
- [ ] View Details navigation works

### ✅ General
- [ ] Employee redirect works
- [ ] Tabs switch smoothly
- [ ] Loading states show during API calls
- [ ] Success messages auto-dismiss
- [ ] Responsive design works
- [ ] No console errors
- [ ] AuthGuard protects route

---

## Common Issues & Solutions

### Issue: "Failed to fetch profile"
**Solution**: Check backend is running and database is accessible

### Issue: "Email already exists" (unexpected)
**Solution**: Check both `customer_accounts` and `Users` tables for duplicate email

### Issue: Form not submitting
**Solution**: Open browser console, check for validation errors

### Issue: Employee not redirected
**Solution**: Check user role in JWT token (should be 'employee')

### Issue: Orders not loading
**Solution**: Check `OrderService.getCustomerOrders()` endpoint is working

### Issue: Password change fails
**Solution**: Verify old password is correct in database (use bcrypt to compare)

---

## Browser Console Commands for Testing

```javascript
// Check current user
console.log(localStorage.getItem('currentUser'));

// Check auth token
console.log(localStorage.getItem('authToken'));

// Clear storage (force re-login)
localStorage.clear();
```

---

## API Endpoint Testing (Postman/Curl)

### Update Profile
```bash
curl -X PUT http://localhost:3000/api/auth/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Updated Name",
    "email": "newemail@example.com",
    "phone": "+639123456789"
  }'
```

### Change Password
```bash
curl -X PUT http://localhost:3000/api/auth/password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "oldPassword": "oldpass123",
    "newPassword": "newpass123"
  }'
```

---

## Database Verification

### Check if profile updated:
```sql
SELECT * FROM customer_accounts WHERE CustomerId = YOUR_CUSTOMER_ID;
```

### Check if password changed:
```sql
SELECT CustomerPasswordHash FROM customer_accounts WHERE CustomerId = YOUR_CUSTOMER_ID;
```

### Check email uniqueness:
```sql
-- Should return 0 or 1, not more
SELECT COUNT(*) FROM (
  SELECT CustomerEmail as email FROM customer_accounts WHERE CustomerEmail = 'test@example.com'
  UNION ALL
  SELECT Email as email FROM Users WHERE Email = 'test@example.com'
) as combined;
```

---

## Success Criteria

All tests pass when:
- ✅ Profile updates save to database
- ✅ localStorage updates after save
- ✅ Password changes are persisted
- ✅ Can login with new password
- ✅ Validation prevents invalid data
- ✅ Email uniqueness enforced
- ✅ Employees redirect to admin
- ✅ Orders display correctly
- ✅ No console errors
- ✅ Responsive on all devices
- ✅ Loading states work
- ✅ Success/error messages clear

---

**Happy Testing! 🎉**

