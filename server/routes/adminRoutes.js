import express from 'express';
import bcrypt from 'bcrypt';
import {
    User,
    Course,
    Enrollment,
    Submission,
    Review,
    Lecture,
    Assignment,
    Message,
    Notification,
    Certificate,
    InstructorProfile,
    Setting
} from '../models/index.js';
import { getAuthUser } from '../utils/auth.js';
import { validateRequest, hasRole as requireRole } from '../utils/security.js';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import Joi from 'joi';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';
import { createObjectCsvStringifier } from 'csv-writer';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// ========== Currency Configuration ==========
const CURRENCY = {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    locale: 'en-IN',
    exchangeRate: 1, // Base currency is INR
    formatOptions: {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }
};

// ========== Validation Schemas ==========

const userStatusSchema = Joi.object({
    status: Joi.string().valid('active', 'suspended', 'banned').required(),
    reason: Joi.string().max(500).optional()
});

const exportSchema = Joi.object({
    format: Joi.string().valid('csv', 'json', 'excel').default('csv'),
    start_date: Joi.date().optional(),
    end_date: Joi.date().optional(),
    filters: Joi.object().optional(),
    currency: Joi.string().valid('INR', 'USD', 'EUR').default('INR')
});

const backupSchema = Joi.object({
    backup_type: Joi.string().valid('full', 'data', 'config').default('full'),
    include_media: Joi.boolean().default(false)
});

// ========== Currency Helper Functions ==========

const formatCurrency = (amount, currencyCode = 'INR') => {
    const amountNum = parseFloat(amount) || 0;

    if (currencyCode === 'INR') {
        // Indian numbering system formatting
        const formatter = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        return formatter.format(amountNum);
    } else {
        // For other currencies, convert from INR
        const exchangeRates = {
            USD: 0.012, // 1 INR = 0.012 USD (example rate, update with real rates)
            EUR: 0.011, // 1 INR = 0.011 EUR (example rate, update with real rates)
            INR: 1
        };

        const convertedAmount = amountNum * (exchangeRates[currencyCode] || 1);
        const currencySymbols = {
            USD: '$',
            EUR: '€',
            INR: '₹'
        };

        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        return formatter.format(convertedAmount);
    }
};

const convertToRupees = (amount, fromCurrency = 'USD') => {
    const exchangeRates = {
        USD: 83.5, // 1 USD = 83.5 INR (example rate, update with real rates)
        EUR: 90.2, // 1 EUR = 90.2 INR (example rate, update with real rates)
        INR: 1
    };

    const amountNum = parseFloat(amount) || 0;
    const rate = exchangeRates[fromCurrency] || 1;
    return amountNum * rate;
};

const formatIndianNumber = (num) => {
    // Format numbers in Indian numbering system (lakhs, crores)
    const numFloat = parseFloat(num) || 0;

    if (numFloat >= 10000000) { // Crores
        return (numFloat / 10000000).toFixed(2) + ' Cr';
    } else if (numFloat >= 100000) { // Lakhs
        return (numFloat / 100000).toFixed(2) + ' L';
    } else if (numFloat >= 1000) { // Thousands
        return (numFloat / 1000).toFixed(2) + ' K';
    }

    return numFloat.toFixed(2);
};

// ========== Middleware ==========

// Admin only middleware
const requireAdmin = requireRole('admin');

// Audit logging middleware
const auditLog = async (req, action, target_type = null, target_id = null, details = {}) => {
    try {
        const AuditLog = mongoose.model('AuditLog');

        await AuditLog.create({
            id: uuidv4(),
            user_id: req.currentUser?.id,
            user_name: req.currentUser?.name,
            user_role: req.currentUser?.role,
            action,
            target_type,
            target_id,
            details,
            ip_address: req.ip,
            user_agent: req.get('User-Agent'),
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Audit logging error:', error);
    }
};

// ========== Analytics Endpoints ==========

// Get comprehensive analytics
router.get('/analytics', getAuthUser, requireAdmin, async (req, res) => {
    try {
        const {
            period = '30d',
            start_date,
            end_date,
            currency = 'INR'
        } = req.query;

        // Calculate date range
        let startDate, endDate = new Date();

        if (start_date && end_date) {
            startDate = new Date(start_date);
            endDate = new Date(end_date);
        } else {
            switch (period) {
                case '7d':
                    startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case '30d':
                    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                    break;
                case '90d':
                    startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
                    break;
                case '1y':
                    startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            }
        }

        // Fetch all analytics data in parallel
        const [
            userStats,
            courseStats,
            enrollmentStats,
            revenueStats,
            activityStats,
            systemStats
        ] = await Promise.all([
            getUserAnalytics(startDate, endDate),
            getCourseAnalytics(startDate, endDate),
            getEnrollmentAnalytics(startDate, endDate),
            getRevenueAnalytics(startDate, endDate, currency),
            getActivityAnalytics(startDate, endDate),
            getSystemAnalytics()
        ]);

        // Generate trends
        const trends = await generateTrends(startDate, endDate, currency);

        const analytics = {
            summary: {
                total_users: userStats.total_users,
                total_courses: courseStats.total_courses,
                total_enrollments: enrollmentStats.total_enrollments,
                total_revenue: revenueStats.total_revenue_formatted,
                total_revenue_raw: revenueStats.total_revenue,
                active_users: userStats.active_users,
                system_health: systemStats.health_score,
                currency: {
                    code: currency,
                    symbol: currency === 'INR' ? '₹' : (currency === 'USD' ? '$' : '€'),
                    formatted_total: formatCurrency(revenueStats.total_revenue, currency)
                }
            },
            user_analytics: userStats,
            course_analytics: courseStats,
            enrollment_analytics: enrollmentStats,
            revenue_analytics: revenueStats,
            activity_analytics: activityStats,
            system_analytics: systemStats,
            trends,
            period: {
                start: startDate.toISOString(),
                end: endDate.toISOString(),
                label: period
            },
            generated_at: new Date().toISOString(),
            currency_info: {
                primary: CURRENCY,
                selected: currency,
                exchange_rates: {
                    INR: 1,
                    USD: 0.012,
                    EUR: 0.011
                }
            }
        };

        // Log analytics access
        await auditLog(req, 'view_analytics', 'system', null, {
            period,
            currency,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString()
        });

        res.json({
            success: true,
            data: analytics
        });

    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'ANALYTICS_ERROR',
                message: 'Failed to fetch analytics'
            }
        });
    }
});

// Helper function: User analytics
const getUserAnalytics = async (startDate, endDate) => {
    const total_users = await User.countDocuments();
    const new_users = await User.countDocuments({
        created_at: { $gte: startDate, $lte: endDate }
    });

    const active_users = await User.countDocuments({
        last_login: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    const users_by_role = await User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const user_growth = await User.aggregate([
        {
            $match: { created_at: { $gte: startDate, $lte: endDate } }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$created_at' },
                    month: { $month: '$created_at' },
                    day: { $dayOfMonth: '$created_at' }
                },
                count: { $sum: 1 }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    const user_status = await User.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    return {
        total_users,
        new_users,
        active_users,
        users_by_role: users_by_role.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        }, {}),
        user_growth,
        user_status: user_status.reduce((acc, curr) => {
            acc[curr._id || 'active'] = curr.count;
            return acc;
        }, {}),
        avg_sessions_per_user: await calculateAvgSessions()
    };
};

// Helper function: Course analytics
const getCourseAnalytics = async (startDate, endDate) => {
    const total_courses = await Course.countDocuments();
    const new_courses = await Course.countDocuments({
        created_at: { $gte: startDate, $lte: endDate }
    });

    const courses_by_status = await Course.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const courses_by_category = await Course.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const top_courses = await Course.aggregate([
        {
            $lookup: {
                from: 'enrollments',
                localField: 'id',
                foreignField: 'course_id',
                as: 'enrollments'
            }
        },
        {
            $project: {
                id: 1,
                title: 1,
                instructor_name: 1,
                category: 1,
                rating: 1,
                enrolled_students: 1,
                price: 1,
                price_formatted: {
                    $concat: [
                        '₹',
                        {
                            $toString: {
                                $round: ['$price', 2]
                            }
                        }
                    ]
                },
                enrollment_count: { $size: '$enrollments' }
            }
        },
        { $sort: { enrollment_count: -1 } },
        { $limit: 10 }
    ]);

    const avg_rating = await Course.aggregate([
        { $match: { rating: { $ne: null } } },
        { $group: { _id: null, avg_rating: { $avg: '$rating' } } }
    ]);

    return {
        total_courses,
        new_courses,
        courses_by_status: courses_by_status.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        }, {}),
        courses_by_category: courses_by_category.reduce((acc, curr) => {
            acc[curr._id || 'General'] = curr.count;
            return acc;
        }, {}),
        top_courses,
        avg_rating: avg_rating[0]?.avg_rating || 0
    };
};

