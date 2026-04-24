import { ZodError } from 'zod';
export class AppError extends Error {
    constructor(message, statusCode, code = 'APP_ERROR') {
        super(message);
        Object.defineProperty(this, "message", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: message
        });
        Object.defineProperty(this, "statusCode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: statusCode
        });
        Object.defineProperty(this, "code", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: code
        });
        this.name = 'AppError';
    }
}
export const errorHandler = (err, req, res, next) => {
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            data: null,
            message: err.message
        });
        return;
    }
    // Handle Zod validation errors
    if (err instanceof ZodError) {
        res.status(400).json({
            success: false,
            data: null,
            message: 'Validation error'
        });
        return;
    }
    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        res.status(401).json({
            success: false,
            data: null,
            message: 'Invalid token'
        });
        return;
    }
    // Handle unexpected errors
    console.error('Unexpected error:', err);
    res.status(500).json({
        success: false,
        data: null,
        message: 'An unexpected error occurred'
    });
};
