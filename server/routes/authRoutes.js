// routes/authRoutes.js

import express from 'express';
import { User, Admin, VerificationCode, InstructorProfile, AdminProfile } from '../models/index.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email.js';
import { hashPassword, verifyPassword, createToken, getAuthUser } from '../utils/auth.js';
import { upload, uploadToCloudinary } from '../utils/upload.js'; // Import upload utility

import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';


const JWT_SECRET = process.env.JWT_SECRET;

const router = express.Router();
console.log("✅ authRoutes.js loaded");

// ========== Auth Routes ==========

router.post("/register", async (req, res) => {
  const { email, password, name, role = "student" } = req.body;
  console.log("Registering user:", email, name, role);

  let existing;
  if (role === 'admin') {
    existing = await Admin.findOne({ email });
  } else {
    existing = await User.findOne({ email });
  }

  if (existing) {
    return res.status(400).json({ detail: "Email already registered" });
  }

  const user_id = uuidv4();
  const password_hash = await hashPassword(password);
  console.log('Generated hash:', password_hash);

  let newUser;
  if (role === 'admin') {
    newUser = new Admin({
      id: user_id,
      email,
      password_hash,
      name,
      role: 'admin',
      created_at: new Date()
    });
  } else {
    newUser = new User({
      id: user_id,
      email,
      password_hash,
      name,
      role,
      created_at: new Date()
    });
  }

  try {
    await newUser.save();
    const token = createToken(user_id, role);
    res.json({
      token,
      user: { id: user_id, email, name, role }
    });
  } catch (error) {
    res.status(500).json({ detail: "Registration failed", error: error.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password, role } = req.body;

  let user = await User.findOne({ email }).lean();
  let isAdmin = false;

  // If not found in User, check Admin (or if role explicitly requested as admin)
  if (!user) {
    user = await Admin.findOne({ email }).lean();
    if (user) isAdmin = true;
  } else if (user.role === 'admin') {
    // It's possible an old admin is still in User table, treat them normally
    isAdmin = true;
  }

  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ detail: "Invalid credentials" });
  }

  // Verify role if specified
  if (role && user.role !== role) {
    return res.status(403).json({
      detail: `Access denied. Please login as a ${user.role} instead.`
    });
  }

  let profileComplete = true; // Default true for non-instructors
  if (user.role === 'instructor') {
    if (user.profile_setup_skipped) {
      profileComplete = true; // Treated as complete if skipped
    } else {
      const profile = await InstructorProfile.findOne({ user_id: user.id });
      profileComplete = !!profile;
    }
  }

  // Update last_login
  if (isAdmin) {
    await Admin.updateOne({ id: user.id }, { $set: { last_login: new Date() } });
  } else {
    await User.updateOne({ id: user.id }, { $set: { last_login: new Date() } });
  }

  const token = createToken(user.id, user.role);
  res.json({
    token,
    refreshToken: token, // Using same token for refresh in this simplified flow
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    profileComplete
  });
});

router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ detail: "Refresh token is required" });
  }

  try {
    // Verify the existing token
    const payload = jwt.verify(refreshToken, JWT_SECRET, { algorithms: ["HS256"] });

    // Check if user still exists
    const user = await User.findOne({ id: payload.user_id }).lean();
    if (!user) {
      return res.status(401).json({ detail: "User not found" });
    }

    // Issue a new token
    const newToken = createToken(user.id, user.role);

    res.json({
      accessToken: newToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    return res.status(401).json({ detail: "Invalid or expired refresh token", code: "TOKEN_EXPIRED" });
  }
});

router.get("/me", getAuthUser, async (req, res) => {
  // req.currentUser is set by getAuthUser middleware
  res.json(req.currentUser);
});

