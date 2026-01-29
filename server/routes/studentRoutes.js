
import express from 'express';
import { Enrollment, Course, Assignment, Submission, Certificate, Notification, User, InstructorProfile, StudentProfile } from '../models/index.js';
import { getAuthUser } from '../utils/auth.js';

const router = express.Router();
import { v4 as uuidv4 } from 'uuid';

// Get Student Profile
router.get('/:id/profile', getAuthUser, async (req, res) => {
    try {
        const userId = req.params.id;

        if (req.currentUser.id !== userId && req.currentUser.role !== 'admin') {
            return res.status(403).json({ detail: "Unauthorized" });
        }

        const user = await User.findOne({ id: userId }).lean();
        if (!user) return res.status(404).json({ detail: "User not found" });

        const profile = await StudentProfile.findOne({ user_id: userId }).lean();

        // Merge User and Profile data
        const responseData = {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            role: user.role,
            ...profile, // This spreads existing profile data if any
            // If profile is null, the above spread does nothing mostly, but let's be explicit
        };

        // If profile didn't exist, we send null for those fields implicitly or we can set defaults
        if (!profile) {
            responseData.profile_completed = false;
        }

        res.json({ data: responseData });
    } catch (error) {
        console.error('Get student profile error:', error);
        res.status(500).json({ detail: "Failed to fetch student profile" });
    }
});

// Update Student Profile
router.put('/:id/profile', getAuthUser, async (req, res) => {
    try {
        const userId = req.params.id;

        if (req.currentUser.id !== userId && req.currentUser.role !== 'admin') {
            return res.status(403).json({ detail: "Unauthorized" });
        }

        const {
            name,
            phone,
            date_of_birth,
            gender,
            location,
            country,
            timezone,
            education_level,
            field_of_study,
            skills_interested_in,
            current_skill_level,
            learning_goals,
            certifications,
            preferred_categories,
            learning_mode,
            daily_learning_time,
            language_preference,
            linkedin,
            github,
            portfolio,
            resume,
            resume_name,
            cover_letter,
            cover_letter_name,
            notification_preferences,
            privacy_settings,
            accessibility_preferences,
            theme_preference
        } = req.body;

        // 1. Update User model (Basic fields shared)
        const userUpdate = {};
        if (name) userUpdate.name = name;
        // Optionally update avatar if it was sent, though it is usually handled by separate upload or handled if I add it to destructuring
        if (req.body.avatar) userUpdate.avatar = req.body.avatar;

        const user = await User.findOneAndUpdate(
            { id: userId },
            { $set: userUpdate },
            { new: true }
        );

        if (!user) return res.status(404).json({ detail: "User not found" });

        // 2. Update or Create StudentProfile
        let profile = await StudentProfile.findOne({ user_id: userId });

        const profileData = {
            phone,
            date_of_birth,
            gender,
            location,
            country,
            timezone,
            education_level,
            field_of_study,
            skills_interested_in,
            current_skill_level,
            learning_goals,
            certifications,
            preferred_categories,
            learning_mode,
            daily_learning_time,
            language_preference,
            linkedin,
            github,
            portfolio,
            resume,
            resume_name,
            cover_letter,
            cover_letter_name,
            notification_preferences,
            privacy_settings,
            accessibility_preferences,
            theme_preference,
            profile_completed: true,
            updated_at: new Date()
        };

        if (profile) {
            // Update existing
            profile = await StudentProfile.findOneAndUpdate(
                { user_id: userId },
                { $set: profileData },
                { new: true }
            );
        } else {
            // Create new
            profile = new StudentProfile({
                id: uuidv4(),
                user_id: userId,
                ...profileData,
                created_at: new Date()
            });
            await profile.save();
        }

        res.json({
            success: true,
            message: "Profile updated successfully",
            data: { ...user.toObject(), ...profile.toObject() }
        });

    } catch (error) {
        console.error('Update student profile error:', error);
        res.status(500).json({ detail: "Failed to update student profile" });
    }
});

