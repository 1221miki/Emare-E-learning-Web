const router = require('express').Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const { getContentPage, getAllContent, updateContentPage } = require('../controllers/contentController');

router.get('/', getAllContent);
router.get('/:pageKey', getContentPage);
router.put('/:pageKey', protect, authorizeRoles('Admin'), updateContentPage);

module.exports = router;