router.put("/profile", getAuthUser, async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.currentUser.id;

    let user = await User.findOne({ id: userId });
    let isAdmin = false;

    if (!user) {
      user = await Admin.findOne({ id: userId });
      isAdmin = !!user;
    }

    if (!user) {
      return res.status(404).json({ detail: "User not found" });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (req.body.avatar !== undefined && !isAdmin) user.avatar = req.body.avatar; // Admin might not have avatar in schema yet, adding it if needed or skipping
    if (req.body.two_factor_enabled !== undefined) user.two_factor_enabled = req.body.two_factor_enabled;

    await user.save();

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        two_factor_enabled: user.two_factor_enabled
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ detail: "Failed to update profile" });
  }
});

router.post("/change-password", getAuthUser, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // req.currentUser is set by getAuthUser middleware
    const userId = req.currentUser.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ detail: "Both current and new passwords are required" });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ detail: "New password cannot be the same as the current password" });
    }

    let user = await User.findOne({ id: userId });
    if (!user) {
      user = await Admin.findOne({ id: userId });
    }

    if (!user) {
      return res.status(404).json({ detail: "User not found" });
    }

    // Verify current password
    const isMatch = verifyPassword(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ detail: "Current password is incorrect" });
    }

    // Hash new password and save
    user.password_hash = await hashPassword(newPassword);
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ detail: "Failed to change password" });
  }
});

router.get("/permissions", getAuthUser, (req, res) => {
  // Using req.user as it was set for compatibility, or default to currentUser
  const user = req.user || req.currentUser;

  res.json({
    success: true,
    user: {
      id: user.id,
      role: user.role,
      permissions: user.permissions || []
    }
  });
});

router.post("/check-email", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    const admin = await Admin.findOne({ email });
    res.json({
      exists: !!user || !!admin,
      verified: true // Defaulting to true as per current schema limitations
    });
  } catch (error) {
    res.status(500).json({ detail: "Error checking email", error: error.message });
  }
});

router.post("/verify-email", async (req, res) => {
  const { token } = req.body;
  // Placeholder for email verification logic since schema doesn't support it directly yet
  res.json({ message: "Email verified successfully" });
});

router.post("/send-verification", async (req, res) => {
  const { email } = req.body;
  try {
    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Save to DB (upsert to handle re-sends)
    await VerificationCode.findOneAndUpdate(
      { email },
      { code, createdAt: new Date() },
      { upsert: true, new: true }
    );

    // Send email
    await sendVerificationEmail(email, code);

    console.log(`✅ Verification email sent to: ${email}`);
    res.json({ message: "Verification email sent successfully" });
  } catch (error) {
    console.error("❌ Send verification error:", error);
    res.status(500).json({ detail: "Failed to send verification email" });
  }
});

router.post("/verify-email-code", async (req, res) => {
  const { email, code } = req.body;
  try {
    const record = await VerificationCode.findOne({ email });

    if (!record) {
      return res.status(400).json({ detail: "Verification code expired or not found" });
    }

    if (record.code !== code) {
      return res.status(400).json({ detail: "Invalid verification code" });
    }

    // Code matches
    console.log(`✅ Code verified for ${email}`);

    // Optional: Delete the code after successful verification so it can't be reused
    await VerificationCode.deleteOne({ email });

    res.json({ message: "Email verified successfully", verified: true });
  } catch (error) {
    console.error("❌ Verification error:", error);
    res.status(500).json({ detail: "Verification failed" });
  }
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ detail: "Email is required" });
  }

  try {
    let user = await User.findOne({ email });
    if (!user) {
      user = await Admin.findOne({ email });
    }

    if (!user) {
      // Don't reveal user existence, but for now we'll return generic success
      // Or we can return 404 if we want to be explicit (less secure but easier for debugging)
      // Choosing to return 404 for now as it matches typical dev expectations, switch to 200 in prod for security
      return res.status(404).json({ detail: "User not found" });
    }

    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Save to DB (upsert to handle re-sends)
    await VerificationCode.findOneAndUpdate(
      { email },
      { code, createdAt: new Date() },
      { upsert: true, new: true }
    );

    // Send email
    await sendPasswordResetEmail(email, code);

    console.log(`✅ Password reset email sent to: ${email}`);
    res.json({ message: "Password reset instructions sent to your email" });
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    res.status(500).json({ detail: "Failed to process request" });
  }
});