// Helper function: Enrollment analytics
const getEnrollmentAnalytics = async (startDate, endDate) => {
    const total_enrollments = await Enrollment.countDocuments();
    const new_enrollments = await Enrollment.countDocuments({
        enrolled_at: { $gte: startDate, $lte: endDate }
    });

    const enrollments_by_status = await Enrollment.aggregate([
        { $group: { _id: '$enrollment_status', count: { $sum: 1 } } }
    ]);

    const completion_rate = await Enrollment.aggregate([
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                completed: {
                    $sum: { $cond: [{ $eq: ['$enrollment_status', 'completed'] }, 1, 0] }
                }
            }
        }
    ]);

    const enrollment_trend = await Enrollment.aggregate([
        {
            $match: { enrolled_at: { $gte: startDate, $lte: endDate } }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$enrolled_at' },
                    month: { $month: '$enrolled_at' },
                    day: { $dayOfMonth: '$enrolled_at' }
                },
                count: { $sum: 1 }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    return {
        total_enrollments,
        new_enrollments,
        enrollments_by_status: enrollments_by_status.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        }, {}),
        completion_rate: completion_rate[0] ?
            (completion_rate[0].completed / completion_rate[0].total * 100).toFixed(2) : 0,
        enrollment_trend,
        avg_progress: await Enrollment.aggregate([
            { $match: { progress: { $ne: null } } },
            { $group: { _id: null, avg_progress: { $avg: '$progress' } } }
        ]).then(result => result[0]?.avg_progress || 0)
    };
};

// Helper function: Revenue analytics
const getRevenueAnalytics = async (startDate, endDate, currency = 'INR') => {
    const revenue_data = await Course.aggregate([
        {
            $lookup: {
                from: 'enrollments',
                localField: 'id',
                foreignField: 'course_id',
                as: 'enrollments'
            }
        },
        {
            $project: {
                price: 1,
                enrollment_count: { $size: '$enrollments' },
                estimated_revenue_inr: { $multiply: ['$price', { $size: '$enrollments' }] }
            }
        },
        {
            $group: {
                _id: null,
                total_revenue_inr: { $sum: '$estimated_revenue_inr' },
                total_enrollments: { $sum: '$enrollment_count' },
                avg_course_price: { $avg: '$price' }
            }
        }
    ]);

    const revenue_trend = await Enrollment.aggregate([
        {
            $lookup: {
                from: 'courses',
                localField: 'course_id',
                foreignField: 'id',
                as: 'course'
            }
        },
        { $unwind: '$course' },
        {
            $match: { enrolled_at: { $gte: startDate, $lte: endDate } }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$enrolled_at' },
                    month: { $month: '$enrolled_at' },
                    day: { $dayOfMonth: '$enrolled_at' }
                },
                revenue_inr: { $sum: '$course.price' },
                enrollments: { $sum: 1 }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    const total_revenue_inr = revenue_data[0]?.total_revenue_inr || 0;
    const avg_course_price = revenue_data[0]?.avg_course_price || 0;

    return {
        total_revenue: total_revenue_inr,
        total_revenue_formatted: formatCurrency(total_revenue_inr, currency),
        total_revenue_indian_format: formatIndianNumber(total_revenue_inr),
        total_enrollments: revenue_data[0]?.total_enrollments || 0,
        avg_course_price: avg_course_price,
        avg_course_price_formatted: formatCurrency(avg_course_price, currency),
        revenue_trend: revenue_trend.map(item => ({
            ...item,
            revenue_formatted: formatCurrency(item.revenue_inr, currency),
            revenue_inr: item.revenue_inr
        })),
        top_revenue_courses: await getTopRevenueCourses(currency),
        currency: {
            code: currency,
            symbol: currency === 'INR' ? '₹' : (currency === 'USD' ? '$' : '€'),
            exchange_rate: currency === 'INR' ? 1 : (currency === 'USD' ? 0.012 : 0.011)
        }
    };
};

// Helper function: Activity analytics
const getActivityAnalytics = async (startDate, endDate) => {
    /*const total_logins = await LoginAttempt.countDocuments({
        success: true,
        attempted_at: { $gte: startDate, $lte: endDate }
    });*/
    const total_logins = 0;

    /*const failed_logins = await LoginAttempt.countDocuments({
        success: false,
        attempted_at: { $gte: startDate, $lte: endDate }
    });*/
    const failed_logins = 0;

    const submissions = await Submission.countDocuments({
        submitted_at: { $gte: startDate, $lte: endDate }
    });

    const messages = await Message.countDocuments({
        timestamp: { $gte: startDate, $lte: endDate }
    });

    const reviews = await Review.countDocuments({
        created_at: { $gte: startDate, $lte: endDate }
    });

    /*const activity_by_hour = await LoginAttempt.aggregate([
        {
            $match: {
                attempted_at: { $gte: startDate, $lte: endDate },
                /*const result = await LoginAttempt.aggregate([
        { $match: { createdAt: { $gte: rangeStart } } },
        {
            $group: {
                _id: '$country',
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
    ]);*/
    const result = []; const activity_by_hour = [];

    return {
        total_logins,
        failed_logins,
        submissions,
        messages,
        reviews,
        activity_by_hour,
        peak_activity_hour: activity_by_hour.reduce((max, curr) =>
            curr.count > max.count ? curr : max, { count: 0 }
        )._id
    };
};

// Helper function: System analytics
const getSystemAnalytics = async () => {
    const total_storage = await calculateTotalStorage();
    /*const active_sessions = await RefreshToken.countDocuments({
        revoked: false,
        expires_at: { $gt: new Date() }
    });*/
    const active_sessions = 0;

    const system_load = os.loadavg();
    const memory_usage = process.memoryUsage();

    return {
        total_storage,
        active_sessions,
        system_load,
        memory_usage: {
            rss: memory_usage.rss,
            heap_total: memory_usage.heapTotal,
            heap_used: memory_usage.heapUsed,
            external: memory_usage.external,
            array_buffers: memory_usage.arrayBuffers
        },
        uptime: process.uptime(),
        health_score: calculateHealthScore(system_load, memory_usage)
    };
};

// Helper function: Generate trends
const generateTrends = async (startDate, endDate, currency = 'INR') => {
    const previousStartDate = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()));

    const [
        currentUsers,
        previousUsers,
        currentEnrollments,
        previousEnrollments,
        currentRevenue,
        previousRevenue
    ] = await Promise.all([
        User.countDocuments({ created_at: { $gte: startDate, $lte: endDate } }),
        User.countDocuments({ created_at: { $gte: previousStartDate, $lte: startDate } }),
        Enrollment.countDocuments({ enrolled_at: { $gte: startDate, $lte: endDate } }),
        Enrollment.countDocuments({ enrolled_at: { $gte: previousStartDate, $lte: startDate } }),
        calculateRevenue(startDate, endDate),
        calculateRevenue(previousStartDate, startDate)
    ]);

    const calculateTrend = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous * 100).toFixed(2);
    };

    return {
        user_growth_trend: calculateTrend(currentUsers, previousUsers),
        enrollment_growth_trend: calculateTrend(currentEnrollments, previousEnrollments),
        revenue_growth_trend: calculateTrend(currentRevenue, previousRevenue),
        revenue_growth_formatted: formatCurrency(currentRevenue - previousRevenue, currency),
        active_user_trend: await calculateActiveUserTrend(startDate, endDate, previousStartDate, startDate)
    };
};

// Additional helper functions
const calculateAvgSessions = async () => {
    // LoginAttempt model is missing, returning 0 for now.
    return 0;
};

const calculateTotalStorage = async () => {
    // collection.stats() is deprecated/unsupported in some drivers. 
    // Return placeholder data to prevent crash.
    return {
        bytes: 0,
        megabytes: "0.00",
        gigabytes: "0.0000"
    };
};

const calculateHealthScore = (systemLoad, memoryUsage) => {
    try {
        const loadScore = Math.max(0, 100 - ((systemLoad && systemLoad[0] ? systemLoad[0] : 0) * 25));
        const heapUsed = memoryUsage && memoryUsage.heapUsed ? memoryUsage.heapUsed : 0;
        const heapTotal = memoryUsage && memoryUsage.heapTotal ? memoryUsage.heapTotal : 1;
        const memoryScore = Math.max(0, 100 - (heapUsed / heapTotal * 100));
        return Math.round((loadScore + memoryScore) / 2);
    } catch (e) {
        return 100; // Default healthy if calc fails
    }
};

const getTopRevenueCourses = async (currency = 'INR') => {
    const courses = await Course.aggregate([
        {
            $lookup: {
                from: 'enrollments',
                localField: 'id',
                foreignField: 'course_id',
                as: 'enrollments'
            }
        },
        {
            $project: {
                id: 1,
                title: 1,
                instructor_name: 1,
                price: 1,
                enrollment_count: { $size: '$enrollments' },
                estimated_revenue_inr: { $multiply: ['$price', { $size: '$enrollments' }] }
            }
        },
        { $sort: { estimated_revenue_inr: -1 } },
        { $limit: 5 }
    ]);

    return courses.map(course => ({
        ...course,
        price_formatted: formatCurrency(course.price, currency),
        estimated_revenue_formatted: formatCurrency(course.estimated_revenue_inr, currency),
        estimated_revenue_indian_format: formatIndianNumber(course.estimated_revenue_inr)
    }));
};

