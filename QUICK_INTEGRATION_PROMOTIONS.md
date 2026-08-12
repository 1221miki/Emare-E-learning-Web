# 🚀 QUICK INTEGRATION GUIDE - Adding Promotions to Your Pages

## What Was Added

### Backend
✅ New route: `GET /api/coupons/active` - Public endpoint  
✅ Returns all active, non-expired coupons  
✅ Handles global and per-user limits automatically  

### Frontend
✅ New component: `PromotionsBanner.jsx`  
✅ New service: `promotionService.getActivePromotions()`  
✅ Can display as full banner or minimal sidebar  
✅ Copy-to-clipboard functionality  
✅ No authentication needed  

### Admin Enhancement
✅ Copy Code button (📋) in coupon table  
✅ Share Templates modal (📤) with email/SMS/announcement/WhatsApp  
✅ One-click copy for easy sharing  

---

## WHERE TO ADD PROMOTIONS BANNER

### 1. Homepage (Most Important)
**File**: `client/src/pages/LandingPage.jsx` or similar

```jsx
import PromotionsBanner from '../components/PromotionsBanner';

export default function HomePage() {
  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Hero Section */}
      <div style={{ marginBottom: '40px' }}>
        <h1>Welcome to Emare E-Learning</h1>
        <p>Learn from expert instructors</p>
      </div>

      {/* 👇 ADD THIS 👇 */}
      <PromotionsBanner />

      {/* Featured Courses Section */}
      <div style={{ marginTop: '40px' }}>
        <h2>Featured Courses</h2>
        {/* courses grid */}
      </div>
    </div>
  );
}
```

### 2. Checkout Page (Very Important)
**File**: `client/src/pages/student/Checkout.jsx`

```jsx
import PromotionsBanner from '../../components/PromotionsBanner';

export default function CheckoutPage() {
  const [couponCode, setCouponCode] = useState('');

  const handleCouponFromPromo = (code) => {
    setCouponCode(code);
    // Optionally auto-apply it
    handleApplyCoupon(code);
  };

  return (
    <div style={{ padding: '24px' }}>
      <h1>Complete Your Purchase</h1>

      {/* 👇 ADD THIS 👇 - Show minimal promotions */}
      <PromotionsBanner 
        minimal={true} 
        onCouponClick={handleCouponFromPromo}
      />

      {/* Existing coupon input */}
      <div style={{ marginTop: '20px' }}>
        <label>Have a coupon code?</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="Enter coupon code"
            style={{ flex: 1, padding: '10px' }}
          />
          <button onClick={handleApplyCoupon}>Apply</button>
        </div>
      </div>

      {/* Rest of checkout form */}
    </div>
  );
}
```

### 3. Student Dashboard Sidebar
**File**: `client/src/pages/student/StudentDashboard.jsx`

```jsx
import PromotionsBanner from '../../components/PromotionsBanner';

export default function StudentDashboard() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: 24 }}>
      
      {/* Sidebar */}
      <div style={{ 
        background: colors.bgCard, 
        padding: '16px', 
        borderRadius: '12px'
      }}>
        <h3>Navigation</h3>
        <ul>{/* nav items */}</ul>

        {/* 👇 ADD THIS 👇 - Minimal promotions in sidebar */}
        <div style={{ marginTop: '20px' }}>
          <PromotionsBanner minimal={true} />
        </div>
      </div>

      {/* Main Content */}
      <div>
        {/* courses, enrollments, etc */}
      </div>
    </div>
  );
}
```

### 4. Courses Listing Page
**File**: `client/src/pages/Courses.jsx` or `ExploreCourses.jsx`

```jsx
import PromotionsBanner from '../components/PromotionsBanner';

export default function CoursesPage() {
  return (
    <div style={{ padding: '24px' }}>
      <h1>Browse Courses</h1>

      {/* 👇 ADD THIS 👇 - Show full promotions */}
      <PromotionsBanner />

      {/* Filters & Grid */}
      <div style={{ marginTop: '40px' }}>
        <h2>All Courses</h2>
        {/* courses grid */}
      </div>
    </div>
  );
}
```

### 5. Payment History Page
**File**: `client/src/pages/student/PaymentPage.jsx`

```jsx
import PromotionsBanner from '../../components/PromotionsBanner';

export default function PaymentPage() {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <h1>Payment History</h1>

      {/* 👇 ADD THIS 👇 - Minimal banner to promote other codes */}
      <PromotionsBanner minimal={true} />

      {/* Transaction History */}
      <div style={{ marginTop: '24px' }}>
        {/* transactions list */}
      </div>
    </div>
  );
}
```

---

## COMPONENT PROPS REFERENCE

### PromotionsBanner Props

```jsx
<PromotionsBanner 
  // Optional: Show minimal version (for sidebars, small spaces)
  minimal={false}  // default: false = full banner
  
  // Optional: Callback when student clicks a coupon code
  onCouponClick={(code) => {
    // Handle coupon selection
    // E.g., auto-fill coupon input, navigate to checkout, etc.
  }}
/>
```

### Examples

**Full Banner (Homepage)**:
```jsx
<PromotionsBanner />
```

**Minimal Sidebar**:
```jsx
<PromotionsBanner minimal={true} />
```

