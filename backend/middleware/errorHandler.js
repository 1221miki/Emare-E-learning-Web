/**
 * Global Error Handler Middleware
 *
 * Guarantees that EVERY error reaching Express is converted into a uniform
 * JSON response:
 *   { success: false, message: string, field?: string }
 *
 * Client errors are mapped to 400 (validation) / 409 (conflict) / 404 / 401.
 * Unexpected server errors are logged in full to the console (Render logs)
 * and returned as a safe 500 with a readable message — never leaked internals.
 */
const { ApiError } = require('../utils/apiError');

const errorHandler = (err, req, res, next) => {
    // Headers already sent — the request is past the point of no return.
    // Delegate to Express's default handler so the connection is closed cleanly.
    if (res.headersSent) {
        return next(err);
    }

    let statusCode = 500;
    let message = 'Internal Server Error';
    let field = null;

    // ── 1. Explicit ApiError thrown by controllers ──────────────────────
    if (err instanceof ApiError) {
        statusCode = err.statusCode || 500;
        message = err.message || 'Internal Server Error';
        field = err.field || null;
    }

    // ── 2. Mongoose duplicate key (unique index violation) → 409 ────────
    if (err.code === 11000) {
        const keyField = (err.keyValue && Object.keys(err.keyValue)[0]) ||
                         (err.keyPattern && Object.keys(err.keyPattern)[0]);
        const fieldMessages = {
            accountEmail: 'An account with this email already exists.',
            username: 'Username already taken.',
            instructorId: 'Instructor ID already in use.',
            administratorId: 'Administrator ID already in use.'
        };
        statusCode = 409;
        field = keyField || null;
        message = fieldMessages[keyField] || `A record with that ${keyField} already exists.`;
    }

    // ── 3. Mongoose schema validation → 400 (attach first offending field) ──
    if (err.name === 'ValidationError') {
        const entries = Object.entries(err.errors || {});
        statusCode = 400;
        if (entries.length) {
            field = entries[0][0];
            message = entries.map(([key, val]) => `${key}: ${val.message || val.reason || 'is invalid'}`).join(', ');
        } else {
            message = err.message || 'Validation failed.';
        }
    }

    // ── 4. Mongoose invalid ObjectId → 404 ──────────────────────────────
    if (err.name === 'CastError') {
        statusCode = 404;
        message = `Resource not found. Invalid ID format: ${err.value}`;
        field = err.path || null;
    }

    // ── 5. MongoDB unreachable / dropped mid-operation → 503 ─────────────
    // Covers Mongoose wrapper errors AND native Mongo driver errors
    // (MongoNotConnectedError, MongoServerSelectionError, MongoNetworkError,
    // MongoTimeoutError, MongoError ...) plus raw network error codes.
    const isDbUnavailable =
        err.name === 'MongooseError' ||
        err.name === 'MongooseServerSelectionError' ||
        (typeof err.name === 'string' && err.name.startsWith('Mongo')) ||
        ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EHOSTUNREACH', 'EAI_AGAIN'].includes(err.code);
    if (isDbUnavailable) {
        statusCode = 503;
        message = 'Database is unavailable. Please try again later.';
    }

    // ── 6. Body-parser errors (malformed / oversized JSON) ──────────────
    if (err.type === 'entity.parse.failed') {
        statusCode = 400;
        message = 'Invalid JSON in request body.';
    }
    if (err.type === 'entity.too.large') {
        statusCode = 413;
        message = 'Request body is too large.';
    }

    // ── 7. JWT errors → 401 ─────────────────────────────────────────────
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token. Please log in again.';
    }
    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Your session has expired. Please log in again.';
    }

    // ── 8. Plain error with an explicit 4xx statusCode (err.statusCode = 400; next(err)) ──
    if (statusCode === 500 && Number.isInteger(err.statusCode) && err.statusCode >= 400 && err.statusCode < 500) {
        statusCode = err.statusCode;
        message = err.message || 'Bad Request';
    }

    // ── Log every server-side error in full (never leaked to the client) ──
    if (statusCode >= 500) {
        console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${statusCode}:`, err);
    }

    // ── Uniform response body ────────────────────────────────────────────
    const body = { success: false, message };
    if (field) body.field = field;
    if (process.env.NODE_ENV === 'development' && err.stack) body.stack = err.stack;

    res.status(statusCode).json(body);
};

module.exports = { errorHandler };