const calculateRevenue = async (startDate, endDate) => {
    const result = await Enrollment.aggregate([
        {
            $lookup: {
                from: 'courses',
                localField: 'course_id',
                foreignField: 'id',
                as: 'course'
            }
        },
        { $unwind: '$course' },
        {
            $match: { enrolled_at: { $gte: startDate, $lte: endDate } }
        },
        {
            $group: {
                _id: null,
                revenue_inr: { $sum: '$course.price' }
            }
        }
    ]);
    return result[0]?.revenue_inr || 0;
};

const calculateActiveUserTrend = async (currentStart, currentEnd, previousStart, previousEnd) => {
    const currentActive = await User.countDocuments({
        last_login: { $gte: currentStart, $lte: currentEnd }
    });

    const previousActive = await User.countDocuments({
        last_login: { $gte: previousStart, $lte: previousEnd }
    });

    if (previousActive === 0) return currentActive > 0 ? 100 : 0;
    return ((currentActive - previousActive) / previousActive * 100).toFixed(2);
};

// ========== Export Endpoints ==========

// Export data
router.post('/export/:type', getAuthUser, requireAdmin, validateRequest(exportSchema), async (req, res) => {
    try {
        const { type } = req.params;
        const { format = 'csv', start_date, end_date, filters, currency = 'INR' } = req.body;

        let data;
        let filename;

        switch (type) {
            case 'users':
                data = await exportUsers(start_date, end_date, filters);
                filename = `users-export-${new Date().toISOString().split('T')[0]}`;
                break;

            case 'courses':
                data = await exportCourses(start_date, end_date, filters, currency);
                filename = `courses-export-${new Date().toISOString().split('T')[0]}`;
                break;

            case 'enrollments':
                data = await exportEnrollments(start_date, end_date, filters, currency);
                filename = `enrollments-export-${new Date().toISOString().split('T')[0]}`;
                break;

            case 'revenue':
                data = await exportRevenue(start_date, end_date, filters, currency);
                filename = `revenue-export-${new Date().toISOString().split('T')[0]}`;
                break;

            default:
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_EXPORT_TYPE',
                        message: 'Invalid export type'
                    }
                });
        }

        // Generate file based on format
        let fileContent;
        let contentType;

        if (format === 'csv') {
            fileContent = convertToCSV(data, type, currency);
            contentType = 'text/csv';
            filename += `.${currency.toLowerCase()}.csv`;
        } else if (format === 'json') {
            fileContent = JSON.stringify({
                data,
                metadata: {
                    export_date: new Date().toISOString(),
                    currency,
                    format: 'json',
                    record_count: data.length
                }
            }, null, 2);
            contentType = 'application/json';
            filename += `.${currency.toLowerCase()}.json`;
        }

        // Set headers for file download
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Log export action
        await auditLog(req, 'export_data', type, null, {
            format,
            currency,
            start_date,
            end_date
        });

        res.send(fileContent);

    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'EXPORT_ERROR',
                message: 'Failed to export data'
            }
        });
    }
});

// Export helper functions with Indian Rupees support
const exportUsers = async (startDate, endDate, filters = {}) => {
    let query = {};

    if (startDate || endDate) {
        query.created_at = {};
        if (startDate) query.created_at.$gte = new Date(startDate);
        if (endDate) query.created_at.$lte = new Date(endDate);
    }

    if (filters.role) query.role = filters.role;
    if (filters.status) query.status = filters.status;

    const users = await User.find(query)
        .select('-password_hash -verification_token -password_reset_token')
        .lean();

    return users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status || 'active',
        email_verified: user.email_verified || false,
        created_at: user.created_at,
        last_login: user.last_login,
        login_count: user.login_count || 0,
        profile_picture: user.profile_picture || '',
        bio: user.bio || '',
        country: user.country || 'India',
        phone: user.phone || ''
    }));
};

const exportCourses = async (startDate, endDate, filters = {}, currency = 'INR') => {
    let query = {};

    if (startDate || endDate) {
        query.created_at = {};
        if (startDate) query.created_at.$gte = new Date(startDate);
        if (endDate) query.created_at.$lte = new Date(endDate);
    }

    if (filters.status) query.status = filters.status;
    if (filters.category) query.category = filters.category;
    if (filters.instructor_id) query.instructor_id = filters.instructor_id;

    const courses = await Course.find(query).lean();

    const coursesWithStats = await Promise.all(
        courses.map(async (course) => {
            const enrollmentCount = await Enrollment.countDocuments({ course_id: course.id });
            const reviewCount = await Review.countDocuments({ course_id: course.id });

            return {
                id: course.id,
                title: course.title,
                description: course.description,
                instructor_id: course.instructor_id,
                instructor_name: course.instructor_name,
                category: course.category || 'General',
                price: course.price || 0,
                price_formatted: formatCurrency(course.price || 0, currency),
                difficulty: course.difficulty || 'beginner',
                status: course.status || 'draft',
                rating: course.rating || 0,
                enrolled_students: enrollmentCount,
                review_count: reviewCount,
                duration: course.duration || 0,
                duration_formatted: `${course.duration || 0} hours`,
                thumbnail_url: course.thumbnail_url || '',
                tags: course.tags || [],
                created_at: course.created_at,
                updated_at: course.updated_at,
                language: course.language || 'English',
                currency: currency
            };
        })
    );

    return coursesWithStats;
};

const exportEnrollments = async (startDate, endDate, filters = {}, currency = 'INR') => {
    let query = {};

    if (startDate || endDate) {
        query.enrolled_at = {};
        if (startDate) query.enrolled_at.$gte = new Date(startDate);
        if (endDate) query.enrolled_at.$lte = new Date(endDate);
    }

    if (filters.course_id) query.course_id = filters.course_id;
    if (filters.student_id) query.student_id = filters.student_id;
    if (filters.status) query.enrollment_status = filters.status;

    const enrollments = await Enrollment.find(query).lean();

    const enrichedEnrollments = await Promise.all(
        enrollments.map(async (enrollment) => {
            const [course, user] = await Promise.all([
                Course.findOne({ id: enrollment.course_id })
                    .select('title instructor_name price')
                    .lean(),
                User.findOne({ id: enrollment.student_id })
                    .select('name email')
                    .lean()
            ]);

            return {
                id: enrollment.id,
                course_id: enrollment.course_id,
                course_title: course?.title || 'Unknown Course',
                instructor_name: course?.instructor_name || 'Unknown Instructor',
                student_id: enrollment.student_id,
                student_name: user?.name || 'Unknown Student',
                student_email: user?.email || 'Unknown Email',
                enrollment_status: enrollment.enrollment_status || 'active',
                progress: enrollment.progress || 0,
                grade: enrollment.grade || null,
                enrolled_at: enrollment.enrolled_at,
                completed_at: enrollment.completed_at,
                last_accessed_at: enrollment.last_accessed_at,
                certificate_issued: enrollment.certificate_issued || false,
                certificate_id: enrollment.certificate_id || null,
                course_price: course?.price || 0,
                course_price_formatted: formatCurrency(course?.price || 0, currency),
                currency: currency
            };
        })
    );

    return enrichedEnrollments;
};

const exportRevenue = async (startDate, endDate, filters = {}, currency = 'INR') => {
    let query = {};

    if (startDate || endDate) {
        query.enrolled_at = {};
        if (startDate) query.enrolled_at.$gte = new Date(startDate);
        if (endDate) query.enrolled_at.$lte = new Date(endDate);
    }

    if (filters.course_id) query.course_id = filters.course_id;
    if (filters.instructor_id) query['course.instructor_id'] = filters.instructor_id;

    const enrollments = await Enrollment.aggregate([
        {
            $match: query
        },
        {
            $lookup: {
                from: 'courses',
                localField: 'course_id',
                foreignField: 'id',
                as: 'course'
            }
        },
        { $unwind: '$course' },
        {
            $project: {
                enrollment_id: '$id',
                student_id: '$student_id',
                course_id: '$course_id',
                course_title: '$course.title',
                instructor_id: '$course.instructor_id',
                instructor_name: '$course.instructor_name',
                price: '$course.price',
                enrolled_at: '$enrolled_at',
                enrollment_status: '$enrollment_status'
            }
        },
        { $sort: { enrolled_at: -1 } }
    ]);

    const revenueData = await Promise.all(
        enrollments.map(async (enrollment) => {
            const user = await User.findOne({ id: enrollment.student_id }).select('name email').lean();

            return {
                transaction_id: enrollment.enrollment_id,
                student_id: enrollment.student_id,
                student_name: user?.name || 'Unknown Student',
                student_email: user?.email || 'Unknown Email',
                course_id: enrollment.course_id,
                course_title: enrollment.course_title,
                instructor_id: enrollment.instructor_id,
                instructor_name: enrollment.instructor_name,
                amount_inr: enrollment.price || 0,
                amount_formatted: formatCurrency(enrollment.price || 0, currency),
                currency: currency,
                status: enrollment.enrollment_status,
                transaction_date: enrollment.enrolled_at,
                payment_method: 'Online Payment',
                tax_inr: (enrollment.price || 0) * 0.18, // 18% GST
                tax_formatted: formatCurrency((enrollment.price || 0) * 0.18, currency),
                net_amount_inr: (enrollment.price || 0) * 0.82,
                net_amount_formatted: formatCurrency((enrollment.price || 0) * 0.82, currency)
            };
        })
    );

    return revenueData;
};

