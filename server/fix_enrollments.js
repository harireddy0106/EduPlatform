
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUrl = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lms-studio';

async function fixEnrollments() {
    try {
        await mongoose.connect(mongoUrl);
        console.log('Connected to DB');

        const Enrollment = mongoose.connection.collection('enrollments');

        const result = await Enrollment.updateMany(
            { enrollment_status: { $exists: false } },
            {
                $set: {
                    enrollment_status: 'active',
                    progress: 0,
                    completed_lessons: [],
                    last_accessed: new Date()
                }
            }
        );

        console.log(`Updated ${result.modifiedCount} enrollments with missing fields.`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

fixEnrollments();