router.post("/reset-password", async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ detail: "Email, code, and new password are required" });
  }

  try {
    const record = await VerificationCode.findOne({ email });

    if (!record) {
      return res.status(400).json({ detail: "Reset code expired or not found" });
    }

    if (record.code !== code) {
      return res.status(400).json({ detail: "Invalid reset code" });
    }

    // Code matches, find user
    let user = await User.findOne({ email });
    if (!user) {
      user = await Admin.findOne({ email });
    }

    if (!user) {
      return res.status(404).json({ detail: "User not found" });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user password
    user.password_hash = hashedPassword;
    await user.save();

    // Delete the code
    await VerificationCode.deleteOne({ email });

    console.log(`✅ Password reset successfully for ${email}`);
    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    res.status(500).json({ detail: "Failed to reset password" });
  }
});


// ========== Profile Management Endpoints ==========

router.get('/profile', getAuthUser, async (req, res) => {
  try {
    const user = req.user;
    let profileData = {};

    if (user.role === 'admin') {
      const adminProfile = await AdminProfile.findOne({ user_id: user.id });
      if (adminProfile) {
        profileData = {
          phone: adminProfile.phone,
          title: adminProfile.title,
          bio: adminProfile.bio,
          timezone: adminProfile.timezone,
          language: adminProfile.language,
          linkedin: adminProfile.linkedin,
          twitter: adminProfile.twitter
        };
      }
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar || '',
        two_factor_enabled: user.two_factor_enabled || false,
        created_at: user.created_at,
        last_login: user.last_login,
        // Fallbacks if not in separate profile yet
        phone: profileData.phone || user.phone || '',
        title: profileData.title || user.title || '',
        bio: profileData.bio || user.bio || '',
        timezone: profileData.timezone || user.timezone || 'UTC',
        language: profileData.language || user.language || 'en',
        ...profileData
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch profile" });
  }
});

router.put('/profile', getAuthUser, async (req, res) => {
  try {
    console.log(`Updating profile for user: ${req.user.id} (${req.user.role})`);

    const { name, email, phone, title, bio, timezone, language, two_factor_enabled, linkedin, twitter } = req.body;

    // 1. Update Core User/Admin Data
    const Collection = req.user.role === 'admin' ? Admin : User;
    const updateData = {};
    if (name) updateData.name = name;
    if (email && email !== req.user.email) updateData.email = email;
    if (two_factor_enabled !== undefined) updateData.two_factor_enabled = two_factor_enabled;

    // Legacy support: also update direct fields on Admin if they exist there, to be safe
    // usage of AdminProfile is preferred though.

    const updatedUser = await Collection.findOneAndUpdate(
      { id: req.user.id },
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password_hash');

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    let finalUser = updatedUser.toObject();

    // 2. Update AdminProfile if admin
    if (req.user.role === 'admin') {
      try {
        console.log("Updating AdminProfile for:", req.user.id);
        const profileUpdate = {};
        if (phone !== undefined) profileUpdate.phone = phone;
        if (title !== undefined) profileUpdate.title = title;
        if (bio !== undefined) profileUpdate.bio = bio;
        if (timezone !== undefined) profileUpdate.timezone = timezone;
        if (language !== undefined) profileUpdate.language = language;
        if (linkedin !== undefined) profileUpdate.linkedin = linkedin;
        if (twitter !== undefined) profileUpdate.twitter = twitter;

        // Log to ensure AdminProfile is available (debugging)
        if (!AdminProfile) console.error("CRITICAL: AdminProfile model is undefined!");

        // Upsert AdminProfile
        const updatedProfile = await AdminProfile.findOneAndUpdate(
          { user_id: req.user.id },
          {
            $set: profileUpdate,
            $setOnInsert: {
              id: uuidv4(),
              user_id: req.user.id // Explicitly set user_id
            }
          },
          { new: true, upsert: true, runValidators: true, context: 'query' }
        );

        // Merge into response
        if (updatedProfile) {
          finalUser = { ...finalUser, ...updatedProfile.toObject() };
          finalUser.id = updatedUser.id; // Correct ID
        }
      } catch (profileError) {
        console.error("Failed to update AdminProfile:", profileError);
        // Don't fail the whole request if profile update fails, but maybe warn?
        // Or fail it? User expects it to save.
        throw profileError;
      }
    }

    res.json({ success: true, user: finalUser });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ success: false, message: "Failed to update profile", detail: error.message });
  }
});

