import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const sendEmail = async ({ to, subject, html }) => {
    try {
        const info = await transporter.sendMail({
            from: `"${process.env.APP_NAME}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to,
            subject,
            html,
        });
        console.log("📨 Email sent: %s", info.messageId);
        return info;
    } catch (error) {
        console.error("❌ Error sending email:", error);
        throw error;
    }
};

export const sendVerificationEmail = async (email, code) => {
    const subject = "Your Verification Code";
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4F46E5;">Verify Your Email</h2>
      <p>Hello,</p>
      <p>Your verification code for ${process.env.APP_NAME || 'EduPlatform'} is:</p>
      <div style="background-color: #F3F4F6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
        <h1 style="color: #1F2937; letter-spacing: 5px; margin: 0;">${code}</h1>
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this code, please ignore this email.</p>
    </div>
  `;
    return sendEmail({ to: email, subject, html });
};

export const sendPasswordResetEmail = async (email, code) => {
    const subject = "Reset Your Password";
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #E11D48;">Reset Password Request</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password for your account at ${process.env.APP_NAME || 'EduPlatform'}.</p>
      <p>Use the code below to reset your password:</p>
      <div style="background-color: #FFF1F2; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
        <h1 style="color: #9F1239; letter-spacing: 5px; margin: 0;">${code}</h1>
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
    </div>
  `;
    return sendEmail({ to: email, subject, html });
};