// Get enrolled courses
router.get('/:id/courses/enrolled', getAuthUser, async (req, res) => {
    try {
        const studentId = req.params.id;

        if (req.currentUser.id !== studentId && req.currentUser.role !== 'admin') {
            return res.status(403).json({ detail: "Unauthorized" });
        }

        const enrollments = await Enrollment.find({
            student_id: studentId,
            enrollment_status: { $in: ['active', 'completed'] }
        }).lean();

        const courseIds = enrollments.map(e => e.course_id);
        const courses = await Course.find({ id: { $in: courseIds } }).lean();

        const certificates = await Certificate.find({ user_id: studentId }).lean();

        // Merge course data with enrollment and certificate data
        const enrolledCourses = courses.map(course => {
            const enrollment = enrollments.find(e => e.course_id === course.id);
            const certificate = certificates.find(c => c.course_id === course.id);
            return {
                ...course,
                enrollment: enrollment,
                certificate: certificate,
                progress: enrollment.progress || 0
            };
        });

        res.json({ data: enrolledCourses });
    } catch (error) {
        console.error('Fetch enrolled courses error:', error);
        res.status(500).json({ detail: "Failed to fetch enrolled courses" });
    }
});

// Get student stats
router.get('/:id/stats', getAuthUser, async (req, res) => {
    try {
        const studentId = req.params.id;

        // verify user is requesting their own stats or is admin
        if (req.currentUser.id !== studentId && req.currentUser.role !== 'admin') {
            return res.status(403).json({ detail: "Unauthorized" });
        }

        const enrollments = await Enrollment.find({ student_id: studentId });
        const certificates = await Certificate.find({ user_id: studentId });

        // Count assignments due
        // Just a simple count of all assignments in enrolled courses for now
        const activeEnrollments = enrollments.filter(e => e.enrollment_status === 'active');
        const courseIds = activeEnrollments.map(e => e.course_id);
        const assignmentCount = await Assignment.countDocuments({ course_id: { $in: courseIds } });

        const activeCourses = enrollments.filter(e => e.enrollment_status === 'active').length;
        const completedCourses = enrollments.filter(e => e.enrollment_status === 'completed').length;

        const totalProgress = activeEnrollments.reduce((sum, e) => sum + (e.progress || 0), 0);
        const averageProgress = activeEnrollments.length > 0 ? Math.round(totalProgress / activeEnrollments.length) : 0;

        res.json({
            data: {
                active_courses: activeCourses,
                completed_courses: completedCourses,
                average_progress: averageProgress,
                certificates: certificates.length,
                enrolled_courses: enrollments.length,
                assignments_due: assignmentCount // Adding this field
            }
        });

    } catch (error) {
        console.error('Get student stats error:', error);
        res.status(500).json({ detail: "Failed to fetch student stats" });
    }
});

// Get upcoming assignments
router.get('/:id/assignments/upcoming', getAuthUser, async (req, res) => {
    try {
        const studentId = req.params.id;

        if (req.currentUser.id !== studentId && req.currentUser.role !== 'admin') {
            return res.status(403).json({ detail: "Unauthorized" });
        }

        // Get active enrollments
        const enrollments = await Enrollment.find({
            student_id: studentId,
            enrollment_status: 'active'
        });

        const courseIds = enrollments.map(e => e.course_id);

        const allAssignments = await Assignment.find({
            course_id: { $in: courseIds }
        }).lean();

        // Get courses to attach titles
        const courses = await Course.find({ id: { $in: courseIds } }).lean();
        const courseMap = {};
        courses.forEach(c => courseMap[c.id] = c);

        const now = new Date();

        const upcoming = allAssignments.filter(a => {
            if (!a.due_date) return true; // if no due date, show it
            const dueDate = new Date(a.due_date);
            return dueDate > now;
        }).map(a => ({
            ...a,
            course_title: courseMap[a.course_id]?.title || 'Unknown Course',
            status: 'upcoming'
        }));

        // Sort by due date
        upcoming.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

        res.json({
            data: upcoming
        });

    } catch (error) {
        console.error('Get upcoming assignments error:', error);
        res.status(500).json({ detail: "Failed to fetch upcoming assignments" });
    }
});

