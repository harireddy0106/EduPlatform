import express from 'express';
import { Course, Enrollment, Assignment, Submission, Review, Lecture, InstructorProfile, User } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get instructor profile
router.get('/:id/profile', async (req, res) => {
    try {
        const userId = req.params.id;
        const profile = await InstructorProfile.findOne({ user_id: userId });

        res.json({
            success: true,
            data: profile || null
        });
    } catch (error) {
        console.error('Fetch profile error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch profile' });
    }
});

// Create or update instructor profile
router.put('/:id/profile', async (req, res) => {
    try {
        const userId = req.params.id;
        const incomingData = req.body;

        // Extract User specific data (from basic section or root)
        const name = incomingData.basic?.name || incomingData.name;
        const avatar = incomingData.basic?.avatar || incomingData.avatar;

        // Update User model if name or avatar is provided
        if (name || avatar !== undefined) {
            const userUpdate = {};
            if (name) userUpdate.name = name;
            if (avatar !== undefined) userUpdate.avatar = avatar;
            await User.findOneAndUpdate({ id: userId }, userUpdate);
        }

        // Prepare InstructorProfile data by flattening nested structures
        const profileData = {
            // Basic
            title: incomingData.basic?.title,
            bio: incomingData.basic?.bio,
            languages: incomingData.basic?.languages,
            location: incomingData.basic?.location,

            // Contact
            phone: incomingData.contact?.phone,
            website: incomingData.contact?.website,
            // email is usually in User model, but we can store if needed or ignore

            // Professional
            experience: incomingData.professional?.experience,
            current_org: incomingData.professional?.current_org,
            skills: incomingData.professional?.skills,
            qualifications: incomingData.professional?.qualifications,

            // Teaching
            teaching_categories: incomingData.teaching?.teaching_categories,
            teaching_mode: incomingData.teaching?.teaching_mode,
            hourly_rate: incomingData.teaching?.hourly_rate,
            availability: incomingData.teaching?.availability,

            // Verification
            verification_status: incomingData.verification?.verification_status || 'pending',
            government_id: incomingData.verification?.government_id,
            government_id_name: incomingData.verification?.government_id_name,
            resume: incomingData.verification?.resume,
            resume_name: incomingData.verification?.resume_name,

            // Social & Branding
            linkedin: incomingData.social?.linkedin,
            github: incomingData.social?.github,
            youtube: incomingData.social?.youtube,
            twitter: incomingData.social?.twitter,
            instagram: incomingData.social?.instagram,
            logo: incomingData.social?.logo,
            logo_name: incomingData.social?.logo_name,
            intro_video: incomingData.social?.intro_video,
            intro_video_name: incomingData.social?.intro_video_name,

            // Payment
            bank_details: incomingData.payment?.bank_details,
            payout_method: incomingData.payment?.payout_method,
            tax_id: incomingData.payment?.tax_id,

            // Settings
            is_public: incomingData.settings?.is_public,
            notification_email: incomingData.settings?.notification_email,
            notification_course_updates: incomingData.settings?.notification_course_updates,
            notification_promotions: incomingData.settings?.notification_promotions,
            profile_completed: incomingData.profile_completed || incomingData.settings?.profile_completed || false,

            updated_at: new Date()
        };

        // Remove undefined keys to avoid overwriting with null/undefined if not sent
        Object.keys(profileData).forEach(key => profileData[key] === undefined && delete profileData[key]);

        let profile = await InstructorProfile.findOne({ user_id: userId });

        if (profile) {
            // Update existing
            profile = await InstructorProfile.findOneAndUpdate(
                { user_id: userId },
                profileData,
                { new: true }
            );
        } else {
            // Create new
            profile = new InstructorProfile({
                id: uuidv4(),
                user_id: userId,
                ...profileData,
                created_at: new Date()
            });
            await profile.save();
        }

        res.json({
            success: true,
            data: profile,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
});

// Get instructor courses with details
router.get('/:id/courses', async (req, res) => {
    try {
        const instructorId = req.params.id;
        const courses = await Course.find({ instructor_id: instructorId }).sort({ created_at: -1 }).lean();

        // Add lecture count and enrollment count to each course
        const coursesWithData = await Promise.all(courses.map(async (course) => {
            const lecturesCount = await Lecture.countDocuments({ course_id: course.id });
            const enrolledCount = await Enrollment.countDocuments({ course_id: course.id });
            return {
                ...course,
                lectures: lecturesCount,
                enrolled_students: enrolledCount
            };
        }));

        res.json({
            success: true,
            data: coursesWithData
        });
    } catch (error) {
        console.error('Fetch instructor courses error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch courses' });
    }
});

// Get instructor stats
// Get instructor stats
router.get('/:id/stats', async (req, res) => {
    try {
        const instructorId = req.params.id;

        // Get all courses by this instructor
        const courses = await Course.find({ instructor_id: instructorId });

        const courseIds = courses.map(c => c.id);

        // Calculate total students (unique enrollments)
        const enrollments = await Enrollment.find({ course_id: { $in: courseIds } });

        const uniqueStudentIds = new Set(enrollments.map(e => e.student_id));

        // Calculate total revenue
        // Create a map of courseId -> price
        const coursePriceMap = courses.reduce((acc, course) => {
            acc[course.id] = course.price || 0;
            return acc;
        }, {});

        // Sum up revenue from all enrollments
        const totalRevenue = enrollments.reduce((sum, enrollment) => {
            return sum + (coursePriceMap[enrollment.course_id] || 0);
        }, 0);

        // Calculate average rating
        const reviews = await Review.find({ course_id: { $in: courseIds } });
        const totalRating = reviews.reduce((acc, rev) => acc + rev.rating, 0);
        const avgRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : 0;

        res.json({
            success: true,
            data: {
                total_courses: courses.length,
                published_courses: courses.filter(c => c.status === 'published').length,
                total_students: uniqueStudentIds.size,
                active_students: uniqueStudentIds.size,
                total_revenue: totalRevenue,
                monthly_revenue: 0, // Could be calculated similarly with date filter
                average_rating: avgRating,
                total_reviews: reviews.length
            }
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch stats' });
    }
});

// Skip profile setup
router.put('/:id/skip-profile', async (req, res) => {
    try {
        const userId = req.params.id;
        await User.findOneAndUpdate({ id: userId }, { profile_setup_skipped: true });
        res.json({ success: true, message: 'Profile setup skipped' });
    } catch (error) {
        console.error("Skip profile setup error:", error);
        res.status(500).json({ error: "Failed to skip profile setup" });
    }
});

// Get instructor analytics
router.get('/:id/analytics', async (req, res) => {
    try {
        const instructorId = req.params.id;
        const courses = await Course.find({ instructor_id: instructorId });
        const courseIds = courses.map(c => c.id);

        // Create a map of courseId -> price for revenue calculation
        const coursePriceMap = courses.reduce((acc, course) => {
            acc[course.id] = course.price || 0;
            return acc;
        }, {});

        // Aggregate enrollments by month for the last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const enrollmentAnalytics = await Enrollment.aggregate([
            {
                $match: {
                    course_id: { $in: courseIds },
                    enrolled_at: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        month: { $month: "$enrolled_at" },
                        year: { $year: "$enrolled_at" },
                        course_id: "$course_id"
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Process aggregation results to format for frontend
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Initialize data structure for last 6 months
        const analyticsData = {};
        for (let i = 0; i < 6; i++) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
            analyticsData[key] = { name: key, revenue: 0, students: 0 };
        }

        enrollmentAnalytics.forEach(item => {
            const dateKey = `${months[item._id.month - 1]} ${item._id.year}`;
            if (analyticsData[dateKey]) {
                analyticsData[dateKey].students += item.count;
                analyticsData[dateKey].revenue += (coursePriceMap[item._id.course_id] || 0) * item.count;
            }
        });

        // Convert to array and reverse to show oldest to newest
        const chartData = Object.values(analyticsData).reverse();

        res.json({
            success: true,
            data: {
                revenue_data: chartData,
                enrollment_data: chartData
            }
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
    }
});

// Get recent enrollments
router.get('/:id/enrollments/recent', async (req, res) => {
    try {
        const instructorId = req.params.id;
        const courses = await Course.find({ instructor_id: instructorId });
        const courseIds = courses.map(c => c.id);

        // Find enrollments for these courses, sort by date desc
        // We need student names, but Enrollment schema only has student_id. 
        // Ideally we shouldn't do N+1. 
        // optimize: perform aggregate lookup

        const enrollments = await Enrollment.aggregate([
            { $match: { course_id: { $in: courseIds } } },
            { $sort: { enrolled_at: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'users',
                    localField: 'student_id',
                    foreignField: 'id',
                    as: 'student'
                }
            },
            {
                $lookup: {
                    from: 'courses',
                    localField: 'course_id',
                    foreignField: 'id',
                    as: 'course'
                }
            },
            {
                $project: {
                    id: 1,
                    enrolled_at: 1,
                    student_name: { $arrayElemAt: ['$student.name', 0] },
                    course_title: { $arrayElemAt: ['$course.title', 0] }
                }
            }
        ]);

        res.json({ success: true, data: enrollments });
    } catch (error) {
        console.error('Enrollments error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch recent enrollments' });
    }
});

// Get recent submissions
router.get('/:id/submissions/recent', async (req, res) => {
    try {
        const instructorId = req.params.id;
        const courses = await Course.find({ instructor_id: instructorId });
        const courseIds = courses.map(c => c.id);

        // Find assignments for these courses
        const assignments = await Assignment.find({ course_id: { $in: courseIds } });
        const assignmentIds = assignments.map(a => a.id);

        const submissions = await Submission.aggregate([
            { $match: { assignment_id: { $in: assignmentIds } } },
            { $sort: { submitted_at: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'assignments',
                    localField: 'assignment_id',
                    foreignField: 'id',
                    as: 'assignment'
                }
            },
            {
                $project: {
                    id: 1,
                    submitted_at: 1,
                    grade: 1,
                    student_name: 1, // Submission schema has student_name
                    assignment_title: { $arrayElemAt: ['$assignment.title', 0] },
                    status: {
                        $cond: { if: { $ne: ["$grade", ""] }, then: "graded", else: "pending" }
                    }
                }
            }
        ]);

        res.json({ success: true, data: submissions });
    } catch (error) {
        console.error('Submissions error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch recent submissions' });
    }
});

// Get all submissions
router.get('/:id/submissions', async (req, res) => {
    try {
        const instructorId = req.params.id;
        const courses = await Course.find({ instructor_id: instructorId });
        const courseIds = courses.map(c => c.id);

        const assignments = await Assignment.find({ course_id: { $in: courseIds } });
        const assignmentIds = assignments.map(a => a.id);

        const submissions = await Submission.aggregate([
            { $match: { assignment_id: { $in: assignmentIds } } },
            { $sort: { submitted_at: -1 } },
            {
                $lookup: {
                    from: 'assignments',
                    localField: 'assignment_id',
                    foreignField: 'id',
                    as: 'assignment'
                }
            },
            {
                $project: {
                    id: 1,
                    submitted_at: 1,
                    grade: 1,
                    student_name: 1,
                    assignment_title: { $arrayElemAt: ['$assignment.title', 0] },
                    assignment_type: { $arrayElemAt: ['$assignment.type', 0] },
                    assignment_questions: { $arrayElemAt: ['$assignment.questions', 0] },
                    file_url: 1,
                    text_content: 1,
                    answers: 1,
                    feedback: 1,
                    status: {
                        $cond: { if: { $ne: ["$grade", ""] }, then: "graded", else: "pending" }
                    }
                }
            }
        ]);

        res.json({ success: true, data: submissions });
    } catch (error) {
        console.error('All submissions error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch submissions' });
    }
});

// Get all enrolled students for an instructor
router.get('/:id/students', async (req, res) => {
    try {
        const instructorId = req.params.id;
        const courses = await Course.find({ instructor_id: instructorId });
        const courseIds = courses.map(c => c.id);

        const enrollments = await Enrollment.aggregate([
            { $match: { course_id: { $in: courseIds } } },
            { $sort: { enrolled_at: -1 } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'student_id',
                    foreignField: 'id',
                    as: 'student'
                }
            },
            {
                $lookup: {
                    from: 'courses',
                    localField: 'course_id',
                    foreignField: 'id',
                    as: 'course'
                }
            },
            {
                $project: {
                    id: 1,
                    enrolled_at: 1,
                    student_id: 1,
                    student_user_id: { $arrayElemAt: ['$student.id', 0] },
                    student_name: { $arrayElemAt: ['$student.name', 0] },
                    student_email: { $arrayElemAt: ['$student.email', 0] },
                    course_title: { $arrayElemAt: ['$course.title', 0] }
                }
            }
        ]);

        res.json({ success: true, data: enrollments });
    } catch (error) {
        console.error('Students fetch error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch students' });
    }
});

// Get instructor earnings data
router.get('/:id/earnings', async (req, res) => {
    try {
        const instructorId = req.params.id;
        const courses = await Course.find({ instructor_id: instructorId });
        const courseIds = courses.map(c => c.id);

        // Map course ID to price
        const coursePriceMap = courses.reduce((acc, course) => {
            acc[course.id] = course.price || 0;
            return acc;
        }, {});

        // Get all enrollments for these courses
        const enrollments = await Enrollment.aggregate([
            { $match: { course_id: { $in: courseIds } } },
            { $sort: { enrolled_at: -1 } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'student_id',
                    foreignField: 'id',
                    as: 'student'
                }
            },
            {
                $lookup: {
                    from: 'courses',
                    localField: 'course_id',
                    foreignField: 'id',
                    as: 'course'
                }
            },
            {
                $project: {
                    id: 1,
                    enrolled_at: 1,
                    student_name: { $arrayElemAt: ['$student.name', 0] },
                    course_title: { $arrayElemAt: ['$course.title', 0] },
                    amount: 1, // Will populate below
                    course_id: 1
                }
            }
        ]);

        // Calculate financials
        let totalEarnings = 0;
        let monthlyIncome = 0;
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const transactions = enrollments.map(enrollment => {
            const amount = coursePriceMap[enrollment.course_id] || 0;
            const date = new Date(enrollment.enrolled_at);

            totalEarnings += amount;

            if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
                monthlyIncome += amount;
            }

            return {
                id: enrollment.id,
                date: enrollment.enrolled_at,
                student: enrollment.student_name || 'Unknown Student',
                course: enrollment.course_title || 'Unknown Course',
                amount: amount,
                status: 'Completed' // Assuming enrollment = paid
            };
        });

        // Mock Payouts (simulate payouts for previous months)
        const payoutHistory = [];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Generate last 3 payouts if totalEarnings > 0
        if (totalEarnings > 0) {
            for (let i = 1; i <= 3; i++) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                // Simple mock amount varies slightly
                const amount = Math.floor(Math.random() * (totalEarnings / 4)) + 100;

                payoutHistory.push({
                    id: `pay_${d.getTime()}`,
                    amount: amount,
                    status: 'Processed',
                    date: d.toISOString(),
                    method: 'Bank Transfer'
                });
            }
        }

        // Determine current payout status
        // logic: if earnings in current month > 0, status is Processing
        const payoutStatus = monthlyIncome > 0 ? "In Progress" : "No Pending Payouts";

        res.json({
            success: true,
            data: {
                total_earnings: totalEarnings,
                monthly_income: monthlyIncome,
                payout_status: payoutStatus,
                transactions: transactions,
                payouts: payoutHistory
            }
        });

    } catch (error) {
        console.error('Earnings fetch error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch earnings data' });
    }
});

export default router;
