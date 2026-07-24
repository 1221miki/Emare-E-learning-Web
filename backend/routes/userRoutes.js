const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth');
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

// All routes below require Admin role
router.use(protect, authorizeRoles('Admin'));

// ── Admin User Management ──────────────────────────────────
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.patch('/:id', updateUser);
router.patch('/:id/reset-password', resetUserPassword);
router.delete('/:id', deleteUser);

module.exports = router;
