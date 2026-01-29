
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUrl = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lms-studio';

async function findInstructor() {
    try {
        await mongoose.connect(mongoUrl);
        console.log('Connected to DB');

        const User = mongoose.connection.collection('users');
        const user = await User.findOne({ name: 'hari' });

        if (user) {
            console.log('Found Instructor:', user);

            const Course = mongoose.connection.collection('courses');
            const courses = await Course.find({ instructor_id: user.id }).toArray();
            console.log(`Instructor has ${courses.length} courses`);

            const courseIds = courses.map(c => c.id);
            console.log('Course IDs:', courseIds);

            const Enrollment = mongoose.connection.collection('enrollments');
            const enrollments = await Enrollment.find({ course_id: { $in: courseIds } }).toArray();
            console.log(`Found ${enrollments.length} enrollments for these courses`);
            console.log('Enrollments:', enrollments);
        } else {
            console.log('Instructor "hari" not found');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

findInstructor();
