/**
 * ApiError — Structured error used across controllers.
 *
 * Lets any layer signal an exact HTTP status, a human-readable message,
 * and the offending request field so the client can render a specific error.
 *
 *   throw new ApiError('Username already taken', 409, 'username');
 *
 * The global errorHandler in middleware/errorHandler.js reads these three
 * properties and converts the error into the uniform JSON body:
 *   { success: false, message, field }
 */
class ApiError extends Error {
    constructor(message, statusCode = 500, field = null) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.field = field;
        this.isOperational = true; // expected/runtime error, not a coding bug
        Error.captureStackTrace(this, ApiError);
    }
}

module.exports = { ApiError };
