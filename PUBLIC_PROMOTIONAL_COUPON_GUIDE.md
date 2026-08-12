# 🎉 PUBLIC PROMOTIONAL COUPON SYSTEM - IMPLEMENTATION GUIDE

## Overview

The **Public Promotional Coupon System** enables admins to create discount codes that are communicated to students through various channels. This is the most common coupon model for educational platforms.

**Key Principle**: 
- ✅ **Admins create coupons** (not students)
- ✅ **Admins communicate codes** via email, announcements, SMS, etc.
- ✅ **Students apply codes** at checkout
- ✅ **System validates and applies discounts** automatically

---

## Architecture

### Public vs Private vs Individual Coupons

| Type | Example | Use Case | Visibility |
|------|---------|----------|------------|
| **Public Promo** | EMARE10 | 10% off for all students | Everyone sees it |
| **Private Promo** | PARTNER20 | Partner organization discount | Specific group sees it |
| **Individual** | DBU-ASAMN-10 | Student-specific coupon | Only that student |

**Phase 1 Implementation**: Public promotional coupons (simplest, most useful)

---

## How It Works - Complete Flow

### 1️⃣ ADMIN CREATES COUPON

**Location**: Admin Dashboard → Coupon Management → Create Coupon

**Admin fills in**:
```
Code:              EMARE10
Type:              Percentage (%)
Discount:          10
Max Discount:      500 ETB
Start Date:        Aug 12, 2026
Expires:           Sep 12, 2026
Global Limit:      100 (uses total)
Per-User Limit:    1 (each student uses max 1x)
Description:       10% off all web development courses
```

**Backend saves**:
- ✅ Coupon document in database
- ✅ All validation rules
- ✅ Active status
- ✅ Metadata for description

**Admin Dashboard shows**:
- ✅ Coupon in table with status
- ✅ Usage statistics (2/100 used so far)
- ✅ Copy button (📋) for easy sharing
- ✅ Share button (📤) with templates

---

### 2️⃣ ADMIN DISTRIBUTES THE CODE

**Admin clicks "Share" button and sees templates ready to copy**:

#### Email Template
```
Subject: Use Coupon Code EMARE10 - 10% off

Hi Students,

We're offering an exclusive discount! Use coupon code:

EMARE10

to get 10% off on our courses.

10% off all web development courses
Valid until: 8/12/2026

Start learning now!
```

#### SMS Template
```
🎉 10% off on courses! Use code: EMARE10 (Expires 8/12/2026)
```

#### Announcement Template
```
📢 **SPECIAL OFFER** 📢

Get 10% off on our courses!

🎓 **Coupon Code:** EMARE10

10% off all web development courses

⏰ Valid until: 8/12/2026

👉 Apply coupon at checkout
```

#### WhatsApp Template
```
🎉 SPECIAL DISCOUNT! 🎉

10% off on all our courses!

📌 Use this coupon code: *EMARE10*

10% off all web development courses
Valid until: 8/12/2026

Start learning now! 🚀
```

**Admin can**:
- ✅ Copy each template with one click
- ✅ Paste into email client
- ✅ Send via platform announcements
- ✅ Share in WhatsApp groups
- ✅ Post on social media
- ✅ Include in SMS campaigns

---

### 3️⃣ STUDENTS SEE PROMOTIONS

#### Option A: On Homepage Banner
```
🎉 Active Promotions

EMARE10 - 10% off (Expires Aug 12)
[📋 Copy Code]

WELCOME20 - 20% off (Expires Sep 1)
[📋 Copy Code]

DBU50 - 50 ETB off (Expires Aug 30)
[📋 Copy Code]

💡 Use these codes at checkout for instant savings!
```

#### Option B: In Email Notification
Student receives email with code directly

#### Option C: In Announcement
Student sees announcement in platform

#### Option D: On Checkout Page
Student sees available codes while making purchase

---

### 4️⃣ STUDENT USES COUPON

**Student navigates to Checkout**:
```
Course: React Development
Price: 1000 ETB

[Enter coupon code] [Apply]

If they have EMARE10:
✅ Success banner: "Coupon Applied: EMARE10"
💚 Discount: -100 ETB (10%)
💙 Final Price: 900 ETB
[Remove Coupon] button
```

**System validates**:
- ✅ Code exists
- ✅ Not expired
- ✅ Not at global limit
- ✅ Student hasn't used this coupon before (per-user limit)
- ✅ Course eligible (if restrictions set)
- ✅ Above minimum purchase (if set)

