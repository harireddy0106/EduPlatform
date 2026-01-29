
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
dotenv.config();

const mongoUrl = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lms-studio';

async function seedEnrollment() {
    try {
        await mongoose.connect(mongoUrl);
        console.log('Connected to DB');

        const User = mongoose.connection.collection('users');
        const Course = mongoose.connection.collection('courses');
        const Enrollment = mongoose.connection.collection('enrollments');

        // Find Instructor Hari
        const instructor = await User.findOne({ name: 'hari', role: 'instructor' });
        if (!instructor) {
            console.log('Instructor Hari not found');
            return;
        }
        console.log('Instructor:', instructor.name, instructor.id);

        // Find one of his courses
        const course = await Course.findOne({ instructor_id: instructor.id });
        if (!course) {
            console.log('Instructor has no courses to enroll in');
            return;
        }
        console.log('Course to enroll in:', course.title, course.id);

        // Find a student (or the one we saw in logs)
        // Trying to find 'Hari' student or 'ji' user or anyone with role student
        // Let's use the ID we saw: 2d3be586-3078-4582-a9cc-64d4230a1386
        let student = await User.findOne({ id: '2d3be586-3078-4582-a9cc-64d4230a1386' });

        if (!student) {
            // Fallback: find any student
            student = await User.findOne({ role: 'student' });
        }

        if (!student) {
            console.log('No student found to enroll');
            return;
        }
        console.log('Student:', student.name, student.id);

        // Check if already enrolled
        const existing = await Enrollment.findOne({ student_id: student.id, course_id: course.id });
        if (existing) {
            console.log('Already enrolled');
        } else {
            const enrollment = {
                id: uuidv4(),
                student_id: student.id,
                course_id: course.id,
                enrolled_at: new Date(),
                status: 'active',
                progress: 0,
                completed_lessons: [],
                enrollment_status: 'active'
            };
            await Enrollment.insertOne(enrollment);
            console.log('Successfully enrolled student in course!');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

seedEnrollment();
