const Coupon = require('../models/Coupon');
const CouponUsage = require('../models/CouponUsage');
const { audit } = require('../utils/auditLogger');

// @desc List coupons with pagination, search and filters
// @route GET /api/admin/coupons
// @access Admin
exports.listCoupons = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page || '1'));
        const limit = Math.min(100, parseInt(req.query.limit || '25'));
        const skip = (page - 1) * limit;

        const q = req.query.q ? String(req.query.q).trim() : '';
        const filter = {};
        if (req.query.active === 'true') filter.active = true;
        if (req.query.active === 'false') filter.active = false;
        if (req.query.type) filter.type = req.query.type;
        if (req.query.expired === 'true') filter.expiresAt = { $lte: new Date() };
        if (req.query.expired === 'false') filter.$or = [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }];

        if (q) filter.$or = filter.$or || [], filter.$or.push({ code: { $regex: q, $options: 'i' } }, { 'metadata.description': { $regex: q, $options: 'i' } });

        const total = await Coupon.countDocuments(filter);
        const coupons = await Coupon.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
        res.json({ success: true, data: { items: coupons, total, page, limit } });
    } catch (err) {
        console.error('listCoupons', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc Create coupon
// @route POST /api/admin/coupons
// @access Admin
exports.createCoupon = async (req, res) => {
    try {
        const payload = req.body;
        if (payload.code) payload.code = String(payload.code).trim().toUpperCase();
        const coupon = await Coupon.create({ ...payload, createdBy: req.user._id });
        audit.enrollment && audit.enrollment({ req, user: req.user, action: 'COUPON_CREATED', description: `Coupon ${coupon.code} created`, targetType: 'Coupon', targetId: coupon._id });
        res.status(201).json({ success: true, data: coupon });
    } catch (err) {
        console.error('createCoupon', err);
        if (err.code === 11000) return res.status(400).json({ success: false, message: 'Coupon code already exists' });
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc Get coupon by id
// @route GET /api/admin/coupons/:id
// @access Admin
exports.getCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id).lean();
        if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
        res.json({ success: true, data: coupon });
    } catch (err) { console.error('getCoupon', err); res.status(500).json({ success: false, message: err.message }); }
};

// @desc Update coupon
// @route PUT /api/admin/coupons/:id
// @access Admin
exports.updateCoupon = async (req, res) => {
    try {
        const payload = { ...req.body };
        if (payload.code) payload.code = String(payload.code).trim().toUpperCase();
        const coupon = await Coupon.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
        if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
        res.json({ success: true, data: coupon });
    } catch (err) { console.error('updateCoupon', err); res.status(500).json({ success: false, message: err.message }); }
};

// @desc Activate / Deactivate coupon
// @route PATCH /api/admin/coupons/:id/status
// @access Admin
exports.setStatus = async (req, res) => {
    try {
        const { active } = req.body;
        const coupon = await Coupon.findByIdAndUpdate(req.params.id, { $set: { active: !!active } }, { new: true });
        if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
        res.json({ success: true, data: coupon });
    } catch (err) { console.error('setStatus', err); res.status(500).json({ success: false, message: err.message }); }
};

// @desc Delete coupon (soft-delete: set active=false and mark metadata.deleted)
// @route DELETE /api/admin/coupons/:id
// @access Admin
exports.deleteCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findByIdAndUpdate(req.params.id, { $set: { active: false, 'metadata.deleted': true } }, { new: true });
        if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
        res.json({ success: true, message: 'Coupon deactivated' });
    } catch (err) { console.error('deleteCoupon', err); res.status(500).json({ success: false, message: err.message }); }
};

// @desc Get usage records for a coupon
// @route GET /api/admin/coupons/:id/usage
// @access Admin
exports.getUsage = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page || '1'));
        const limit = Math.min(200, parseInt(req.query.limit || '50'));
        const skip = (page - 1) * limit;
        const filter = { couponRef: req.params.id };
        const total = await CouponUsage.countDocuments(filter);
        const items = await CouponUsage.find(filter).sort({ redeemedAt: -1 }).skip(skip).limit(limit).populate('studentRef transactionRef').lean();
        res.json({ success: true, data: { items, total, page, limit } });
    } catch (err) { console.error('getUsage', err); res.status(500).json({ success: false, message: err.message }); }
};

// @desc Get coupon stats
// @route GET /api/admin/coupons/stats
// @access Admin
exports.getStats = async (req, res) => {
    try {
        const total = await Coupon.countDocuments({});
        const active = await Coupon.countDocuments({ active: true });
        const expired = await Coupon.countDocuments({ expiresAt: { $lte: new Date() } });
        const usageAgg = await CouponUsage.aggregate([
            { $group: { _id: '$couponRef', uses: { $sum: 1 }, totalDiscount: { $sum: '$discountAmount' } } },
            { $sort: { uses: -1 } },
            { $limit: 5 }
        ]);
        res.json({ success: true, data: { total, active, expired, top: usageAgg } });
    } catch (err) { console.error('getStats', err); res.status(500).json({ success: false, message: err.message }); }
};