**If all checks pass**:
- ✅ Show discount breakdown
- ✅ Display final price
- ✅ Allow payment with discounted amount

**If validation fails**:
- ❌ Show friendly error message
- ❌ Examples: "Coupon expired", "Already used", "Limit reached"

---

### 5️⃣ PAYMENT & VERIFICATION

**Student clicks "Pay with Chapa"**:
```
Final Amount: 900 ETB (with discount)
```

**Backend**:
- ✅ Calculates final amount server-side (untrusted frontend)
- ✅ Creates payment with coupon metadata
- ✅ Sends to Chapa with correct amount

**After payment success**:
- ✅ Records coupon usage in database
- ✅ Increments coupon.redeemedCount
- ✅ Stores coupon details in enrollment.metadata
- ✅ Marks transaction with coupon info

**Student gets**:
- ✅ Course access
- ✅ Receipt showing discount
- ✅ Payment history displays coupon code and discount

---

## IMPLEMENTATION CHECKLIST

### Backend ✅
- [x] Coupon model with all fields
- [x] Coupon validation service
- [x] Admin coupon CRUD endpoints
- [x] **NEW**: Public `/api/coupons/active` endpoint
- [x] Payment integration (store coupon in enrollment)
- [x] Coupon usage tracking
- [x] Database indexes for performance

### Frontend ✅
- [x] Admin coupon dashboard
- [x] **NEW**: Copy code button (📋)
- [x] **NEW**: Share templates modal (📤)
- [x] Student checkout page with coupon input
- [x] Student payment history showing coupons
- [x] **NEW**: PromotionsBanner component
- [x] API service for fetching active promotions

### Features Included ✅
- [x] Admin creates coupons (CRUD)
- [x] Admin manages coupon lifecycle (active/inactive)
- [x] Admin sees usage statistics
- [x] Admin has copy-to-clipboard for codes
- [x] Admin has email/SMS/announcement templates
- [x] Students see all active promotions
- [x] Students apply codes at checkout
- [x] Students see discount preview before payment
- [x] Students can remove applied coupons
- [x] System validates all rules server-side
- [x] Payment shows final amount (with discount)
- [x] Transaction history shows coupon used

---

## API ENDPOINTS

### Admin Endpoints (Protected, Admin only)
```
POST   /api/admin/coupons                    Create coupon
GET    /api/admin/coupons                    List coupons (paginated)
GET    /api/admin/coupons/stats              Get statistics
GET    /api/admin/coupons/:id                Get coupon details
PUT    /api/admin/coupons/:id                Update coupon
PATCH  /api/admin/coupons/:id/status         Toggle active/inactive
DELETE /api/admin/coupons/:id                Delete coupon
GET    /api/admin/coupons/:id/usage          View usage records
```

### Student Endpoints (Public, no auth required)
```
GET    /api/coupons/active                   Get all active promotions
POST   /api/payments/coupon                  Validate coupon
POST   /api/payments/initiate                Start payment (with coupon)
```

---

## DATABASE SCHEMA

### Coupon Model
```javascript
{
  _id: ObjectId,
  code: String (unique, uppercase),
  type: 'percent' | 'fixed',
  value: Number,
  maxDiscount: Number (optional, for percentages),
  
  // Validity
  startsAt: Date (optional),
  expiresAt: Date (optional),
  
  // Limits
  redeemLimit: Number (0 = unlimited),
  redeemedCount: Number (tracks usage),
  usageLimitPerUser: Number (1 = max 1 use per student),
  
  // Status
  active: Boolean,
  
  // Application rules
  appliesTo: {
    allCourses: Boolean,
    courseIds: [ObjectId],
    categoryIds: [ObjectId],
    minimumPurchaseAmount: Number
  },
  
  // Metadata
  metadata: {
    description: String,
    createdBy: ObjectId (admin),
    lastModifiedBy: ObjectId
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

### CouponUsage Model
```javascript
{
  _id: ObjectId,
  couponRef: ObjectId (Coupon),
  studentRef: ObjectId (User),
  transactionRef: ObjectId (Transaction),
  
  originalAmount: Number (price before discount),
  discountAmount: Number (amount saved),
  finalAmount: Number (amount paid),
  
  status: 'applied' | 'failed',
  redeemedAt: Date,
  
  metadata: { /* flexible for future expansion */ }
}
```

### Enrollment Model (Updated)
```javascript
{
  _id: ObjectId,
  studentRef: ObjectId,
  courseRef: ObjectId,
  paymentStatus: 'Unpaid' | 'Pending Verification' | 'Cleared',
  paymentAmount: Number,
  paymentReference: String,
  
  // NEW: Stores coupon details
  metadata: {
    coupon: {
      code: String,
      discountAmount: Number,
      originalAmount: Number
    }
  },
  
  enrolledAt: Date
}
```

---

## HOW TO USE IN YOUR APPLICATION

### 1. Display Promotions on Homepage
```jsx
import PromotionsBanner from './components/PromotionsBanner';