// Get completed assignments
router.get('/:id/assignments/completed', getAuthUser, async (req, res) => {
    try {
        const studentId = req.params.id;

        if (req.currentUser.id !== studentId && req.currentUser.role !== 'admin') {
            return res.status(403).json({ detail: "Unauthorized" });
        }

        const submissions = await Submission.find({ student_id: studentId }).lean();
        const assignmentIds = submissions.map(s => s.assignment_id);

        const assignments = await Assignment.find({ id: { $in: assignmentIds } }).lean();
        const courseIds = assignments.map(a => a.course_id);
        const courses = await Course.find({ id: { $in: courseIds } }).lean();

        const courseMap = {};
        courses.forEach(c => courseMap[c.id] = c);

        const assignmentMap = {};
        assignments.forEach(a => assignmentMap[a.id] = a);

        const completed = submissions.map(s => {
            const assignment = assignmentMap[s.assignment_id];
            return {
                ...s, // submission details (grade, submitted_at)
                title: assignment?.title || 'Unknown Assignment',
                course_title: courseMap[assignment?.course_id]?.title || 'Unknown Course',
                assignment_type: assignment?.type,
                assignment_id: assignment?.id
            };
        });

        // Sort by submitted date
        completed.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));

        res.json({ data: completed });

    } catch (error) {
        console.error('Get completed assignments error:', error);
        res.status(500).json({ detail: "Failed to fetch completed assignments" });
    }
});

// Get recommended courses
router.get('/:id/courses/recommended', getAuthUser, async (req, res) => {
    try {
        // Simple recommendation: Top rated published courses the student is NOT enrolled in
        const studentId = req.params.id;

        const enrollments = await Enrollment.find({ student_id: studentId });
        const enrolledCourseIds = enrollments.map(e => e.course_id);

        const courses = await Course.find({
            status: 'published',
            id: { $nin: enrolledCourseIds }
        })
            .sort({ average_rating: -1, enrolled_students: -1 })
            .limit(4)
            .lean();

        res.json({ data: courses });
    } catch (error) {
        console.error('Recommended courses error:', error);
        res.status(500).json({ detail: "Failed to fetch recommendations" });
    }
});

// Get recent activity (using the endpoint name requested by frontend)
router.get('/:id/activity/recent', getAuthUser, async (req, res) => {
    try {
        const studentId = req.params.id;

        if (req.currentUser.id !== studentId && req.currentUser.role !== 'admin') {
            return res.status(403).json({ detail: "Unauthorized" });
        }

        // Combine recent enrollments and submissions
        const enrollments = await Enrollment.find({ student_id: studentId })
            .sort({ enrolled_at: -1 })
            .limit(5)
            .lean();

        const submissions = await Submission.find({ student_id: studentId })
            .sort({ submitted_at: -1 })
            .limit(5)
            .lean();

        const certificates = await Certificate.find({ user_id: studentId })
            .sort({ issued_at: -1 })
            .limit(5)
            .lean();

        // Fetch course info
        const courseIds = [
            ...enrollments.map(e => e.course_id),
            ...certificates.map(c => c.course_id)
        ];

        const courses = await Course.find({ id: { $in: courseIds } }).lean();
        const courseMap = {};
        courses.forEach(c => courseMap[c.id] = c);

        // Normalize and merge
        const activities = [];

        enrollments.forEach(e => {
            activities.push({
                id: e.id,
                type: 'enrollment',
                description: `Enrolled in ${courseMap[e.course_id]?.title || 'a course'}`,
                created_at: e.enrolled_at,
                course_id: e.course_id
            });
        });

        submissions.forEach(s => {
            activities.push({
                id: s.id,
                type: 'submission',
                description: `Submitted assignment`,
                created_at: s.submitted_at
            });
        });

        certificates.forEach(c => {
            activities.push({
                id: c.id,
                type: 'completion',
                description: `Earned certificate in ${courseMap[c.course_id]?.title || 'a course'}`,
                created_at: c.issued_at,
                course_id: c.course_id
            });
        });

        // Sort combined list
        activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.json({
            data: activities.slice(0, 10)
        });

    } catch (error) {
        console.error('Get student activity error:', error);
        res.status(500).json({ detail: "Failed to fetch student activity" });
    }
});