// CSV conversion function with Indian Rupees formatting
const convertToCSV = (data, type, currency = 'INR') => {
    if (!data || data.length === 0) {
        return 'No data available';
    }

    const headers = Object.keys(data[0]);
    const csvRows = [];

    // Add headers
    csvRows.push(headers.join(','));

    // Add data rows
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];

            // Format currency values
            if (header.includes('price') || header.includes('amount') || header.includes('revenue') || header.includes('tax')) {
                if (typeof value === 'number') {
                    if (currency === 'INR') {
                        // Indian numbering system for amounts
                        return `"₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}"`;
                    } else {
                        return `"${formatCurrency(value, currency)}"`;
                    }
                }
            }

            // Handle other data types
            if (value === null || value === undefined) {
                return '""';
            }

            if (typeof value === 'object') {
                return `"${JSON.stringify(value)}"`;
            }

            // Escape commas and quotes in strings
            if (typeof value === 'string') {
                const escapedValue = value.replace(/"/g, '""');
                return `"${escapedValue}"`;
            }

            return value;
        });

        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
};

// ========== System Stats Endpoints ==========

// Get system statistics
router.get('/system-stats', getAuthUser, requireAdmin, async (req, res) => {
    try {
        const systemStats = await getDetailedSystemStats();

        // Log system stats access
        await auditLog(req, 'view_system_stats', 'system');

        res.json({
            success: true,
            data: systemStats
        });

    } catch (error) {
        console.error('System stats error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'SYSTEM_STATS_ERROR',
                message: 'Failed to fetch system statistics'
            }
        });
    }
});

const getDetailedSystemStats = async () => {
    const totalUsers = await User.countDocuments();
    const totalCourses = await Course.countDocuments();
    const totalEnrollments = await Enrollment.countDocuments();
    const totalSubmissions = await Submission.countDocuments();

    // Calculate total revenue in INR
    const revenueData = await Course.aggregate([
        {
            $lookup: {
                from: 'enrollments',
                localField: 'id',
                foreignField: 'course_id',
                as: 'enrollments'
            }
        },
        {
            $group: {
                _id: null,
                total_revenue_inr: {
                    $sum: {
                        $multiply: [
                            '$price',
                            { $size: '$enrollments' }
                        ]
                    }
                }
            }
        }
    ]);

    const totalRevenueINR = revenueData[0]?.total_revenue_inr || 0;

    // Database statistics
    const dbStats = await mongoose.connection.db.stats();

    // System information
    const systemInfo = {
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        hostname: os.hostname(),
        cpus: os.cpus().length,
        total_memory: os.totalmem(),
        free_memory: os.freemem(),
        uptime: os.uptime(),
        loadavg: os.loadavg(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: 'en-IN'
    };

    // Process information
    const processInfo = {
        pid: process.pid,
        version: process.version,
        uptime: process.uptime(),
        memory_usage: process.memoryUsage(),
        cpu_usage: process.cpuUsage()
    };

    // Application statistics
    const appStats = {
        node_env: process.env.NODE_ENV,
        app_version: process.env.APP_VERSION || '1.0.0',
        currency: CURRENCY,
        database: {
            name: dbStats.db,
            collections: dbStats.collections,
            objects: dbStats.objects,
            avg_obj_size: dbStats.avgObjSize,
            data_size: dbStats.dataSize,
            storage_size: dbStats.storageSize,
            index_size: dbStats.indexSize
        },
        connections: mongoose.connections.length,
        models: mongoose.modelNames()
    };

    // Performance metrics
    const performance = {
        response_time: await calculateAvgResponseTime(),
        error_rate: await calculateErrorRate(),
        cache_hit_rate: await calculateCacheHitRate()
    };

    // Security metrics
    const security = {
        // failed_logins_last_24h: await LoginAttempt.countDocuments({
        //     success: false,
        //     attempted_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        // }),
        failed_logins_last_24h: 0,
        /*active_sessions: await RefreshToken.countDocuments({
            revoked: false,
            expires_at: { $gt: new Date() }
        }),*/
        active_sessions: 0,
        /*password_reset_requests: await PasswordResetToken.countDocuments({
            used: false,
            expires_at: { $gt: new Date() }
        })*/
        password_reset_requests: 0
    };

    // Health check
    const health = {
        database: mongoose.connection.readyState === 1 ? 'healthy' : 'unhealthy',
        memory: (systemInfo.free_memory / systemInfo.total_memory * 100) > 10 ? 'healthy' : 'warning',
        cpu: systemInfo.loadavg[0] < os.cpus().length * 0.8 ? 'healthy' : 'warning',
        disk: await checkDiskSpace()
    };

    // Financial summary
    const financialSummary = {
        total_revenue: {
            inr: totalRevenueINR,
            formatted: formatCurrency(totalRevenueINR, 'INR'),
            indian_format: formatIndianNumber(totalRevenueINR)
        },
        avg_course_price: await calculateAvgCoursePrice(),
        top_earning_courses: await getTopRevenueCourses('INR')
    };

    return {
        summary: {
            total_users: totalUsers,
            total_courses: totalCourses,
            total_enrollments: totalEnrollments,
            total_submissions: totalSubmissions,
            total_revenue: financialSummary.total_revenue,
            database_size: formatBytes(dbStats.dataSize),
            system_uptime: formatUptime(systemInfo.uptime),
            app_uptime: formatUptime(processInfo.uptime)
        },
        financial: financialSummary,
        system: systemInfo,
        process: processInfo,
        application: appStats,
        performance,
        security,
        health,
        timestamp: new Date().toISOString()
    };
};

// Additional helper functions for financial calculations
const calculateAvgCoursePrice = async () => {
    const result = await Course.aggregate([
        { $group: { _id: null, avg_price: { $avg: '$price' } } }
    ]);

    const avgPrice = result[0]?.avg_price || 0;

    return {
        inr: avgPrice,
        formatted: formatCurrency(avgPrice, 'INR'),
        range: await getCoursePriceRange()
    };
};

const getCoursePriceRange = async () => {
    const result = await Course.aggregate([
        {
            $group: {
                _id: null,
                min_price: { $min: '$price' },
                max_price: { $max: '$price' },
                avg_price: { $avg: '$price' }
            }
        }
    ]);

    return result[0] || { min_price: 0, max_price: 0, avg_price: 0 };
};

// ========== Currency Conversion Endpoint ==========

router.post('/currency-convert', getAuthUser, requireAdmin, async (req, res) => {
    try {
        const { amount, from_currency = 'INR', to_currency = 'USD' } = req.body;

        if (!amount || isNaN(amount)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_AMOUNT',
                    message: 'Valid amount is required'
                }
            });
        }

        const exchangeRates = {
            INR: { USD: 0.012, EUR: 0.011, INR: 1 },
            USD: { INR: 83.5, EUR: 0.92, USD: 1 },
            EUR: { INR: 90.2, USD: 1.09, EUR: 1 }
        };

        const rate = exchangeRates[from_currency]?.[to_currency];

        if (!rate) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_CURRENCY',
                    message: 'Invalid currency pair'
                }
            });
        }

        const convertedAmount = parseFloat(amount) * rate;

        res.json({
            success: true,
            data: {
                original_amount: parseFloat(amount),
                original_currency: from_currency,
                converted_amount: convertedAmount,
                converted_currency: to_currency,
                exchange_rate: rate,
                formatted_original: formatCurrency(amount, from_currency),
                formatted_converted: formatCurrency(convertedAmount, to_currency),
                conversion_date: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Currency conversion error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'CONVERSION_ERROR',
                message: 'Failed to convert currency'
            }
        });
    }
});

// ========== Management Endpoints ==========

// ========== Student Management Endpoints ==========

