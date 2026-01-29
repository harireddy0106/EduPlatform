// server/utils/security.js

import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import createError from 'http-errors';

// Custom security headers middleware
export const setSecurityHeaders = (req, res, next) => {
    // Remove X-Powered-By header
    res.removeHeader('X-Powered-By');

    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('X-Download-Options', 'noopen');

    // Cache control for API responses
    if (req.path.startsWith('/api')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }

    next();
};

// Rate limiter for specific routes
export const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100, keyGenerator = null) => {
    return rateLimit({
        windowMs,
        max,
        keyGenerator: keyGenerator
            ? (req) => ipKeyGenerator(req)
            : undefined,
        handler: (req, res) => {
            res.status(429).json({
                success: false,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: 'Too many requests from this IP, please try again later.',
                    retryAfter: Math.ceil(windowMs / 1000)
                }
            });
        },
        standardHeaders: true,
        legacyHeaders: false
    });
};

// Authentication rate limiter (stricter)
export const authLimiter = createRateLimiter(
    15 * 60 * 1000,
    5,
    (req) => ipKeyGenerator(req)
);

// Global error handler
export const errorHandler = (err, req, res, next) => {
    console.error('🔥 Error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
        timestamp: new Date().toISOString()
    });

    // Default error
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let errorCode = err.code || 'INTERNAL_SERVER_ERROR';

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation Error';
        errorCode = 'VALIDATION_ERROR';
        err.details = Object.values(err.errors).map(e => e.message);
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        statusCode = 409;
        message = 'Duplicate key error';
        errorCode = 'DUPLICATE_KEY';
        const field = Object.keys(err.keyPattern)[0];
        err.details = [`${field} already exists`];
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
        errorCode = 'INVALID_TOKEN';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
        errorCode = 'TOKEN_EXPIRED';
    }

    // Rate limit error
    if (err.statusCode === 429) {
        statusCode = 429;
        message = err.message || 'Too many requests';
        errorCode = 'RATE_LIMIT_EXCEEDED';
    }

    // Create error response
    const errorResponse = {
        success: false,
        error: {
            code: errorCode,
            message,
            ...(err.details && { details: err.details }),
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        },
        timestamp: new Date().toISOString(),
        path: req.path
    };

    // Log to file in production
    if (process.env.NODE_ENV === 'production') {
        const fs = require('fs');
        const path = require('path');
        const errorLog = path.join(__dirname, '../logs/errors.log');

        const logEntry = {
            timestamp: new Date().toISOString(),
            statusCode,
            path: req.path,
            method: req.method,
            ip: req.ip,
            error: {
                code: errorCode,
                message,
                ...(err.details && { details: err.details })
            },
            userAgent: req.get('User-Agent')
        };

        fs.appendFileSync(errorLog, JSON.stringify(logEntry) + '\n');
    }

    res.status(statusCode).json(errorResponse);
};

// Request validation middleware
export const validateRequest = (schema) => {
    return (req, res, next) => {
        try {
            const validation = schema.validate(req.body, {
                abortEarly: false,
                stripUnknown: true
            });

            if (validation.error) {
                const errors = validation.error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }));

                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Validation failed',
                        details: errors
                    }
                });
            }

            req.validatedData = validation.value;
            next();
        } catch (error) {
            next(error);
        }
    };
};

// Check if user is authenticated
export const isAuthenticated = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHENTICATED',
                message: 'Authentication required'
            }
        });
    }
    next();
};

// Check user role
export const hasRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHENTICATED',
                    message: 'Authentication required'
                }
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'INSUFFICIENT_PERMISSIONS',
                    message: `Insufficient permissions. Required roles: ${roles.join(', ')}`
                }
            });
        }

        next();
    };
};

// Sanitize user input
export const sanitizeInput = (input) => {
    if (typeof input === 'string') {
        // Remove HTML tags
        input = input.replace(/<[^>]*>/g, '');
        // Remove script tags
        input = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        // Escape special characters
        input = input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }
    return input;
};
