require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Coupon = require('../models/Coupon');

async function seedCoupons() {
    try {
        // Validate MongoDB URI
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI not found in environment variables');
        }

        // Connect to MongoDB
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Clear existing coupons (optional - comment out to keep existing)
        // await Coupon.deleteMany({});
        // console.log('🗑️  Cleared existing coupons');

        // Create test coupons
        const coupons = [
            {
                code: 'EMARE10',
                type: 'percent',
                value: 10,
                maxDiscount: 0,
                appliesTo: {
                    allCourses: true,
                    courseIds: [],
                    minimumPurchaseAmount: 0
                },
                startsAt: new Date('2024-01-01'),
                expiresAt: new Date('2026-12-31'), // Far future date
                redeemLimit: 1000, // Plenty of uses
                usageLimitPerUser: 10, // Can use 10 times per user
                redeemedCount: 0,
                active: true,
                metadata: {
                    description: 'Welcome discount - 10% off for all students',
                    displayName: 'EMARE10 - 10% off'
                }
            },
            {
                code: 'WELCOME20',
                type: 'percent',
                value: 20,
                maxDiscount: 5000, // Max 5000 ETB discount
                appliesTo: {
                    allCourses: true,
                    courseIds: [],
                    minimumPurchaseAmount: 5000 // Min 5000 ETB purchase
                },
                startsAt: new Date('2024-01-01'),
                expiresAt: new Date('2026-12-31'),
                redeemLimit: 500,
                usageLimitPerUser: 1, // Only once per user
                redeemedCount: 0,
                active: true,
                metadata: {
                    description: '20% off for purchases over 5000 ETB',
                    displayName: 'WELCOME20 - 20% off'
                }
            },
            {
                code: 'SUMMER2024',
                type: 'fixed',
                value: 2000, // Fixed 2000 ETB discount
                appliesTo: {
                    allCourses: true,
                    courseIds: [],
                    minimumPurchaseAmount: 3000
                },
                startsAt: new Date('2024-06-01'),
                expiresAt: new Date('2026-09-30'),
                redeemLimit: 300,
                usageLimitPerUser: 1,
                redeemedCount: 0,
                active: true,
                metadata: {
                    description: 'Summer special - 2000 ETB off',
                    displayName: 'SUMMER2024'
                }
            }
        ];

        // Insert or update coupons
        for (const couponData of coupons) {
            const existing = await Coupon.findOne({ code: couponData.code });
            if (existing) {
                // Update existing coupon
                await Coupon.findByIdAndUpdate(existing._id, couponData, { new: true });
                console.log(`✅ Updated coupon: ${couponData.code}`);
            } else {
                // Create new coupon
                await Coupon.create(couponData);
                console.log(`✅ Created coupon: ${couponData.code}`);
            }
        }

        // Display all coupons
        const allCoupons = await Coupon.find().lean();
        console.log('\n📋 All coupons:');
        console.table(allCoupons.map(c => ({
            Code: c.code,
            Type: c.type,
            Value: c.value,
            Active: c.active,
            ExpiresAt: c.expiresAt?.toISOString().split('T')[0],
            RedeemLimit: c.redeemLimit,
            Redeemed: c.redeemedCount
        })));

        console.log('\n✨ Coupon seeding completed!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error seeding coupons:', err.message);
        process.exit(1);
    }
}

seedCoupons();