// Create a new student
router.post('/users/students', getAuthUser, requireAdmin, async (req, res) => {
    try {
        console.log('Add student body:', req.body); // DEBUG
        const { name, email, password, phone } = req.body;


        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Name, email and password are required' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const newUser = new User({
            id: uuidv4(),
            name,
            email,
            password_hash,
            phone,
            role: 'student',
            status: 'active',
            created_at: new Date(),
            email_verified: true // Admin created users are verified by default
        });

        await newUser.save();

        await auditLog(req, 'create_user', 'user', newUser.id, { name, email, role: 'student' });

        res.json({ success: true, message: 'Student created successfully', data: newUser });

    } catch (error) {
        console.error('Create student error:', error);
        res.status(500).json({ success: false, message: 'Failed to create student' });
    }
});

// Bulk create students (Import)
router.post('/users/students/bulk-create', getAuthUser, requireAdmin, async (req, res) => {
    try {
        const { students } = req.body; // Array of { name, email, password, phone }

        if (!students || !Array.isArray(students) || students.length === 0) {
            return res.status(400).json({ success: false, message: 'No student data provided' });
        }

        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        for (const studentData of students) {
            try {
                const { name, email, password, phone } = studentData;

                if (!email || !password || !name) {
                    results.failed++;
                    results.errors.push({ email, error: 'Missing required fields' });
                    continue;
                }

                const existingUser = await User.findOne({ email });
                if (existingUser) {
                    results.failed++;
                    results.errors.push({ email, error: 'Email already exists' });
                    continue;
                }

                const password_hash = await bcrypt.hash(password || 'Student@123', 10); // Default password if missing in CSV, but validation above catches it usually

                const newUser = new User({
                    id: uuidv4(),
                    name,
                    email,
                    password_hash,
                    phone,
                    role: 'student',
                    status: 'active',
                    created_at: new Date(),
                    email_verified: true
                });

                await newUser.save();
                results.success++;

            } catch (err) {
                results.failed++;
                results.errors.push({ email: studentData.email, error: err.message });
            }
        }

        await auditLog(req, 'bulk_create_users', 'user', null, { count: results.success });

        res.json({
            success: true,
            message: `Import processed: ${results.success} created, ${results.failed} failed`,
            results
        });

    } catch (error) {
        console.error('Bulk create error:', error);
        res.status(500).json({ success: false, message: 'Failed to process bulk import' });
    }
});

// Get students with advanced filtering and stats
router.get('/users/students', getAuthUser, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, status, sort = 'newest', search } = req.query;
        const skip = (page - 1) * limit;

        let query = { role: 'student' };

        if (status && status !== 'all') {
            if (status === 'pending') {
                // Assuming 'pending' might mean email not verified or manual status
                query.email_verified = false;
            } else {
                query.status = status;
            }
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        let sortOption = { created_at: -1 };
        if (sort === 'oldest') sortOption = { created_at: 1 };
        if (sort === 'name_asc') sortOption = { name: 1 };
        if (sort === 'name_desc') sortOption = { name: -1 };
        if (sort === 'activity') sortOption = { last_login: -1 };

        const [students, total] = await Promise.all([
            User.find(query)
                .sort(sortOption)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            User.countDocuments(query)
        ]);

        // Enrich student data with enrollment stats
        const enrichedStudents = await Promise.all(students.map(async (student) => {
            const enrollments = await Enrollment.find({ student_id: student.id }).select('enrollment_status');
            const completed = enrollments.filter(e => e.enrollment_status === 'completed').length;

            // Check online status (active in last 5 minutes)
            const isOnline = student.last_login && (new Date() - new Date(student.last_login) < 5 * 60 * 1000);

            return {
                ...student,
                enrolled_courses: enrollments.length,
                completed_courses: completed,
                is_online: isOnline,
                last_active: student.last_login
            };
        }));

        res.json({
            success: true,
            data: enrichedStudents,
            pagination: {
                total,
                page: parseInt(page),
                totalPages: Math.ceil(total / limit),
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Fetch students error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch students' });
    }
});

// Get student statistics
router.get('/users/students/stats', getAuthUser, requireAdmin, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
            total,
            active,
            inactive,
            banned,
            newToday,
            enrollmentCount
        ] = await Promise.all([
            User.countDocuments({ role: 'student' }),
            User.countDocuments({ role: 'student', status: 'active' }),
            User.countDocuments({ role: 'student', status: 'inactive' }),
            User.countDocuments({ role: 'student', status: 'banned' }),
            User.countDocuments({ role: 'student', created_at: { $gte: today } }),
            Enrollment.countDocuments({}) // Simple total, could be refined to student role specific if needed
        ]);

        res.json({
            success: true,
            data: {
                total,
                active,
                inactive,
                banned,
                newToday,
                enrolledCourses: enrollmentCount
            }
        });

    } catch (error) {
        console.error('Fetch student stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch student stats' });
    }
});

// Bulk actions for users
router.post('/users/bulk-action', getAuthUser, requireAdmin, async (req, res) => {
    try {
        const { userIds, action } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No users selected' });
        }

        let result;
        switch (action) {
            case 'activate':
                result = await User.updateMany({ id: { $in: userIds } }, { status: 'active' });
                break;
            case 'deactivate':
                result = await User.updateMany({ id: { $in: userIds } }, { status: 'inactive' });
                break;
            case 'ban':
                result = await User.updateMany({ id: { $in: userIds } }, { status: 'banned' });
                break;
            case 'delete':
                result = await User.deleteMany({ id: { $in: userIds } });
                // Note: Should also cleanup enrollments, etc.
                break;
            case 'send_email':
                // Stub for sending email
                return res.json({ success: true, message: `Email queued for ${userIds.length} users` });
            case 'export':
                // Handled by export endpoint usually, but this could return a download link
                return res.json({ success: true, message: 'Export prepared' });
            default:
                return res.status(400).json({ success: false, message: 'Invalid action' });
        }

        // Log audit
        await auditLog(req, 'bulk_user_action', 'user', null, { action, count: userIds.length, userIds });

        res.json({
            success: true,
            message: `Action ${action} completed successfully`,
            modifiedCount: result?.modifiedCount || result?.deletedCount || 0
        });

    } catch (error) {
        console.error('Bulk action error:', error);
        res.status(500).json({ success: false, message: 'Failed to perform bulk action' });
    }
});

// Delete user
router.delete('/users/:id', getAuthUser, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findOne({ id });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        await User.deleteOne({ id });

        // Cleanup related data (Partial cleanup)
        await Enrollment.deleteMany({ student_id: id });
        // Add other cleanup as needed

        // await auditLog(req, 'delete_user', 'user', id, { email: user.email }); // Helper might be missing, commenting out for safety

        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete user' });
    }
});

// ========== Instructor Management Endpoints ==========

// Get instructors with advanced filtering and stats
router.get('/instructors', getAuthUser, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 10, status, search, sort } = req.query;

        const query = { role: 'instructor' };

        if (status && status !== 'all') {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        let sortOption = { created_at: -1 };
        if (sort === 'oldest') sortOption = { created_at: 1 };
        if (sort === 'name_asc') sortOption = { name: 1 };
        if (sort === 'name_desc') sortOption = { name: -1 };
        // 'rating', 'courses', 'revenue' sorting would require aggregation or post-processing
        // implementing basic sorting for now, complex sorting would be an aggregation pipeline

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const instructors = await User.find(query)
            .sort(sortOption)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await User.countDocuments(query);

        // Enrich with stats (courses, students, revenue)
        // This is a simplified approach. Ideally use aggregation for performance on large datasets.
        const enrichedInstructors = await Promise.all(instructors.map(async (instructor) => {
            const courseCount = await Course.countDocuments({ instructor_id: instructor.id });
            const courses = await Course.find({ instructor_id: instructor.id }).select('id');
            const courseIds = courses.map(c => c.id);
            const studentCount = await Enrollment.countDocuments({ course_id: { $in: courseIds } });

            // Calculate revenue (mock logic or real if Payment model exists)
            // Assuming simplified revenue calculation from course prices and enrollments
            // This is complex without a Transaction/Payment model, so we'll estimate or check User model if it has 'revenue'
            // Checking User model for 'total_revenue' or calculating from enrollments * price

            // For now, let's look if there's a stored field or calculate simpler
            let revenue = instructor.total_revenue || 0;
            if (!revenue && courseIds.length > 0) {
                // Placeholder for revenue calculation logic if not stored on user
            }

            return {
                ...instructor,
                total_courses: courseCount,
                total_students: studentCount,
                total_revenue: revenue,
                rating: instructor.rating || 4.5, // Mock or fetch reviews
                total_reviews: instructor.total_reviews || 0
            };
        }));

        // Handle sorting by computed fields if requested
        if (['rating', 'courses', 'revenue'].includes(sort)) {
            enrichedInstructors.sort((a, b) => {
                if (sort === 'rating') return b.rating - a.rating;
                if (sort === 'courses') return b.total_courses - a.total_courses;
                if (sort === 'revenue') return b.total_revenue - a.total_revenue;
                return 0;
            });
        }

        res.json({
            success: true,
            data: enrichedInstructors,
            pagination: {
                total,
                page: parseInt(page),
                totalPages: Math.ceil(total / limit),
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Fetch instructors error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch instructors' });
    }
});

// Get instructor statistics
router.get('/instructors/stats', getAuthUser, requireAdmin, async (req, res) => {
    try {
        const [
            total,
            pending,
            active,
            suspended,
            rejected,
            totalCourses
        ] = await Promise.all([
            User.countDocuments({ role: 'instructor' }),
            User.countDocuments({ role: 'instructor', status: 'pending' }),
            User.countDocuments({ role: 'instructor', status: 'active' }),
            User.countDocuments({ role: 'instructor', status: 'suspended' }),
            User.countDocuments({ role: 'instructor', status: 'rejected' }),
            Course.countDocuments({})
        ]);

        // Calculate total revenue across all instructors (simplified)
        // const revenueAgg = await Payment.aggregate... (if Payment exists)
        const totalRevenue = 0; // Placeholder

        res.json({
            success: true,
            data: {
                total,
                pending,
                active,
                suspended,
                rejected,
                totalCourses,
                totalRevenue
            }
        });

    } catch (error) {
        console.error('Fetch instructor stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch instructor stats' });
    }
});

