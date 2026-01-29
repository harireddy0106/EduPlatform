
import mongoose from 'mongoose';
import { User, Course, Enrollment } from './models/index.js'; // Adjust path if needed
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lms-studio';

async function debugData() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');

        const users = await User.find({});
        console.log('\n--- ALL USERS ---');
        users.forEach(u => console.log(`${u.id} | ${u.role} | ${u.email} | ${u.name}`));

        const courses = await Course.find({});
        console.log('\n--- ALL COURSES ---');
        courses.forEach(c => console.log(`${c.id} | Instruct: ${c.instructor_id} | Status: ${c.status} | Title: ${c.title}`));

        const enrollments = await Enrollment.find({});
        console.log('\n--- ALL ENROLLMENTS ---');
        enrollments.forEach(e => console.log(`Course: ${e.course_id} | Student: ${e.student_id} | Status: ${e.enrollment_status}`));

        if (courses.length > 0) {
            const instructors = new Set(courses.map(c => c.instructor_id));
            console.log('\n--- CHECKING INSTRUCTORS ---');
            for (const instId of instructors) {
                const instructorCourses = courses.filter(c => c.instructor_id === instId).map(c => c.id);
                const instEnrollments = enrollments.filter(e => instructorCourses.includes(e.course_id));
                const uniqueStudents = new Set(instEnrollments.map(e => e.student_id));

                const instructorUser = users.find(u => u.id === instId);
                const instructorName = instructorUser ? instructorUser.name : 'Unknown';

                console.log(`Instructor ${instructorName} (${instId}):`);
                console.log(`  Courses: ${instructorCourses.length}`);
                console.log(`  Enrollments: ${instEnrollments.length}`);
                console.log(`  Unique Students: ${uniqueStudents.size}`);
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

debugData();
