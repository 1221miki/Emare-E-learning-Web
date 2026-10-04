const mongoose = require('mongoose');
const Coupon = require('../models/Coupon');
const CouponUsage = require('../models/CouponUsage');
const { validateCoupon, calculateDiscount } = require('../services/couponService');

describe('couponService unit tests (basic)', () => {
    beforeAll(async () => {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/emare_test', { useNewUrlParser: true, useUnifiedTopology: true });
        await Coupon.deleteMany({});
        await CouponUsage.deleteMany({});
    });
    afterAll(async () => {
        await mongoose.connection.close();
    });

    test('calculate percent discount', async () => {
        const c = { type: 'percent', value: 10, maxDiscount: 0 };
        const r = await calculateDiscount(c, 1000);
        expect(r.discountAmount).toBe(100);
        expect(r.finalAmount).toBe(900);
    });

    test('calculate fixed discount', async () => {
        const c = { type: 'fixed', value: 150 };
        const r = await calculateDiscount(c, 1000);
        expect(r.discountAmount).toBe(150);
        expect(r.finalAmount).toBe(850);
    });
});