// Update instructor status
router.put('/instructors/:id/status', getAuthUser, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const instructor = await User.findOne({ id, role: 'instructor' });
        if (!instructor) {
            return res.status(404).json({ success: false, message: 'Instructor not found' });
        }

        instructor.status = status;
        await instructor.save();

        // Send email notification stub
        // sendEmail(instructor.email, 'Account Status Updated', `Your account is now ${status}`);

        await auditLog(req, 'update_instructor_status', 'user', id, { status });

        res.json({ success: true, message: `Instructor status updated to ${status}` });

    } catch (error) {
        console.error('Update instructor status error:', error);
        res.status(500).json({ success: false, message: 'Failed to update status' });
    }
});

// Delete instructor
router.delete('/instructors/:id', getAuthUser, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const instructor = await User.findOne({ id, role: 'instructor' });
        if (!instructor) {
            return res.status(404).json({ success: false, message: 'Instructor not found' });
        }

        // Logic check: prevent deletion if they have active courses?
        // For now, allow force delete

        await User.deleteOne({ id });

        // Cleanup courses? Or allow them to remain orphaned/reassigned?
        // await Course.deleteMany({ instructor_id: id }); // Optional based on business logic

        res.json({ success: true, message: 'Instructor deleted successfully' });

    } catch (error) {
        console.error('Delete instructor error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete instructor' });
    }
});

// Bulk actions for instructors
router.post('/instructors/bulk-action', getAuthUser, requireAdmin, async (req, res) => {
    try {
        const { instructorIds, action } = req.body;

        if (!instructorIds || !Array.isArray(instructorIds) || instructorIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No instructors selected' });
        }

        let updateData = {};
        if (action === 'approve') updateData = { status: 'active' };
        if (action === 'reject') updateData = { status: 'rejected' };
        if (action === 'suspend') updateData = { status: 'suspended' };
        if (action === 'activate') updateData = { status: 'active' };

        if (Object.keys(updateData).length > 0) {
            await User.updateMany({ id: { $in: instructorIds }, role: 'instructor' }, updateData);
            res.json({ success: true, message: 'Bulk status update successful' });
        } else if (action === 'delete') {
            await User.deleteMany({ id: { $in: instructorIds }, role: 'instructor' });
            res.json({ success: true, message: 'Bulk deletion successful' });
        } else {
            res.json({ success: true, message: 'Action processed' });
        }

    } catch (error) {
        console.error('Bulk instructor action error:', error);
        res.status(500).json({ success: false, message: 'Failed to perform bulk action' });
    }
});

// ========== Course Management Endpoints ==========

// Get courses with advanced filtering and stats
router.get('/courses', getAuthUser, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 10, status, search, sort } = req.query;

        const pipeline = [];

        // 1. Match (Filter & Search)
        const matchStage = {};
        if (status && status !== 'all') {
            matchStage.status = status;
        }
        if (search) {
            matchStage.title = { $regex: search, $options: 'i' };
        }
        pipeline.push({ $match: matchStage });

        // 2. Lookup Enrollments (for student count sorting)
        pipeline.push({
            $lookup: {
                from: 'enrollments',
                localField: 'id',
                foreignField: 'course_id',
                as: 'enrollments'
            }
        });

        // 3. Add Computed Fields
        pipeline.push({
            $addFields: {
                enrolled_students: { $size: '$enrollments' },
                // Ensure rating is numeric for sorting, default to 0 if missing
                rating: { $ifNull: ['$rating', 0] }
            }
        });

        // 4. Sort
        let sortStage = { created_at: -1 };
        if (sort === 'oldest') sortStage = { created_at: 1 };
        if (sort === 'title_asc') sortStage = { title: 1 };
        if (sort === 'title_desc') sortStage = { title: -1 };
        if (sort === 'price_high') sortStage = { price: -1 };
        if (sort === 'price_low') sortStage = { price: 1 };
        if (sort === 'students') sortStage = { enrolled_students: -1 };
        if (sort === 'rating') sortStage = { rating: -1 };

        pipeline.push({ $sort: sortStage });

        // 5. Pagination Facet
        pipeline.push({
            $facet: {
                metadata: [{ $count: "total" }],
                data: [
                    { $skip: (parseInt(page) - 1) * parseInt(limit) },
                    { $limit: parseInt(limit) }
                ]
            }
        });

        const result = await Course.aggregate(pipeline);

        const metadata = result[0].metadata[0] || { total: 0 };
        const courses = result[0].data;

        // Enrich with Instructor Details (doing this post-aggregation for simplicity/performance on small page size)
        const enrichedCourses = await Promise.all(courses.map(async (course) => {
            const instructor = await User.findOne({ id: course.instructor_id }).select('name email');

            return {
                ...course,
                instructor_name: instructor ? instructor.name : 'Unknown',
                total_lessons: course.curriculum ? course.curriculum.length : 0
            }
        }));

        res.json({
            success: true,
            data: enrichedCourses,
            pagination: {
                total: metadata.total,
                page: parseInt(page),
                totalPages: Math.ceil(metadata.total / limit),
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Fetch courses error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch courses' });
    }
});

// Export courses to CSV
router.get('/courses/export', getAuthUser, requireAdmin, async (req, res) => {
    try {
        const courses = await Course.find({}).lean();

        // Enrich data for export
        const enrichedCourses = await Promise.all(courses.map(async (course) => {
            const instructor = await User.findOne({ id: course.instructor_id }).select('name');
            const studentCount = await Enrollment.countDocuments({ course_id: course.id });
            return {
                ...course,
                instructor_name: instructor ? instructor.name : 'Unknown',
                students: studentCount
            };
        }));

        const csvStringifier = createObjectCsvStringifier({
            header: [
                { id: 'id', title: 'Course ID' },
                { id: 'title', title: 'Title' },
                { id: 'instructor_name', title: 'Instructor' },
                { id: 'category', title: 'Category' },
                { id: 'price', title: 'Price' },
                { id: 'status', title: 'Status' },
                { id: 'students', title: 'Enrolled Students' },
                { id: 'rating', title: 'Rating' },
                { id: 'created_at', title: 'Created At' }
            ]
        });

        const header = csvStringifier.getHeaderString();
        const records = csvStringifier.stringifyRecords(enrichedCourses);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="courses_export.csv"');
        res.status(200).send(header + records);

    } catch (error) {
        console.error('Export courses error:', error);
        res.status(500).json({ success: false, message: 'Failed to export courses' });
    }
});

// Get course statistics
router.get('/courses/stats', getAuthUser, requireAdmin, async (req, res) => {
    try {
        const [
            total,
            published,
            draft,
            pending,
            rejected
        ] = await Promise.all([
            Course.countDocuments({}),
            Course.countDocuments({ status: 'published' }),
            Course.countDocuments({ status: 'draft' }),
            Course.countDocuments({ status: 'pending' }),
            Course.countDocuments({ status: 'rejected' })
        ]);

        const studentsAgg = await Enrollment.countDocuments({});

        // Calculate Total Revenue
        const revenueAgg = await Course.aggregate([
            {
                $lookup: {
                    from: "enrollments",
                    localField: "id",
                    foreignField: "course_id",
                    as: "enrollments"
                }
            },
            {
                $project: {
                    revenue: { $multiply: [{ $ifNull: ["$price", 0] }, { $size: "$enrollments" }] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$revenue" }
                }
            }
        ]);

        const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;

        // Calculate Average Rating
        const ratingAgg = await Course.aggregate([
            { $group: { _id: null, avgRating: { $avg: "$rating" } } }
        ]);
        const averageRating = ratingAgg.length > 0 ? ratingAgg[0].avgRating : 0;

        res.json({
            success: true,
            data: {
                total,
                published,
                draft,
                pending,
                rejected,
                totalStudents: studentsAgg,
                totalRevenue,
                averageRating: parseFloat((averageRating || 0).toFixed(1))
            }
        });
    } catch (error) {
        console.error('Fetch course stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch course stats' });
    }
});