export default function HomePage() {
  return (
    <div>
      <h1>Welcome to Emare E-Learning</h1>
      {/* Show all active promotions with copy buttons */}
      <PromotionsBanner />
      {/* Rest of homepage */}
    </div>
  );
}
```

### 2. Display in Checkout
```jsx
import PromotionsBanner from './components/PromotionsBanner';

export default function CheckoutPage() {
  const handleCouponClick = (code) => {
    // Auto-fill coupon input when student clicks "Copy Code"
    setCouponCode(code);
  };

  return (
    <div>
      {/* Show minimal promotions */}
      <PromotionsBanner minimal={true} onCouponClick={handleCouponClick} />
      
      {/* Coupon input form */}
      <input value={couponCode} placeholder="Enter coupon code" />
      <button onClick={applyCoupon}>Apply</button>
    </div>
  );
}
```

### 3. Display in Sidebar
```jsx
<PromotionsBanner minimal={true} />
```

### 4. Create Admin Coupon
```jsx
// Admin dashboard
const couponData = {
  code: 'EMARE10',
  type: 'percent',
  value: 10,
  maxDiscount: 500,
  redeemLimit: 100,
  usageLimitPerUser: 1,
  startsAt: '2026-08-12',
  expiresAt: '2026-09-12',
  active: true,
  metadata: { description: '10% off web development courses' }
};

await adminCouponService.create(couponData);
```

### 5. Fetch Active Promotions (Frontend)
```jsx
import { promotionService } from './services/api';

