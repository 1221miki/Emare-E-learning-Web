const { body, validationResult } = require('express-validator');

// Middleware to evaluate validation result and return standard error JSON
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Input validation failed',
            errors: errors.array().map(err => ({ field: err.path, msg: err.msg }))
        });
    }
    next();
};

// User registration validation rules
const validateRegister = [
    body('fullName')
        .trim()
        .notEmpty().withMessage('Full name is required')
        .isLength({ max: 100 }).withMessage('Full name cannot exceed 100 characters')
        .escape(),
    body('accountEmail')
        .trim()
        .notEmpty().withMessage('Email address is required')
        .isEmail().withMessage('Please enter a valid email address')
        .normalizeEmail(),
    body('securedPassword')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
        .matches(/\d/).withMessage('Password must contain at least one numeric digit'),
    body('assignedRole')
        .optional()
        .isIn(['Student', 'Instructor', 'Admin']).withMessage('Invalid role selected'),
    handleValidationErrors
];

// User login validation rules
const validateLogin = [
    body('accountEmail')
        .trim()
        .notEmpty().withMessage('Email address is required')
        .isEmail().withMessage('Please enter a valid email address')
        .normalizeEmail(),
    body('securedPassword')
        .notEmpty().withMessage('Password is required'),
    handleValidationErrors
];

// Course creation validation rules
const validateCourseCreation = [
    body('courseTitle')
        .trim()
        .notEmpty().withMessage('Course title is required')
        .isLength({ max: 120 }).withMessage('Course title cannot exceed 120 characters')
        .escape(),
    body('descriptionText')
        .trim()
        .notEmpty().withMessage('Description is required')
        .isLength({ min: 20 }).withMessage('Description must be at least 20 characters long'),
    body('technicalCategory')
        .trim()
        .notEmpty().withMessage('Category is required'),
    handleValidationErrors
];

module.exports = {
    validateRegister,
    validateLogin,
    validateCourseCreation,
    handleValidationErrors
};