// Get user notifications
router.get('/:id/notifications', getAuthUser, async (req, res) => {
    try {
        const userId = req.params.id;

        if (req.currentUser.id !== userId && req.currentUser.role !== 'admin') {
            return res.status(403).json({ detail: "Unauthorized" });
        }

        const notifications = await Notification.find({ user_id: userId })
            .sort({ created_at: -1 })
            .limit(20)
            .lean();

        res.json({ data: notifications });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ detail: "Failed to fetch notifications" });
    }
});

// Mark all notifications as read
router.put('/:id/notifications/read-all', getAuthUser, async (req, res) => {
    try {
        const userId = req.params.id;

        if (req.currentUser.id !== userId && req.currentUser.role !== 'admin') {
            return res.status(403).json({ detail: "Unauthorized" });
        }

        await Notification.updateMany(
            { user_id: userId, read: false },
            { $set: { read: true } }
        );

        res.json({ success: true, message: "All notifications marked as read" });
    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({ detail: "Failed to update notifications" });
    }
});

// Get all faculty (instructors)
router.get('/instructors/all', async (req, res) => {
    try {
        // Find all users with role 'instructor'
        const users = await User.find({ role: 'instructor' }).lean();
        const userIds = users.map(u => u.id);

        // Find their profiles
        const profiles = await InstructorProfile.find({ user_id: { $in: userIds } }).lean();

        // Merge data
        const instructors = users.map(user => {
            const profile = profiles.find(p => p.user_id === user.id);
            return {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,

                // Basic
                title: profile?.title || 'Instructor',
                bio: profile?.bio || '',
                location: profile?.location || '',
                languages: profile?.languages || [],

                // Professional
                specialization: profile?.teaching_categories || [],
                experience: profile?.experience || 0,
                current_org: profile?.current_org || '',
                skills: profile?.skills || [],
                qualifications: profile?.qualifications || [],

                // Contact & Social
                phone: profile?.phone || '',
                website: profile?.website || '',
                linkedin: profile?.linkedin || '',
                github: profile?.github || '',
                twitter: profile?.twitter || '',

                // Stats (Mock for now)
                rating: 4.8,
                students: 120,
                courses_count: 5
            };
        });

        // Optional: Calculate real stats for each instructor (expensive for large lists)
        // For now, we'll return the basic profile info

        res.json({ data: instructors });
    } catch (error) {
        console.error('Fetch faculty error:', error);
        res.status(500).json({ detail: "Failed to fetch faculty" });
    }
});
// Get Wishlist
router.get('/:id/wishlist', getAuthUser, async (req, res) => {
    try {
        const userId = req.params.id;
        // Allow if user is self
        if (req.currentUser.id !== userId) return res.status(403).json({ message: "Unauthorized" });

        const user = await User.findOne({ id: userId });
        if (!user) return res.status(404).json({ message: "User not found" });

        const wishlistCourseIds = user.wishlist || []; // Use empty array if undefined
        const courses = await Course.find({ id: { $in: wishlistCourseIds } });

        res.json({ success: true, data: courses });
    } catch (error) {
        console.error("Get wishlist error:", error);
        res.status(500).json({ message: "Failed to fetch wishlist" });
    }
});

// Toggle Wishlist
router.post('/:id/wishlist/toggle', getAuthUser, async (req, res) => {
    try {
        const userId = req.params.id;
        const { courseId } = req.body;

        if (req.currentUser.id !== userId) return res.status(403).json({ message: "Unauthorized" });

        const user = await User.findOne({ id: userId });
        if (!user) return res.status(404).json({ message: "User not found" });

        let wishlist = user.wishlist || [];
        const index = wishlist.indexOf(courseId);
        let isWishlisted = false;

        if (index === -1) {
            wishlist.push(courseId);
            isWishlisted = true;
        } else {
            wishlist.splice(index, 1);
            isWishlisted = false;
        }

        user.wishlist = wishlist;
        await user.save();

        res.json({ success: true, wishlist: user.wishlist, isWishlisted });
    } catch (error) {
        console.error("Toggle wishlist error:", error);
        res.status(500).json({ message: "Failed to toggle wishlist" });
    }
});

export default router;
