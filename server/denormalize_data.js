
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import {
    Course,
    User,
    Lecture,
    Assignment,
    Submission,
    Enrollment,
    Certificate
} from './models/index.js';

dotenv.config();

const mongoUrl = process.env.MONGO_URI || process.env.MONGO_URL;

if (!mongoUrl) {
    console.error("❌ MONGO_URI or MONGO_URL not found in environment variables");
    process.exit(1);
}

const denormalizeData = async () => {
    try {
        console.log("🔌 Connecting to MongoDB...");
        await mongoose.connect(mongoUrl, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
        });
        console.log("✅ Connected to MongoDB");

        // Cache for lookups to avoid N+1 queries
        const courseCache = new Map();
        const userCache = new Map();

        const getCourse = async (id) => {
            if (courseCache.has(id)) return courseCache.get(id);
            const course = await Course.findOne({ id }).lean();
            if (course) courseCache.set(id, course);
            return course;
        };

        const getUser = async (id) => {
            if (userCache.has(id)) return userCache.get(id);
            const user = await User.findOne({ id }).lean();
            if (user) userCache.set(id, user);
            return user;
        };

        // 1. Update Lectures
        console.log("🔄 Updating Lectures...");
        const lectures = await Lecture.find({});
        for (const lecture of lectures) {
            if (!lecture.course_name || !lecture.instructor_name) {
                const course = await getCourse(lecture.course_id);
                if (course) {
                    lecture.course_name = course.title;
                    lecture.instructor_name = course.instructor_name;
                    await lecture.save();
                }
            }
        }
        console.log(`✅ Updated ${lectures.length} Lectures`);

        // 2. Update Assignments
        console.log("🔄 Updating Assignments...");
        const assignments = await Assignment.find({});
        for (const assignment of assignments) {
            if (!assignment.course_name || !assignment.instructor_name) {
                const course = await getCourse(assignment.course_id);
                if (course) {
                    assignment.course_name = course.title;
                    assignment.instructor_name = course.instructor_name;
                    await assignment.save();
                }
            }
        }
        console.log(`✅ Updated ${assignments.length} Assignments`);

        // 3. Update Enrollments
        console.log("🔄 Updating Enrollments...");
        const enrollments = await Enrollment.find({});
        for (const enrollment of enrollments) {
            let changed = false;

            if (!enrollment.course_name || !enrollment.instructor_name) {
                const course = await getCourse(enrollment.course_id);
                if (course) {
                    enrollment.course_name = course.title;
                    enrollment.instructor_name = course.instructor_name;
                    changed = true;
                }
            }
            if (!enrollment.student_name) {
                const student = await getUser(enrollment.student_id);
                if (student) {
                    enrollment.student_name = student.name;
                    changed = true;
                }
            }

            if (changed) await enrollment.save();
        }
        console.log(`✅ Updated ${enrollments.length} Enrollments`);

        // 4. Update Certificates
        console.log("🔄 Updating Certificates...");
        const certificates = await Certificate.find({});
        for (const cert of certificates) {
            let changed = false;

            if (!cert.course_name || !cert.instructor_name) {
                const course = await getCourse(cert.course_id);
                if (course) {
                    cert.course_name = course.title;
                    cert.instructor_name = course.instructor_name;
                    changed = true;
                }
            }

            if (!cert.student_name) {
                const student = await getUser(cert.user_id);
                if (student) {
                    cert.student_name = student.name;
                    changed = true;
                }
            }

            if (changed) await cert.save();
        }
        console.log(`✅ Updated ${certificates.length} Certificates`);

        // 5. Update Submissions
        console.log("🔄 Updating Submissions...");
        const submissions = await Submission.find({});
        for (const sub of submissions) {
            let changed = false;

            // Get Assignment details first to find course
            let courseId = null;
            const assignment = await Assignment.findOne({ id: sub.assignment_id }).lean();
            if (assignment) {
                courseId = assignment.course_id;
            }

            if (courseId && (!sub.course_name || !sub.instructor_name)) {
                const course = await getCourse(courseId);
                if (course) {
                    sub.course_name = course.title;
                    sub.instructor_name = course.instructor_name;
                    changed = true;
                }
            }

            if (!sub.student_name) {
                const student = await getUser(sub.student_id);
                if (student) {
                    sub.student_name = student.name;
                    changed = true;
                }
            }

            if (changed) await sub.save();
        }
        console.log(`✅ Updated ${submissions.length} Submissions`);

        console.log("\n🎉 Database denormalization complete!");

    } catch (error) {
        console.error("❌ Error running migration:", error);
    } finally {
        await mongoose.connection.close();
        console.log("👋 Disconnected from MongoDB");
        process.exit(0);
    }
};

denormalizeData();
