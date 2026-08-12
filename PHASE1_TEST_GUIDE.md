# Phase 1 Testing Guide - Coupon System

## Overview
Phase 1 implementation includes coupon validation, admin UI enhancements, and student payment page integration.

---

## Backend Testing

### 1. Coupon Validation Tests
**File**: `backend/services/couponService.js`

#### Test Case 1: Minimum Purchase Amount Validation
```javascript
// Create a coupon with minimum purchase requirement
const coupon = {
    code: "MIN100",
    type: "percent",
    value: 10,
    appliesTo: {
        allCourses: true,
        minimumPurchaseAmount: 500
    },
    active: true
};

// Test 1a: Course price below minimum (should fail)
const validation = await couponService.validateCoupon("MIN100", courseId, userId, 300);
// Expected: valid: false, message: "Minimum purchase amount for this coupon is 500 ETB."

// Test 1b: Course price meets minimum (should pass)
const validation = await couponService.validateCoupon("MIN100", courseId, userId, 500);
// Expected: valid: true, discountAmount: 50, finalAmount: 450
```

#### Test Case 2: Improved Error Messages
```javascript
// Test that error messages are customer-friendly
const expiredCoupon = await couponService.validateCoupon("EXPIRED", courseId, userId, 1000);
// Expected: message: "This coupon has expired."

const inactiveCoupon = await couponService.validateCoupon("INACTIVE", courseId, userId, 1000);
// Expected: message: "This coupon is currently inactive."
```

#### Test Case 3: Per-User Limit with Multiple Uses
```javascript
const coupon = { code: "LIMITED", usageLimitPerUser: 1, ... };

// First use (should succeed)
const use1 = await couponService.validateCoupon("LIMITED", courseId, userId, 1000);
// Expected: valid: true

// Record usage
await couponService.recordUsageIfNeeded(coupon, transaction);

// Second attempt (should fail)
const use2 = await couponService.validateCoupon("LIMITED", courseId, userId, 1000);
// Expected: valid: false, message: "You have already used this coupon the maximum number of times."
```

### 2. Enrollment Model Testing
**File**: `backend/models/Enrollment.js`

```javascript
// Test that metadata field exists and stores coupon info
const enrollment = new Enrollment({
    studentRef: userId,
    courseRef: courseId,
    paymentAmount: 900,
    metadata: {
        coupon: {
            code: "EMARE10",
            discountAmount: 100,
            originalAmount: 1000
        }
    }
});

await enrollment.save();
const retrieved = await Enrollment.findById(enrollment._id);
console.assert(retrieved.metadata.coupon.code === "EMARE10");
console.assert(retrieved.metadata.coupon.discountAmount === 100);
```

### 3. Payment Integration Test
**File**: `backend/controllers/paymentController.js`

```javascript
// Test that coupon metadata is stored in enrollment
const paymentRes = await initiatePayment(req, res, {
    courseId,
    amount: 1000,
    coupon: "EMARE10"
});

// Verify enrollment has coupon metadata
const enrollment = await Enrollment.findOne({ studentRef: userId, courseRef: courseId });
console.assert(enrollment.metadata.coupon.code === "EMARE10");
console.assert(enrollment.paymentAmount === 900); // Final amount, not original
```

---

## Frontend Testing

### 1. Checkout Page Tests
**File**: `client/src/pages/student/Checkout.jsx`

#### Test Case 1: Apply Valid Coupon
1. Navigate to `/checkout/{courseId}` for a paid course (e.g., 1000 ETB)
2. Course loads with price: 1000 ETB
3. Enter coupon code "EMARE10" (or any valid 10% coupon)
4. Click "Apply" button
5. **Expected Results**:
   - ✅ Green success banner shows: "✓ Coupon Applied: EMARE10"
   - ✅ Original Price displays: 1000 ETB
   - ✅ Discount shows: -100 ETB (green text)
   - ✅ Final Price displays: 900 ETB (blue, bold)
   - ✅ "Remove" button visible in banner

#### Test Case 2: Remove Applied Coupon
1. Have coupon applied from Test Case 1
2. Click "Remove" button
3. **Expected Results**:
   - ✅ Green banner disappears
   - ✅ Coupon input field reappears
   - ✅ Code field is cleared
   - ✅ Discount and final price section reset to show only original price

