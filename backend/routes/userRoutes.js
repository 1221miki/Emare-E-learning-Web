const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth');
const {
    getAllUsers,
    getUserById,
    updateUser,
    resetUserPassword,
    deleteUser,
    getAnalytics
} = require('../controllers/userController');

// All routes below require Admin role
router.use(protect, authorizeRoles('Admin'));

// ── Admin User Management ──────────────────────────────────
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.patch('/:id', updateUser);
router.patch('/:id/reset-password', resetUserPassword);
router.delete('/:id', deleteUser);

module.exports = router;
