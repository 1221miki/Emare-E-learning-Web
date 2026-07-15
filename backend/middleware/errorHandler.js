/**
 * Global Error Handler Middleware
 * Catches all errors passed via next(err) and returns consistent JSON error responses.
 */
const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // Mongoose duplicate key (e.g., duplicate email)
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        message = `A record with that ${field} already exists.`;
        statusCode = 400;
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        message = Object.values(err.errors).map(val => val.message).join(', ');
        statusCode = 400;
    }

    // Mongoose invalid ObjectId
    if (err.name === 'CastError') {
        message = `Resource not found. Invalid ID format: ${err.value}`;
        statusCode = 404;
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        message = 'Invalid token. Please log in again.';
        statusCode = 401;
    }
    if (err.name === 'TokenExpiredError') {
        message = 'Your session has expired. Please log in again.';
        statusCode = 401;
    }

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = { errorHandler };