const promotions = await promotionService.getActivePromotions();
// Returns: [{ code, type, value, maxDiscount, expiresAt, ... }]
```

---

## STUDENT EXPERIENCE - COMPLETE FLOW

### Scenario: Student uses EMARE10 coupon

1. **Student sees promotion**
   - On homepage banner, OR
   - In email notification, OR
   - In announcement, OR
   - On checkout page

2. **Student learns code is EMARE10**
   - Clicks "Copy Code" button
   - Or manually enters it

3. **Student goes to checkout**
   - Adds course to cart
   - Navigates to checkout page
   - Sees "Enter coupon code" field
   - Pastes or enters EMARE10
   - Clicks "Apply"

4. **Coupon validated**
   - Server checks all rules
   - Code valid? ✅
   - Not expired? ✅
   - Student hasn't used it? ✅
   - Limit not reached? ✅
   - Returns discount amount

5. **Student sees discount**
   - Original Price: 1000 ETB
   - Discount: -100 ETB
   - Final Price: 900 ETB
   - "Remove Coupon" button available

6. **Student pays**
   - Clicks "Pay with Chapa"
   - Chapa shows 900 ETB (discounted amount)
   - Student completes payment
   - Gets course access

7. **Receipt & History**
   - Email receipt shows: "Paid 900 ETB (10% off with EMARE10)"
   - Payment history shows coupon code and discount
   - Student profile shows usage

---

## ADMIN EXPERIENCE - COMPLETE FLOW

### Scenario: Admin creates and shares EMARE10

1. **Admin creates coupon**
   - Goes to Admin Dashboard
   - Coupon Management → Create Coupon
   - Fills all fields
   - Saves

2. **Admin sees it in table**
   - Shows: EMARE10 | 10% | 0/100 | Aug 31 | Active
   - Has buttons: Copy | Share | View

3. **Admin shares coupon**
   - Clicks "Share" button
   - Sees Email, SMS, Announcement, WhatsApp templates
   - Copies email template
   - Pastes into email client
   - Sends to student mailing list

4. **Admin tracks usage**
   - Returns to coupon table
   - Sees usage update in real-time
   - EMARE10 now shows: 15/100 used
   - Can click "View" to see which students used it

5. **Admin can edit**
   - Change discount value
   - Extend expiration
   - Adjust limits
   - Activate/deactivate
   - Delete when done

---

## VALIDATION RULES (Server-Side)

When student applies coupon, system validates:

✅ **Code exists**
- "Invalid coupon code." if not found

✅ **Coupon is active**
- "This coupon is currently inactive." if disabled

✅ **Start date passed**
- "This coupon is not available yet." if starts in future

✅ **Not expired**
- "This coupon has expired." if past end date

✅ **Global limit not reached**
- "This coupon has reached its usage limit." if redeemLimit exceeded

✅ **Minimum purchase met**
- "Minimum purchase amount for this coupon is 500 ETB." if below minimum

✅ **Course eligible** (if restricted)
- "This coupon is not valid for this course." if course not in allowed list

✅ **Per-user limit not exceeded**
- "You have already used this coupon the maximum number of times." if student already used it

All validation done on **backend only** (frontend cannot be trusted).

---

## SECURITY FEATURES

✅ **Server-side price calculation**
- Backend calculates final amount
- Frontend never sends amount
- Backend rejects mismatches

✅ **Coupon usage recording**
- Recorded only after successful payment
- Using webhook verification from payment provider
- Idempotent (prevents double-counting)

✅ **Atomic transactions**
- Increment redeemedCount atomically
- Create CouponUsage record atomically
- No race conditions

✅ **Metadata storage**
- Coupon details stored with transaction
- Enables history even if coupon deleted
- Audit trail of all discounts given

✅ **Admin-only creation**
- Students cannot create coupons
- Only authenticated admins can manage
- All changes logged

---

## FUTURE ENHANCEMENTS (Phase 2+)

📋 **Coupon Statistics**
- Revenue impact per coupon
- Most used coupons
- Discount trends over time

📧 **Email Integration**
- Auto-send coupon via email
- Template management
- Scheduled distribution

🎯 **Targeted Coupons**
- Course-specific coupons
- Category-specific coupons
- Student-specific coupons
- Role-based coupons (instructor discount, etc.)

📊 **Analytics Dashboard**
- Coupon ROI calculation
- Student acquisition cost
- Redemption rates
- Revenue attribution

🔄 **Bulk Operations**
- Import coupons from CSV
- Export usage reports
- Bulk status updates

⚡ **Advanced Features**
- Stacking multiple coupons
- Coupon combinations
- Tiered discounts
- Time-limited flash sales

---

## TROUBLESHOOTING

### Problem: Coupon not showing in promotions
**Solution**: Check if coupon is `active: true` and not expired

### Problem: Student can't apply coupon
**Solutions**:
1. Check coupon hasn't reached global limit
2. Verify student hasn't already used it
3. Confirm course is eligible
4. Check if above minimum purchase amount
5. Verify coupon dates (starts/expires)

### Problem: Discount amount wrong
**Cause**: Frontend cannot calculate prices
**Solution**: Check backend calculateDiscount() function in couponService.js

### Problem: Coupon used but not showing in history
**Solution**: Verify payment webhook was received and processed

---

## TESTING

### Test Cases for Public Promotions

#### Admin Tests
- [ ] Create coupon with all fields
- [ ] Generate random code
- [ ] Copy code to clipboard
- [ ] View sharing templates
- [ ] Copy email template
- [ ] Copy SMS template
- [ ] Edit coupon
- [ ] Toggle active/inactive
- [ ] View usage statistics
- [ ] See which students used it

#### Student Tests
- [ ] See promotions on homepage
- [ ] Copy coupon code
- [ ] Apply coupon at checkout
- [ ] See discount preview
- [ ] Remove applied coupon
- [ ] Pay with discount
- [ ] See coupon in payment history
- [ ] Try expired coupon (should fail)
- [ ] Try limit-reached coupon (should fail)
- [ ] Try using twice (should fail on 2nd)

#### E2E Test
1. Admin creates "TEST50" (50% off, max 100 uses)
2. Admin shares code via email template
3. Student sees promotion on homepage
4. Student copies code
5. Student applies at checkout
6. Student pays with discount
7. Student sees coupon in history
8. Admin sees usage updated
9. Repeat step 4-8 with second student
10. Verify usage shows 2/100

---

## SUMMARY

The **Public Promotional Coupon System** is now fully implemented:

✅ **Admins** can create, share, and manage coupons  
✅ **Students** can discover and use coupons  
✅ **System** validates everything server-side  
✅ **Discounts** applied automatically and tracked  
✅ **History** shows all coupon usage  

**Ready for**: Email campaigns, SMS blasts, homepage promotions, course discounts, marketing initiatives

**Next Phase**: Add targeted/private/individual coupons when needed

---

**Questions?** Refer to:
- PHASE1_IMPLEMENTATION_SUMMARY.md - Technical details
- PHASE1_TEST_GUIDE.md - Testing procedures
- Code comments in couponService.js, Coupons.jsx, PromotionsBanner.jsx
