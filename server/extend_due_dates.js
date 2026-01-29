
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUrl = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lms-studio';

async function extendDueDate() {
    try {
        await mongoose.connect(mongoUrl);
        console.log('Connected to DB');

        const Assignment = mongoose.connection.collection('assignments');

        // Update all assignments to be due next month to avoid blocking testing
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const newDateStr = nextMonth.toISOString().split('T')[0];

        const result = await Assignment.updateMany(
            {},
            { $set: { due_date: newDateStr } }
        );

        console.log(`Updated ${result.modifiedCount} assignments to due date: ${newDateStr}`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

extendDueDate();
