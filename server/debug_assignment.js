
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUrl = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lms-studio';

async function checkAssignment() {
    try {
        await mongoose.connect(mongoUrl);
        console.log('Connected to DB');

        const Assignment = mongoose.connection.collection('assignments');
        // The ID from the URL in the user's error report: bd602db6-b825-432b-99c6-7951ff978c4b
        const assignment = await Assignment.findOne({ id: 'bd602db6-b825-432b-99c6-7951ff978c4b' });

        if (assignment) {
            console.log('Assignment found:', assignment);
            console.log('Due Date:', assignment.due_date);
            console.log('Current Date:', new Date().toISOString());
        } else {
            console.log('Assignment not found');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkAssignment();
