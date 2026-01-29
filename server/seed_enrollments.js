
import mongoose from 'mongoose';
import { User, Course, Enrollment } from './models/index.js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lms-studio';

async function seedEnrollments() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');

        // Find Instructor Hari
        const instructor = await User.findOne({ name: 'hari', role: 'instructor' });
        if (!instructor) {
            console.log('Instructor Hari not found');
            return;
        }
        console.log(`Found Instructor: ${instructor.name} (${instructor.id})`);

        // Find Hari's courses
        const courses = await Course.find({ instructor_id: instructor.id });
        if (courses.length === 0) {
            console.log('No courses found for Hari');
            return;
        }
        console.log(`Found ${courses.length} courses for Hari`);

        // Find all students
        const students = await User.find({ role: 'student' });
        console.log(`Found ${students.length} students in the platform`);

        // Enroll every student in every course of Hari
        let addedCount = 0;
        for (const course of courses) {
            for (const student of students) {
                const exists = await Enrollment.findOne({
                    course_id: course.id,
                    student_id: student.id
                });

                if (!exists) {
                    await Enrollment.create({
                        id: uuidv4(),
                        course_id: course.id,
                        student_id: student.id,
                        enrollment_status: 'active',
                        enrolled_at: new Date(),
                        progress: Math.floor(Math.random() * 100) // Random progress for analytics demo
                    });

                    // Increment enrolled count on course
                    await Course.updateOne({ id: course.id }, { $inc: { enrolled_students: 1 } });

                    addedCount++;
                    console.log(`Enrolled ${student.name} into ${course.title}`);
                }
            }
        }

        console.log(`\nSuccessfully added ${addedCount} new enrollments for Instructor Hari.`);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

seedEnrollments();
