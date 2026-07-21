const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { toggleWishlist, getMyWishlist } = require('../controllers/wishlistController');

router.use(protect); // All wishlist routes require authentication
router.post('/toggle', toggleWishlist);
router.get('/', getMyWishlist);

module.exports = router;
