const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const adminCouponController = require('../controllers/adminCouponController');

// All routes protected and restricted to Admin role
router.use(protect, authorizeRoles('Admin'));

router.get('/', adminCouponController.listCoupons);
router.post('/', adminCouponController.createCoupon);
router.get('/stats', adminCouponController.getStats);
router.get('/:id', adminCouponController.getCoupon);
router.put('/:id', adminCouponController.updateCoupon);
router.patch('/:id/status', adminCouponController.setStatus);
router.delete('/:id', adminCouponController.deleteCoupon);
router.get('/:id/usage', adminCouponController.getUsage);

module.exports = router;
