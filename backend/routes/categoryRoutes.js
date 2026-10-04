const router = require('express').Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');

router.get('/', getCategories);
router.post('/', protect, authorizeRoles('Admin'), createCategory);
router.put('/:id', protect, authorizeRoles('Admin'), updateCategory);
router.delete('/:id', protect, authorizeRoles('Admin'), deleteCategory);

module.exports = router;
