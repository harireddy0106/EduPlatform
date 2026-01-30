import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create Nodemailer transporter if SMTP creds exist
let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT, // 465 for secure
    secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  console.log("📨 SMTP Transporter configured with", process.env.SMTP_USER);
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const sendEmail = async ({ to, subject, html }) => {
  // Strategy: Try Nodemailer first if available (supports sending to any email), 
  // then Resend (suppports only verified if free tier), then log only.

  // 1. Try Nodemailer
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: `"${process.env.APP_NAME || 'EduPlatform'}" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      });
      console.log("📨 Email sent via SMTP:", info.messageId);
      return { success: true, provider: 'smtp', id: info.messageId };
    } catch (error) {
      console.error("❌ SMTP Send Error:", error.message);
      // Fall through to Resend if SMTP fails
    }
  }

  // 2. Try Resend
  if (resend) {
    try {
      const data = await resend.emails.send({
        from: `${process.env.APP_NAME || 'EduPlatform'} <onboarding@resend.dev>`,
        to,
        subject,
        html,
      });

      if (data.error) {
        throw new Error(data.error.message);
      }

      console.log("📨 Email sent via Resend:", data.id);
      return { success: true, provider: 'resend', ...data };
    } catch (error) {
      console.error("❌ Resend Error:", error.message);
      if (error.statusCode === 403 || (error.message && error.message.toLowerCase().includes("verify"))) {
        console.warn("⚠️  RESEND LIMITATION: On the Free plan, you can ONLY send emails to the address you signed up with.");
      }
      // Continue to throw or return failure
    }
  }

  // 3. Fallback: Log to console if everything fails so dev can still proceed
  console.log("⚠️ ALL EMAIL PROVIDERS FAILED - Printing content to console:");
  console.log("---------------------------------------------------");
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log("---------------------------------------------------");
  // Don't throw error here to allow flow to continue in dev, but return failed status if strict
  // For this user specifically, they want it to 'work'. If we log it, the code flows, but they don't get the email.
  // We'll trust that SMTP works.

  throw new Error("Failed to send email via any provider");
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
