const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const GradeBook = require('../models/GradeBook');
const bcrypt = require('bcryptjs');

// ─────────────────────────────────────────────
// @desc    Get all users (paginated, filterable)
// @route   GET /api/users
// @access  Private (Admin only)
// ─────────────────────────────────────────────
const getAllUsers = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, role, search } = req.query;
        const query = {};

        // Filter by role if specified
        if (role && ['Student', 'Instructor', 'Admin'].includes(role)) {
            query.assignedRole = role;
        }

        // Search by name or email
        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { accountEmail: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .select('-securedPassword')
            .sort({ creationTimestamp: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .lean();

        const total = await User.countDocuments(query);

        res.status(200).json({
            success: true,
            count: users.length,
            total,
            totalPages: Math.ceil(total / parseInt(limit)),
            currentPage: parseInt(page),
            data: users
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Get single user by ID
// @route   GET /api/users/:id
// @access  Private (Admin only)
// ─────────────────────────────────────────────
const getUserById = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).select('-securedPassword');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        res.status(200).json({ success: true, data: user });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Update user (role, active status)
// @route   PATCH /api/users/:id
// @access  Private (Admin only)
// ─────────────────────────────────────────────
const updateUser = async (req, res, next) => {
    try {
        const { assignedRole, isActive, fullName } = req.body;
        const updateData = {};

        if (assignedRole && ['Student', 'Instructor', 'Admin'].includes(assignedRole)) {
            updateData.assignedRole = assignedRole;
        }
        if (typeof isActive === 'boolean') {
            updateData.isActive = isActive;
        }
        if (fullName) {
            updateData.fullName = fullName;
        }

        const user = await User.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true
        }).select('-securedPassword');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        res.status(200).json({ success: true, message: 'User updated successfully.', data: user });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Admin resets a user's password
// @route   PATCH /api/users/:id/reset-password
// @access  Private (Admin only)
// ─────────────────────────────────────────────
const resetUserPassword = async (req, res, next) => {
    try {
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
        }

        const user = await User.findById(req.params.id).select('+securedPassword');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Assign new password — pre-save hook will hash it automatically
        user.securedPassword = newPassword;
        await user.save();

        res.status(200).json({ success: true, message: `Password reset successfully for ${user.fullName}.` });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Deactivate (soft-delete) a user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
// ─────────────────────────────────────────────
const deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Soft-delete: deactivate instead of removing from database
        user.isActive = false;
        await user.save({ validateBeforeSave: false });

        res.status(200).json({ success: true, message: `User '${user.fullName}' has been deactivated.` });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────
// @desc    Get aggregated platform analytics
// @route   GET /api/analytics/overview
// @access  Private (Admin only)
// ─────────────────────────────────────────────
const getAnalytics = async (req, res, next) => {
    try {
        // Run all aggregation queries in parallel for performance
        const [
            totalUsers,
            totalStudents,
            totalInstructors,
            totalCourses,
            activeCourses,
            pendingCourses,
            totalEnrollments,
            clearedEnrollments,
            enrollmentsByCategory,
            recentRegistrations
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ assignedRole: 'Student' }),
            User.countDocuments({ assignedRole: 'Instructor' }),
            Course.countDocuments(),
            Course.countDocuments({ publicationState: 'Active' }),
            Course.countDocuments({ publicationState: 'Pending Audit' }),
            Enrollment.countDocuments(),
            Enrollment.countDocuments({ tuitionClearanceFlag: true }),
            // Enrollment count grouped by course category
            Enrollment.aggregate([
                { $lookup: { from: 'courses', localField: 'courseRef', foreignField: '_id', as: 'course' } },
                { $unwind: '$course' },
                { $group: { _id: '$course.technicalCategory', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            // Users registered in the last 7 days
            User.countDocuments({ creationTimestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } })
        ]);

        const completionRate = totalEnrollments > 0
            ? Math.round((clearedEnrollments / totalEnrollments) * 100)
            : 0;

        res.status(200).json({
            success: true,
            data: {
                totalUsers,
                totalStudents,
                totalInstructors,
                totalCourses,
                activeCourses,
                pendingCourses,
                totalEnrollments,
                clearedEnrollments,
                completionRate,
                enrollmentsByCategory,
                recentRegistrations
            }
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { getAllUsers, getUserById, updateUser, resetUserPassword, deleteUser, getAnalytics };
