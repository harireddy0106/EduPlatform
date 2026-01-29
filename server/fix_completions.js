
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Enrollment, Certificate, Notification, Course } from './models/index.js';

dotenv.config();

const mongoUrl = process.env.MONGO_URI || process.env.MONGO_URL;

if (!mongoUrl) {
    console.error("❌ MONGO_URI or MONGO_URL not found in environment variables");
    process.exit(1);
}

const fixCompletions = async () => {
    try {
        console.log("🔌 Connecting to MongoDB...");
        await mongoose.connect(mongoUrl, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
        });
        console.log("✅ Connected to MongoDB");

        // 1. Find all enrollments with 100% progress
        const eligibleEnrollments = await Enrollment.find({
            progress: 100
        });

        console.log(`🔍 Found ${eligibleEnrollments.length} enrollments with 100% progress`);

        let fixedCount = 0;
        let updatedEnrollments = 0;

        for (const enrollment of eligibleEnrollments) {
            let changesMade = false;

            // Update enrollment status if needed
            if (enrollment.enrollment_status !== 'completed') {
                enrollment.enrollment_status = 'completed';
                if (!enrollment.completed_at) {
                    enrollment.completed_at = new Date();
                }
                await enrollment.save();
                updatedEnrollments++;
                changesMade = true;
                console.log(`Updated enrollment status for student ${enrollment.student_id} in course ${enrollment.course_id}`);
            }

            // Check if certificate exists
            const existingCert = await Certificate.findOne({
                user_id: enrollment.student_id,
                course_id: enrollment.course_id
            });

            if (!existingCert) {
                console.log(`⚠️ Missing certificate for student ${enrollment.student_id} in course ${enrollment.course_id}. Generating...`);

                const certificateCode = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

                await Certificate.create({
                    id: uuidv4(),
                    user_id: enrollment.student_id,
                    course_id: enrollment.course_id,
                    certificate_url: `/certificates/${certificateCode}.pdf`,
                    issued_at: new Date(),
                    verification_code: certificateCode
                });

                // Create notification
                await Notification.create({
                    id: uuidv4(),
                    user_id: enrollment.student_id,
                    title: 'Course Completed! (Backfilled)',
                    message: `Congratulations! You have completed the course. Your certificate is ready for download.`,
                    type: 'course',
                    related_id: enrollment.course_id
                });

                fixedCount++;
                console.log(`✅ Certificate generated for user ${enrollment.student_id}`);
            } else {
                console.log(`✓ Certificate already exists for user ${enrollment.student_id}`);
            }
        }

        console.log(`\n🎉 Summary:`);
        console.log(`- Total 100% enrollments scanned: ${eligibleEnrollments.length}`);
        console.log(`- Enrollments status updated: ${updatedEnrollments}`);
        console.log(`- Certificates generated (recovered): ${fixedCount}`);

    } catch (error) {
        console.error("❌ Error running fix script:", error);
    } finally {
        await mongoose.connection.close();
        console.log("👋 Disconnected from MongoDB");
        process.exit(0);
    }
};

fixCompletions();
