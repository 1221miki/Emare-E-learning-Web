const assert = require('assert');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { test, before, after } = require('node:test');

const Coupon = require('../models/Coupon');
const CouponUsage = require('../models/CouponUsage');
const Transaction = require('../models/Transaction');
const couponService = require('../services/couponService');

let mongod;

before(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri, { dbName: 'test' });
});

after(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
});

test('coupon usage recorded idempotently and redeems obey limit', async () => {
    const userId = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();

    const coupon = await Coupon.create({ code: 'MEMO10', type: 'percent', value: 10, redeemLimit: 2, redeemedCount: 0, active: true });

    // create transaction
    let tx = await Transaction.create({ studentRef: userId, courseRef: courseId, amount: 100, metadata: { tx_ref: 'tx-memo-1', originalAmount: 100, discountAmount: 10 } });

    // First application should record
    let r = await couponService.recordUsageIfNeeded(coupon, tx);
    assert.strictEqual(r.ok, true);
    let usages = await CouponUsage.find({ couponRef: coupon._id });
    assert.strictEqual(usages.length, 1);
    let c = await Coupon.findById(coupon._id);
    assert.strictEqual(c.redeemedCount, 1);

    // Second call with same tx should be idempotent
    tx = await Transaction.findById(tx._id); // reload
    let r2 = await couponService.recordUsageIfNeeded(coupon, tx);
    assert.strictEqual(r2.ok, true);
    usages = await CouponUsage.find({ couponRef: coupon._id });
    assert.strictEqual(usages.length, 1);
    c = await Coupon.findById(coupon._id);
    assert.strictEqual(c.redeemedCount, 1);

    // New transaction should allow second redemption (limit 2)
    const tx2 = await Transaction.create({ studentRef: userId, courseRef: courseId, amount: 100, metadata: { tx_ref: 'tx-memo-2', originalAmount: 100, discountAmount: 10 } });
    const r3 = await couponService.recordUsageIfNeeded(coupon, tx2);
    assert.strictEqual(r3.ok, true);
    c = await Coupon.findById(coupon._id);
    assert.strictEqual(c.redeemedCount, 2);

    // Another transaction should fail due to limit
    const tx3 = await Transaction.create({ studentRef: userId, courseRef: courseId, amount: 100, metadata: { tx_ref: 'tx-memo-3', originalAmount: 100, discountAmount: 10 } });
    const r4 = await couponService.recordUsageIfNeeded(coupon, tx3);
    assert.strictEqual(r4.ok, false);
});