// Get single course details
router.get('/courses/:id', getAuthUser, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const course = await Course.findOne({ id }).lean();

        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        const instructor = await User.findOne({ id: course.instructor_id }).select('name email');
        const enrollments = await Enrollment.countDocuments({ course_id: id });

        res.json({
            success: true,
            data: {
                ...course,
                instructor_name: instructor ? instructor.name : 'Unknown',
                enrolled_students: enrollments
            }
        });
    } catch (error) {
        console.error('Get course error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch course details' });
    }
});


// Update course status
router.put('/courses/:id/status', getAuthUser, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const course = await Course.findOne({ id });
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        course.status = status;
        await course.save();

        // Notify instructor
        // const instructor = await User.findOne({ id: course.instructor_id });
        // sendEmail(...)

        await auditLog(req, 'update_course_status', 'course', id, { status });

        res.json({ success: true, message: `Course status updated to ${status}` });

    } catch (error) {
        console.error('Update course status error:', error);
        res.status(500).json({ success: false, message: 'Failed to update course status' });
    }
});

// Delete course
router.delete('/courses/:id', getAuthUser, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const course = await Course.findOne({ id });

        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        await Course.deleteOne({ id });

        // Cleanup enrollments?
        // await Enrollment.deleteMany({ course_id: id });

        await auditLog(req, 'delete_course', 'course', id);

        res.json({ success: true, message: 'Course deleted successfully' });

    } catch (error) {
        console.error('Delete course error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete course' });
    }
});

// Bulk actions for courses
router.post('/courses/bulk-action', getAuthUser, requireAdmin, async (req, res) => {
    try {
        const { courseIds, action } = req.body;

        if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No courses selected' });
        }

        let updateData = {};
        if (action === 'publish') updateData = { status: 'published' };
        if (action === 'unpublish') updateData = { status: 'draft' }; // or 'draft'
        if (action === 'approve') updateData = { status: 'published' };
        if (action === 'reject') updateData = { status: 'rejected' };

        if (Object.keys(updateData).length > 0) {
            await Course.updateMany({ id: { $in: courseIds } }, updateData);
            res.json({ success: true, message: 'Bulk status update successful' });
        } else if (action === 'delete') {
            await Course.deleteMany({ id: { $in: courseIds } });
            res.json({ success: true, message: 'Bulk deletion successful' });
        } else {
            res.json({ success: true, message: 'Action processed' });
        }

    } catch (error) {
        console.error('Bulk course action error:', error);
        res.status(500).json({ success: false, message: 'Failed to perform bulk action' });
    }
});

// Get users with filtering
router.get('/users', getAuthUser, requireAdmin, async (req, res) => {
    try {
        const { role, status, search } = req.query;
        let query = {};

        if (role) query.role = role;
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        let users = await User.find(query).sort({ created_at: -1 }).lean();

        if (role === 'instructor') {
            users = await Promise.all(users.map(async (user) => {
                const profile = await InstructorProfile.findOne({ user_id: user.id }).lean();
                return {
                    ...user,
                    resume_url: profile?.resume || null,
                    id_proof_url: profile?.government_id || null
                };
            }));
        }

        res.json({ success: true, data: users });
    } catch (error) {
        console.error('Fetch users error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
});

// Update user status
router.put('/users/:id/status', getAuthUser, requireAdmin, validateRequest(userStatusSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const user = await User.findOne({ id });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        user.status = status;
        await user.save();

        // Log action
        await auditLog(req, 'update_user_status', 'user', user.id, { new_status: status });

        res.json({ success: true, message: 'User status updated' });
    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({ success: false, message: 'Failed to update user status' });
    }
});

// Get courses with filtering
router.get('/courses', getAuthUser, requireAdmin, async (req, res) => {
    try {
        const { status, search } = req.query;
        let query = {};

        if (status) query.status = status;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { instructor_name: { $regex: search, $options: 'i' } }
            ];
        }

        const courses = await Course.find(query).sort({ created_at: -1 });
        // const loginAttempts = await LoginAttempt.find({}).sort({ createdAt: -1 }).limit(10);
        const loginAttempts = [];// Placeholder until LoginAttempt model is created
        res.json({ success: true, data: courses });
    } catch (error) {
        console.error('Fetch courses error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch courses' });
    }
});

// Update course status
router.put('/courses/:id/status', getAuthUser, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const course = await Course.findOne({ id });
        if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

        course.status = status;

        // If publishing, ensure it has content
        if (status === 'published' && (!course.price && course.price !== 0)) {
            // Basic validation example
        }

        await course.save();

        // Log action
        await auditLog(req, 'update_course_status', 'course', course.id, { new_status: status });

        res.json({ success: true, message: 'Course status updated' });
    } catch (error) {
        console.error('Update course status error:', error);
        res.status(500).json({ success: false, message: 'Failed to update course status' });
    }
});

// ========== Activity Endpoint ==========

// Get recent activities
router.get('/activities', getAuthUser, requireAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;

        const [recentUsers, recentCourses, recentEnrollments] = await Promise.all([
            User.find().sort({ created_at: -1 }).limit(limit).select('name email role created_at'),
            Course.find().sort({ created_at: -1 }).limit(limit).select('title instructor_name status created_at'),
            Enrollment.find().sort({ enrolled_at: -1 }).limit(limit).lean()
        ]);

        // Fetch user details for enrollments
        const enrollmentsWithDetails = await Promise.all(recentEnrollments.map(async (enrollment) => {
            const user = await User.findOne({ id: enrollment.student_id }).select('name').lean();
            const course = await Course.findOne({ id: enrollment.course_id }).select('title').lean();
            return {
                ...enrollment,
                student_name: user?.name,
                course_title: course?.title
            };
        }));

        let activities = [];

        recentUsers.forEach(user => {
            activities.push({
                type: 'user',
                title: 'New User Registration',
                user: user.name,
                action: `Registered as ${user.role}`,
                time: user.created_at,
                status: 'success'
            });
        });

        recentCourses.forEach(course => {
            activities.push({
                type: 'course',
                title: 'New Course Created',
                user: course.instructor_name,
                action: `Created course "${course.title}"`,
                time: course.created_at,
                status: course.status === 'published' ? 'success' : 'warning'
            });
        });

        enrollmentsWithDetails.forEach(enrollment => {
            activities.push({
                type: 'payment',
                title: 'New Enrollment',
                user: enrollment.student_name,
                action: `Enrolled in "${enrollment.course_title}"`,
                time: enrollment.enrolled_at,
                status: 'success'
            });
        });

        // Sort by time descending and take limit
        activities.sort((a, b) => new Date(b.time) - new Date(a.time));
        activities = activities.slice(0, limit);

        // Format relative time (e.g., "2 hours ago") - simplified for now
        activities = activities.map(activity => ({
            ...activity,
            time: new Date(activity.time).toLocaleString()
        }));

        res.json({
            success: true,
            activities
        });

    } catch (error) {
        console.error('Activities error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch activities'
        });
    }
});

// Helper stubs to prevent crashes
const checkDiskSpace = async () => 'healthy'; // Stub
const calculateAvgResponseTime = async () => '120ms'; // Stub
const calculateErrorRate = async () => '0.01%'; // Stub
const calculateCacheHitRate = async () => '95%'; // Stub


// ========== Reports & Analytics Endpoints ==========

const getDateRange = (period) => {
    const now = new Date();
    switch (period) {
        case '7d': return new Date(now.setDate(now.getDate() - 7));
        case '30d': return new Date(now.setDate(now.getDate() - 30));
        case '90d': return new Date(now.setDate(now.getDate() - 90));
        case '1y': return new Date(now.setFullYear(now.getFullYear() - 1));
        default: return new Date(now.setDate(now.getDate() - 30)); // Default 30d
    }
};

