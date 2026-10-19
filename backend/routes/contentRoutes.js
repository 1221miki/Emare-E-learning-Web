const router = require('express').Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const {
    getContentPage,
    getAllContent,
    updateContentPage,
    addItem,
    updateItem,
    deleteItem,
    togglePublishItem
} = require('../controllers/contentController');

router.get('/', getAllContent);
router.get('/:pageKey', getContentPage);
router.put('/:pageKey', protect, authorizeRoles('Admin'), updateContentPage);

// Item-level routes
router.post('/:pageKey/items', protect, authorizeRoles('Admin'), addItem);
router.put('/:pageKey/items/:itemId', protect, authorizeRoles('Admin'), updateItem);
router.delete('/:pageKey/items/:itemId', protect, authorizeRoles('Admin'), deleteItem);
router.patch('/:pageKey/items/:itemId/toggle-publish', protect, authorizeRoles('Admin'), togglePublishItem);

module.exports = router;