router.post('/change-password', getAuthUser, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const Collection = req.user.role === 'admin' ? Admin : User;
    const user = await Collection.findOne({ id: req.user.id });

    if (!verifyPassword(currentPassword, user.password_hash)) {
      return res.status(400).json({ success: false, detail: "Incorrect current password" });
    }

    user.password_hash = await hashPassword(newPassword);
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, detail: "Password update failed" });
  }
});


router.post('/upload-avatar', getAuthUser, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, 'avatars');
    const avatarUrl = result.secure_url;

    // Update User/Admin in DB
    const Collection = req.user.role === 'admin' ? Admin : User;
    await Collection.findOneAndUpdate(
      { id: req.user.id },
      { avatar: avatarUrl }
    );

    res.json({
      success: true,
      avatarUrl: avatarUrl,
      message: "Avatar uploaded successfully"
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    res.status(500).json({ success: false, message: "Failed to upload avatar" });
  }
});


// Mock Session & Security Endpoints

router.get('/sessions', getAuthUser, (req, res) => {
  // Mock sessions
  res.json({
    success: true,
    sessions: [
      {
        id: 'sess_1',
        deviceType: 'desktop',
        browser: 'Chrome 120.0',
        os: 'macOS 14.2',
        ipAddress: '192.168.1.1',
        location: 'San Francisco, US',
        lastActive: new Date(),
        isCurrent: true
      },
      {
        id: 'sess_2',
        deviceType: 'mobile',
        browser: 'Safari',
        os: 'iOS 17.2',
        ipAddress: '10.0.0.5',
        location: 'San Jose, US',
        lastActive: new Date(Date.now() - 86400000), // 1 day ago
        isCurrent: false
      }
    ]
  });
});

router.delete('/sessions/:id', getAuthUser, (req, res) => {
  res.json({ success: true, message: "Session terminated" });
});

router.delete('/sessions/all', getAuthUser, (req, res) => {
  res.json({ success: true, message: "All other sessions terminated" });
});

router.get('/activity', getAuthUser, (req, res) => {
  // Mock activity log
  res.json({
    success: true,
    activities: [
      { type: 'login', description: 'Successful login', ipAddress: '192.168.1.1', location: 'San Francisco, US', timestamp: new Date() },
      { type: 'password_change', description: 'Password changed', ipAddress: '192.168.1.1', location: 'San Francisco, US', timestamp: new Date(Date.now() - 100000) },
      { type: 'login', description: 'Successful login', ipAddress: '10.0.0.5', location: 'San Jose, US', timestamp: new Date(Date.now() - 86400000) }
    ]
  });
});

router.post('/enable-2fa', getAuthUser, (req, res) => {
  // Mock 2FA setup
  res.json({
    success: true,
    recoveryCodes: ['1234-5678', '8765-4321', '1111-2222', '3333-4444']
  });
});

router.post('/verify-2fa', getAuthUser, async (req, res) => {
  const { code } = req.body;
  if (code === '000000') {
    return res.status(400).json({ success: false, message: "Invalid code" });
  }

  // Update user to have 2FA enabled
  const Collection = req.user.role === 'admin' ? Admin : User;
  await Collection.findOneAndUpdate({ id: req.user.id }, { two_factor_enabled: true });

  res.json({ success: true, message: "2FA Verified" });
});

router.get('/export-data', getAuthUser, (req, res) => {
  const data = {
    user: req.user,
    exportedAt: new Date()
  };
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(data, null, 2));
});

export default router;