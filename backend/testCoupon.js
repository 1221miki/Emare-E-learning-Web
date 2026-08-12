/**
 * Test coupon validation and application
 * Run with: node testCoupon.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Coupon = require('./models/Coupon');

async function testCoupon() {
    try {
        console.log('🧪 Testing Coupon System...\n');

        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) throw new Error('MONGODB_URI not set');
        
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB\n');

        // 1. Check if EMARE10 exists
        console.log('1️⃣  Checking for EMARE10 coupon:');
        const emare10 = await Coupon.findOne({ code: 'EMARE10' }).lean();
        if (emare10) {
            console.log('✅ EMARE10 found:');
            console.log(`   Code: ${emare10.code}`);
            console.log(`   Type: ${emare10.type}`);
            console.log(`   Value: ${emare10.value}`);
            console.log(`   Active: ${emare10.active}`);
            console.log(`   Expires: ${emare10.expiresAt?.toISOString().split('T')[0] || 'Never'}`);
            console.log(`   Redeem Limit: ${emare10.redeemLimit || 'Unlimited'}`);
            console.log(`   Redeemed: ${emare10.redeemedCount || 0}`);
        } else {
            console.log('❌ EMARE10 not found');
        }

        // 2. List all active coupons
        console.log('\n2️⃣  List all active coupons:');
        const activeCoupons = await Coupon.find({ active: true }).lean();
        console.log(`Found ${activeCoupons.length} active coupon(s):`);
        activeCoupons.forEach(c => {
            const discount = c.type === 'percent' ? `${c.value}%` : `${c.value} ETB`;
            const expires = c.expiresAt ? new Date(c.expiresAt).toISOString().split('T')[0] : 'No expiry';
            const limit = c.redeemLimit === 0 ? 'Unlimited' : c.redeemLimit;
            console.log(`  ✓ ${c.code}: ${discount} off | Expires: ${expires} | Uses: ${c.redeemedCount}/${limit}`);
        });

        // 3. Validate EMARE10 coupon
        console.log('\n3️⃣  Validating EMARE10 with couponService:');
        const couponService = require('./services/couponService');
        const validation = await couponService.validateCoupon('EMARE10', null, null, 1000);
        if (validation.valid) {
            console.log('✅ EMARE10 is VALID');
            console.log(`   Discount on 1000 ETB: ${validation.discountAmount} ETB`);
            console.log(`   Final amount: ${validation.finalAmount} ETB`);
        } else {
            console.log('❌ EMARE10 is INVALID:', validation.message);
        }

        // 4. Test with specific course price
        console.log('\n4️⃣  Validating EMARE10 with course price 1500 ETB:');
        const validation2 = await couponService.validateCoupon('EMARE10', null, null, 1500);
        if (validation2.valid) {
            console.log('✅ EMARE10 is VALID');
            console.log(`   Discount on 1500 ETB: ${validation2.discountAmount} ETB`);
            console.log(`   Final amount: ${validation2.finalAmount} ETB`);
        } else {
            console.log('❌ EMARE10 is INVALID:', validation2.message);
        }

        console.log('\n✨ Coupon tests completed!');
        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

testCoupon();
