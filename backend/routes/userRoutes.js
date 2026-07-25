const express = require('express');
const router = express.Router();
const { protect, authorizeRoles, optionalProtect } = require('../middleware/auth');
const {
    getAllUsers,
    getUserById,
    updateUser,
    resetUserPassword,
    deleteUser,
    getAnalytics,
    updateInstructorProfile
} = require('../controllers/userController');

// ── User Self Profile Management (Student/Instructor/Admin) ──
router.patch('/profile', protect, (req, res, next) => {
    req.params.id = req.user.id;
    updateUser(req, res, next);
});

// ── Instructor Profile Management ────────────────────────────
router.put('/instructor/profile', protect, authorizeRoles('Instructor'), updateInstructorProfile);

// ── Public / Authenticated User Listing ───────────────────────
router.get('/', optionalProtect, getAllUsers);

// ── Admin User Management ──────────────────────────────────
router.get('/:id', protect, authorizeRoles('Admin'), getUserById);
router.patch('/:id', protect, authorizeRoles('Admin'), updateUser);
router.patch('/:id/reset-password', protect, authorizeRoles('Admin'), resetUserPassword);
router.delete('/:id', protect, authorizeRoles('Admin'), deleteUser);

module.exports = router;