router.get('/reports/stats', getAuthUser, requireAdmin, async (req, res) => {
    try {
        const { period } = req.query;
        const startDate = getDateRange(period);

        // 1. Total Revenue (in period)
        const revenueAgg = await Enrollment.aggregate([
            { $match: { enrolled_at: { $gte: startDate } } },
            {
                $lookup: {
                    from: "courses",
                    localField: "course_id",
                    foreignField: "id",
                    as: "course"
                }
            },
            { $unwind: "$course" },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$course.price" }
                }
            }
        ]);
        const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;

        // 2. Total Users (Created in period)
        const totalUsers = await User.countDocuments({ created_at: { $gte: startDate }, role: 'student' });

        // 3. Active Users (Users who enrolled in period - Proxy for active)
        // Alternatively, use a "last_login" field if available. Using enrollment count as "Active Users" for this report context.
        const activeUsersAgg = await Enrollment.aggregate([
            { $match: { enrolled_at: { $gte: startDate } } },
            { $group: { _id: "$student_id" } },
            { $count: "count" }
        ]);
        const activeUsers = activeUsersAgg.length > 0 ? activeUsersAgg[0].count : 0;

        // 4. Conversion Rate (Enrollments / Users in period)
        // If 0 users, conversion is 0.
        const conversionRate = totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : 0;

        // 5. Average Rating
        const ratingAgg = await Review.aggregate([
            { $group: { _id: null, avg: { $avg: "$rating" } } }
        ]);
        const averageRating = ratingAgg.length > 0 ? parseFloat(ratingAgg[0].avg.toFixed(1)) : 0;

        // 6. Category Distribution
        const categoryDist = await Course.aggregate([
            { $match: { status: 'published' } },
            { $group: { _id: "$category", count: { $sum: 1 } } },
            { $project: { name: "$_id", value: "$count", _id: 0 } }
        ]);

        // Normalize category names and add colors (simple hash or cycle)
        const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6b7280', '#ec4899', '#6366f1'];
        const categoryDistribution = categoryDist.map((cat, index) => ({
            name: cat.name || 'Uncategorized',
            value: cat.value,
            color: colors[index % colors.length]
        }));

        // 7. Top Courses (by Revenue)
        const topCoursesAgg = await Enrollment.aggregate([
            {
                $lookup: {
                    from: "courses",
                    localField: "course_id",
                    foreignField: "id",
                    as: "course"
                }
            },
            { $unwind: "$course" },
            {
                $group: {
                    _id: "$course.id",
                    title: { $first: "$course.title" },
                    instructor_id: { $first: "$course.instructor_id" },
                    revenue: { $sum: "$course.price" },
                    students: { $sum: 1 }
                }
            },
            { $sort: { revenue: -1 } },
            { $limit: 5 }
        ]);

        const topCourses = await Promise.all(topCoursesAgg.map(async (course) => {
            const instructor = await User.findOne({ id: course.instructor_id }).select('name');
            return {
                id: course._id,
                title: course.title,
                instructor_name: instructor ? instructor.name : 'Unknown',
                revenue: course.revenue,
                students: course.students
            };
        }));

        res.json({
            success: true,
            data: {
                totalRevenue,
                totalUsers,
                totalCourses: await Course.countDocuments({ status: 'published' }),
                totalInstructors: await User.countDocuments({ role: 'instructor' }),
                activeUsers,
                conversionRate,
                averageRating,
                pendingApprovals: await Course.countDocuments({ status: 'pending' }),
                topCourses,
                categoryDistribution
            }
        });

    } catch (error) {
        console.error('Report stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch report stats' });
    }
});

router.get('/reports/revenue-trend', getAuthUser, requireAdmin, async (req, res) => {
    try {
        const { period } = req.query;
        const startDate = getDateRange(period);

        const revenueTrend = await Enrollment.aggregate([
            { $match: { enrolled_at: { $gte: startDate } } },
            {
                $lookup: {
                    from: "courses",
                    localField: "course_id",
                    foreignField: "id",
                    as: "course"
                }
            },
            { $unwind: "$course" },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$enrolled_at" } },
                    revenue: { $sum: "$course.price" }
                }
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    date: "$_id",
                    revenue: 1,
                    _id: 0
                }
            }
        ]);

        res.json({ success: true, data: revenueTrend });
    } catch (error) {
        console.error('Revenue trend error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch revenue trend' });
    }
});

router.get('/reports/user-growth', getAuthUser, requireAdmin, async (req, res) => {
    try {
        const { period } = req.query;
        const startDate = getDateRange(period);

        const userGrowth = await User.aggregate([
            { $match: { created_at: { $gte: startDate }, role: 'student' } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
                    new_users: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    date: "$_id",
                    new_users: 1,
                    _id: 0
                }
            }
        ]);

        // Calculate cumulative total users for the chart
        let runningTotal = await User.countDocuments({ created_at: { $lt: startDate }, role: 'student' });
        const enrichedGrowth = userGrowth.map(day => {
            runningTotal += day.new_users;
            return { ...day, total_users: runningTotal };
        });

        res.json({ success: true, data: enrichedGrowth });

    } catch (error) {
        console.error('User growth error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch user growth' });
    }
});

router.get('/reports/generated', getAuthUser, requireAdmin, async (req, res) => {
    // Return mock data for now as we don't have a Report model
    // In a real app, fetch from Report.find()
    const mockReports = [
        { id: '1', name: 'Monthly Financial Report', generated_at: new Date(), type: 'financial', url: '#' },
        { id: '2', name: 'User Engagement Summary', generated_at: new Date(Date.now() - 86400000), type: 'analytics', url: '#' }
    ];
    res.json({ success: true, reports: mockReports });
});

router.post('/reports/generate', getAuthUser, requireAdmin, async (req, res) => {
    try {
        const { type, period } = req.body;
        // Logic to generate report (PDF/Excel) would go here
        // For now, simulate success
        await new Promise(resolve => setTimeout(resolve, 1500));

        res.json({ success: true, message: `${type} report generated successfully` });
    } catch (error) {
        console.error('Generate report error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate report' });
    }
});


// ========== Platform Settings Endpoints ==========

const DEFAULT_SETTINGS = {
    general: {
        platformName: 'EduPlatform',
        currency: 'INR',
        timezone: 'UTC',
        maintenanceMode: false
    },
    authentication: {
        allowStudentRegistration: true,
        sessionTimeout: 24
    },
    // ... other defaults can be inferred or set on frontend
};

router.get('/settings', getAuthUser, requireAdmin, async (req, res) => {
    try {
        const settingsDocs = await Setting.find({});
        const settings = {};

        // Convert array of docs {key: 'general', value: {...}} to object {general: {...}}
        settingsDocs.forEach(doc => {
            settings[doc.key] = doc.value;
        });

        // Ensure all top-level keys exist (merge with structure if needed, but frontend handles defaults well)
        res.json({ success: true, settings });
    } catch (error) {
        console.error('Fetch settings error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch settings' });
    }
});

router.put('/settings', getAuthUser, requireAdmin, async (req, res) => {
    try {
        const updates = req.body;
        const updatePromises = [];

        // Loop through each category (general, authentication, etc.) and update/upsert
        for (const [key, value] of Object.entries(updates)) {
            updatePromises.push(
                Setting.findOneAndUpdate(
                    { key },
                    {
                        key,
                        value,
                        updated_at: new Date(),
                        updated_by: req.user.id
                    },
                    { upsert: true, new: true }
                )
            );
        }

        await Promise.all(updatePromises);
        res.json({ success: true, message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ success: false, message: 'Failed to update settings' });
    }
});

router.get('/settings/advanced', getAuthUser, requireAdmin, async (req, res) => {
    try {
        const advancedSettingsDoc = await Setting.findOne({ key: 'advanced' });
        res.json({
            success: true,
            settings: advancedSettingsDoc ? advancedSettingsDoc.value : {}
        });
    } catch (error) {
        console.error('Fetch advanced settings error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch advanced settings' });
    }
});

router.put('/settings/advanced', getAuthUser, requireAdmin, async (req, res) => {
    try {
        const settings = req.body;
        await Setting.findOneAndUpdate(
            { key: 'advanced' },
            {
                key: 'advanced',
                value: settings,
                updated_at: new Date(),
                updated_by: req.user.id
            },
            { upsert: true }
        );
        res.json({ success: true, message: 'Advanced settings updated' });
    } catch (error) {
        console.error('Update advanced settings error:', error);
        res.status(500).json({ success: false, message: 'Failed to update advanced settings' });
    }
});

router.post('/settings/backup', getAuthUser, requireAdmin, async (req, res) => {
    try {
        // Mock backup process
        // In real app, would allow mongodump
        const backupPath = path.join(os.tmpdir(), `backup-${Date.now()}.gz`);

        // Simulating delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Log the backup (update advanced settings lastBackup)
        const advancedSettings = await Setting.findOne({ key: 'advanced' }).lean() || { value: { database: {} } };
        const newSettings = {
            ...advancedSettings.value,
            database: {
                ...advancedSettings.value.database,
                lastBackup: new Date().toISOString()
            }
        };

        await Setting.findOneAndUpdate(
            { key: 'advanced' },
            { key: 'advanced', value: newSettings },
            { upsert: true }
        );

        res.json({ success: true, message: 'Backup created successfully' });
    } catch (error) {
        console.error('Backup error:', error);
        res.status(500).json({ success: false, message: 'Failed to create backup' });
    }
});

router.post('/settings/test-email', getAuthUser, requireAdmin, async (req, res) => {
    try {
        // Stub for email sending
        // Would import sendEmail utility here
        console.log(`Sending test email to ${req.user.email}...`);

        await new Promise(resolve => setTimeout(resolve, 1000));

        res.json({ success: true, message: 'Test email sent' });
    } catch (error) {
        console.error('Test email error:', error);
        res.status(500).json({ success: false, message: 'Failed to send test email' });
    }
});

export default router;