#### Test Case 3: Invalid Coupon
1. Enter invalid code "NOTREAL123"
2. Click "Apply"
3. **Expected Results**:
   - ✅ Error message shows: "Invalid coupon code."
   - ✅ Discount section doesn't appear
   - ✅ No success banner

#### Test Case 4: Expired Coupon
1. Enter code for expired coupon "EXPIRED2026"
2. Click "Apply"
3. **Expected Results**:
   - ✅ Error message shows: "This coupon has expired."
   - ✅ No discount applied

#### Test Case 5: Coupon Below Minimum
1. Coupon "MIN500" requires $500+ purchase
2. Select course priced at 300 ETB
3. Enter "MIN500"
4. Click "Apply"
5. **Expected Results**:
   - ✅ Error message shows: "Minimum purchase amount for this coupon is 500 ETB."
   - ✅ No discount applied

#### Test Case 6: Pay with Coupon Applied
1. Apply valid coupon (e.g., EMARE10, 10% off 1000 ETB = 900 ETB final)
2. Click "Pay with Chapa"
3. Chapa window opens
4. **Expected Results**:
   - ✅ Chapa shows payment amount: 900 ETB (NOT 1000)
   - ✅ After successful payment, enrollment created with coupon metadata

### 2. Payment Page Tests
**File**: `client/src/pages/student/PaymentPage.jsx`

#### Test Case 1: Transaction with Coupon
1. View student's payment history after successful coupon payment
2. Look at "Recent Transactions" section
3. **Expected Results**:
   - ✅ Shows coupon code if one was used
   - ✅ Shows original amount (1000 ETB)
   - ✅ Shows discount amount (100 ETB)
   - ✅ Shows final paid amount (900 ETB)

#### Test Case 2: Transaction Without Coupon
1. View payment history for course without coupon
2. **Expected Results**:
   - ✅ Falls back to original price display
   - ✅ No coupon code shown
   - ✅ No discount displayed

---

## Admin Dashboard Testing

### 1. Coupon Management Page Tests
**File**: `client/src/pages/admin/Coupons.jsx`

#### Test Case 1: Statistics Display
1. Navigate to `/admin/coupons` page
2. **Expected Results**:
   - ✅ Statistics cards show:
     - Total Coupons: [number]
     - Active: [green number]
     - Expired: [red number]

#### Test Case 2: Generate Coupon Code
1. Click "Create Coupon" button
2. Click "Generate" button next to code field
3. **Expected Results**:
   - ✅ Random 8-character uppercase code appears (e.g., "ABC12XYZ")
   - ✅ Code is unique each time
   - ✅ Only alphanumeric characters

#### Test Case 3: Create Complete Coupon
1. Fill form with:
   - Code: "SPRING25" (or use Generate)
   - Discount Type: "Percentage"
   - Discount Value: "25"
   - Max Discount: "500"
   - Start Date: (tomorrow)
   - Expiration Date: (3 months from now)
   - Global Limit: "100"
   - Per-User Limit: "1"
   - Description: "25% off for spring semester courses"
2. Click "Create Coupon"
3. **Expected Results**:
   - ✅ Coupon appears in table
   - ✅ Shows code: SPRING25
   - ✅ Shows discount: 25% (max: 500)
   - ✅ Shows usage: 0/100
   - ✅ Shows expiration date
   - ✅ Status shows "Active"
   - ✅ Form clears for next coupon

#### Test Case 4: Create Fixed Discount Coupon
1. Fill form with:
   - Code: "SAVE200"
   - Discount Type: "Fixed Amount"
   - Discount Value: "200"
   - Per-User Limit: "2"
2. Click "Create Coupon"
3. **Expected Results**:
   - ✅ Table shows: 200 ETB
   - ✅ Max Discount field doesn't appear for fixed type

#### Test Case 5: Form Validation
1. Try to create with:
   - Empty code: Error "Coupon code is required"
   - Value: 0: Error "Discount value must be greater than 0"
   - Type: percent, Value: 150: Error "Percentage cannot exceed 100%"
2. **Expected Results**:
   - ✅ Each error displays appropriate message
   - ✅ Coupon not created

#### Test Case 6: View Coupon Details
1. Click "View" on any coupon row
2. **Expected Results**:
   - ✅ Navigates to coupon detail page
   - ✅ Shows all coupon information
   - ✅ May show usage records