**With Auto-Fill on Checkout**:
```jsx
<PromotionsBanner 
  minimal={true}
  onCouponClick={(code) => {
    setCouponCode(code);
    applyCoupon(code);
  }}
/>
```

---

## NO CHANGES NEEDED TO

✅ Backend Payment flow - already handles coupons  
✅ Coupon validation - already works  
✅ Database - no migrations needed  
✅ Admin coupon creation - enhanced with copy/share features  
✅ Student checkout - already accepts coupons  
✅ Existing API endpoints - all working  

---

## TESTING AFTER INTEGRATION

### Backend Test
```bash
curl http://localhost:5000/api/coupons/active
```

Expected response:
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "code": "EMARE10",
      "type": "percent",
      "value": 10,
      "maxDiscount": 500,
      "expiresAt": "2026-09-12T00:00:00Z",
      "metadata": { "description": "..." }
    }
  ]
}
```

### Frontend Test
1. Add PromotionsBanner to homepage
2. Create a test coupon via admin dashboard (e.g., "TEST50")
3. Refresh homepage
4. Banner should appear with TEST50
5. Click "Copy Code"
6. Should see "✓ Copied!" feedback
7. Paste code at checkout
8. Should validate and apply discount

---

## STYLING NOTES

PromotionsBanner uses your app's `ThemeContext`:
```jsx
const { colors } = useTheme();
// Uses: colors.bg, colors.bgCard, colors.border, colors.text, colors.textMuted
```

If you want custom styling:

**Override gradients**:
```jsx
// In PromotionsBanner.jsx, line ~50
background: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
// Change to your brand colors
```

**Minimal variant background**:
```jsx
// Currently purple gradient, can change to:
background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'  // Green
background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)'  // Blue
background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'  // Orange
```

---

## PERFORMANCE

PromotionsBanner:
- ✅ Loads active coupons once on mount
- ✅ Caches data (no real-time refresh)
- ✅ Handles empty state (no banner if no promotions)
- ✅ Uses CSS transitions (smooth, performant)
- ✅ No infinite loops or memory leaks

---

## COMMON SCENARIOS

### Scenario 1: Student sees promotion, applies coupon
1. Student visits homepage
2. Sees "EMARE10 - 10% off"
3. Clicks "📋 Copy Code"
4. Navigates to course
5. Clicks "Enroll"
6. Taken to checkout
7. Pastes EMARE10 in coupon field
8. Clicks "Apply"
9. Sees discount applied
10. Pays with discount

### Scenario 2: Admin shares multiple coupons
1. Admin creates "BACK50" (back-to-school)
2. Admin creates "WEEKEND20" (weekend only)
3. Admin creates "REFER10" (referral program)
4. Homepage banner shows all 3
5. Students can copy whichever applies to them

### Scenario 3: Limited-time flash sale
1. Admin creates "FLASH30" (30% off, 50 uses, expires today)
2. Adds to announcement
3. Students see it on homepage
4. First 50 students get discount
5. 51st student sees "Limit reached"
6. Admin deactivates coupon after 12 hours

---

## ADMIN WORKFLOW

### Create & Share Coupon

1. **Go to**: Admin Dashboard → Coupon Management
2. **Click**: "+ Create Coupon"
3. **Fill in**:
   - Code: "EMARE10" (or click "Generate")
   - Discount: 10%
   - Expires: Sep 12, 2026
   - Global Limit: 100
   - Per-User: 1
   - Description: "10% off all web development courses"
4. **Click**: "Create Coupon"
5. **See**: Coupon in table
6. **Click**: "📤 Share" button
7. **Copy**: Email template
8. **Send**: Via email, announcement, SMS, etc.

### Monitor Usage

1. **Go to**: Coupon Management
2. **See**: "EMARE10 - 25/100 used"
3. **Click**: "📤 Share" to see usage info
4. **Click**: "View" to see which students used it

---

## TROUBLESHOOTING

### PromotionsBanner not showing
**Check**:
- Are there any active coupons in database?
- Are they marked `active: true`?
- Are they not expired?
- Check browser console for errors

### Can't copy code
**Check**:
- Browser supports `navigator.clipboard.writeText()`
- No console errors
- Try refreshing page

### Promotions don't update in real-time
**Note**: This is by design
- PromotionsBanner loads on component mount
- Doesn't auto-refresh every X seconds
- Refresh page to see new coupons
- Can add auto-refresh if needed (see code comments)

---

## NEXT STEPS

1. ✅ **Add PromotionsBanner to key pages** (above)
2. ✅ **Test coupon creation and copy** (admin panel)
3. ✅ **Test coupon application** (checkout)
4. ✅ **Monitor usage** (admin stats)
5. 📅 **Phase 2**: Add targeted/private coupons
6. 📅 **Phase 3**: Coupon analytics dashboard
7. 📅 **Phase 4**: Email campaign integration

---

## SUMMARY

**Public Promotional Coupons are now fully integrated:**

✅ Admins create and share codes  
✅ Students discover promotions  
✅ Students apply coupons at checkout  
✅ System tracks usage automatically  
✅ Payment history shows coupons used  

**Your e-learning platform now has a complete discount system!** 🎉

---

**Questions?** See:
- PUBLIC_PROMOTIONAL_COUPON_GUIDE.md - Detailed flow
- PHASE1_IMPLEMENTATION_SUMMARY.md - Technical details
- Code comments in PromotionsBanner.jsx