#### Test Case 7: Pagination
1. If more than 25 coupons exist
2. Click "Next →" button
3. **Expected Results**:
   - ✅ Shows next 25 coupons
   - ✅ Page number updates
   - ✅ "Previous" button enabled

---

## End-to-End Testing Scenario

### Scenario: Complete Student Purchase with Coupon

1. **Admin Setup**:
   - Create coupon "EMARE10" (10% off, active, no expiration)

2. **Student Journey**:
   - Login as student
   - Browse courses
   - Click "Enroll" on "React Development" (1000 ETB)
   - Navigate to Checkout page
   - See price: 1000 ETB
   - Enter coupon: "EMARE10"
   - Click "Apply"
   - See discount: -100 ETB
   - See final price: 900 ETB
   - Click "Pay with Chapa"
   - Complete Chapa payment (900 ETB charged)
   - Return from Chapa
   - Enrollment status: "Cleared"
   - Course access granted

3. **Verification**:
   - Check Payment History page
   - See transaction shows:
     - Original: 1000 ETB
     - Coupon: EMARE10
     - Discount: -100 ETB
     - Paid: 900 ETB

4. **Admin Verification**:
   - Go to Admin > Coupon Management
   - Check coupon stats
   - View coupon "EMARE10"
   - Click "View"
   - See usage: 1/[limit]
   - See user who used it

---

## Error Scenarios to Test

### 1. Try to use coupon twice (if limit is 1)
- First use: ✅ Works
- Second use: ❌ "You have already used this coupon the maximum number of times."

### 2. Try to use expired coupon
- Error: ❌ "This coupon has expired."

### 3. Try to use inactive coupon
- Error: ❌ "This coupon is currently inactive."

### 4. Try to use coupon with wrong course
- If coupon restricted to "React Development" only
- Try to use on "Python Basics"
- Error: ❌ "This coupon is not valid for this course."

### 5. Try to use coupon below minimum purchase
- Coupon minimum: 500 ETB
- Course price: 300 ETB
- Error: ❌ "Minimum purchase amount for this coupon is 500 ETB."

### 6. Try to use when coupon limit reached
- Coupon limit: 5 total uses
- 5 students already used it
- Next student's attempt: ❌ "This coupon has reached its usage limit."

---

## Quick Test Checklist

### Backend
- [ ] Coupon validation accepts valid coupons
- [ ] Coupon validation rejects expired coupons
- [ ] Coupon validation checks minimum purchase amount
- [ ] Coupon validation checks per-user limits
- [ ] Enrollment stores coupon metadata
- [ ] Payment controller sets coupon metadata in enrollment
- [ ] Coupon usage recorded only after payment success

### Frontend - Checkout
- [ ] Coupon input visible
- [ ] Apply button works
- [ ] Invalid coupon shows error
- [ ] Valid coupon shows green success banner
- [ ] Remove button clears coupon
- [ ] Final price calculated correctly
- [ ] Payment made with final price (not original)

### Frontend - Payment History
- [ ] Shows coupon code if used
- [ ] Shows discount amount if coupon used
- [ ] Shows original and final amounts
- [ ] Falls back gracefully if no coupon

### Admin
- [ ] Statistics cards display
- [ ] Code generator works
- [ ] Create form validates
- [ ] Coupons appear in table
- [ ] Table shows all coupon info
- [ ] Pagination works

---

## Debugging Tips

### If coupon not applying:
1. Check browser console for errors
2. Check network tab - verify API call to `/api/payments/coupon`
3. Verify coupon exists in database (active, not expired)
4. Check coupon course restrictions
5. Verify course price >= minimum purchase amount

### If payment amount wrong:
1. Check `backend/controllers/paymentController.js` - initiatePayment()
2. Verify `finalAmount` is calculated correctly
3. Verify `couponMeta` is passed to Payment model
4. Check Chapa webhook receives correct amount

### If coupon not in transaction history:
1. Check Enrollment.metadata has coupon field
2. Verify payment controller updates enrollment with couponMeta
3. Check PaymentPage.jsx reads from enrollment.metadata.coupon

---

## Next Steps After Phase 1

- [ ] Create unit test file for couponService.js
- [ ] Create integration tests for payment + coupon flow
- [ ] Add rate limiting to coupon validation endpoint
- [ ] Create coupon edit/update UI
- [ ] Add coupon import/export functionality
- [ ] Document coupon business rules
- [ ] Create API documentation
- [ ] Performance testing with high coupon volumes
