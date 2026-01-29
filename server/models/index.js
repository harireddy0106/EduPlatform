// models/index.js

import mongoose from 'mongoose';

// User Schema
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  name: { type: String, required: true },
  avatar: { type: String, default: "" },
  role: {
    type: String,
    default: 'student',
    enum: ['student', 'instructor', 'admin']
  },
  status: {
    type: String,
    default: 'active',
    enum: ['active', 'suspended', 'banned']
  },
  two_factor_enabled: { type: Boolean, default: false },
  profile_setup_skipped: { type: Boolean, default: false },
  wishlist: { type: [String], default: [] },
  created_at: { type: Date, default: Date.now },
}, { versionKey: false });

// Course Schema
const courseSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  instructor_id: { type: String, required: true },
  instructor_name: { type: String, required: true },
  thumbnail_url: { type: String, default: "" },
  price: { type: Number, default: 0 },
  status: {
    type: String,
    default: "draft",
    enum: ["draft", "published", "archived"]
  },
  completion_status: {
    type: String,
    default: "ongoing",
    enum: ["ongoing", "completed"]
  },
  created_at: { type: Date, default: Date.now },
}, { versionKey: false });

// Enrollment Schema
const enrollmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  student_id: { type: String, required: true },
  student_name: { type: String },
  course_id: { type: String, required: true },
  course_name: { type: String },
  instructor_name: { type: String },
  enrolled_at: { type: Date, default: Date.now },
  progress: { type: Number, default: 0 },
  enrollment_status: {
    type: String,
    default: 'active',
    enum: ['active', 'completed', 'dropped']
  },
  completed_lessons: { type: [String], default: [] },
  last_accessed: { type: Date, default: Date.now },
}, { versionKey: false });

// Lecture Schema
const lectureSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  course_id: { type: String, required: true },
  course_name: { type: String },
  instructor_name: { type: String },
  title: { type: String, required: true },
  video_url: { type: String, required: true },
  duration: { type: Number, default: 0 },
  order: { type: Number, required: true },
  created_at: { type: Date, default: Date.now },
}, { versionKey: false });

// Assignment Schema
const assignmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  course_id: { type: String, required: true },
  course_name: { type: String },
  instructor_name: { type: String },
  title: { type: String, required: true },
  description: { type: String, required: true },
  file_url: { type: String, default: "" },
  due_date: { type: String, required: true },
  type: {
    type: String,
    default: 'file',
    enum: ['file', 'quiz']
  },
  questions: [{
    question_text: { type: String },
    options: [{ type: String }],
    correct_option_index: { type: Number }
  }],
  created_at: { type: Date, default: Date.now },
}, { versionKey: false });

// Submission Schema
const submissionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  assignment_id: { type: String, required: true },
  student_id: { type: String, required: true },
  student_name: { type: String, required: true },
  course_name: { type: String },
  instructor_name: { type: String },
  file_url: { type: String, default: "" },
  submitted_at: { type: Date, default: Date.now },
  grade: { type: String, default: "" },
  answers: [{
    question_index: { type: Number },
    selected_option_index: { type: Number }
  }],
  score: { type: Number, default: 0 }
}, { versionKey: false });

// Certificate Schema
const certificateSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  user_id: { type: String, required: true },
  student_name: { type: String },
  course_id: { type: String, required: true },
  course_name: { type: String },
  instructor_name: { type: String },
  certificate_url: { type: String, required: true },
  issued_at: { type: Date, default: Date.now },
  verification_code: { type: String, required: true, unique: true }
}, { versionKey: false });

// Review Schema
const reviewSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  course_id: { type: String, required: true },
  user_id: { type: String, required: true },
  user_name: { type: String, required: true },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
}, { versionKey: false });

// Message Schema
const messageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  course_id: { type: String, required: true },
  sender_id: { type: String, required: true },
  sender_name: { type: String, required: true },
  sender_role: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
}, { versionKey: false });

// Notification Schema
const notificationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  user_id: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, required: true },
  related_id: { type: String },
  read: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
}, { versionKey: false });

// Verification Code Schema
const verificationCodeSchema = new mongoose.Schema({
  email: { type: String, required: true },
  code: { type: String, required: true },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 // Auto-delete after 10 minutes
  }
}, { versionKey: false });

// Instructor Profile Schema
const instructorProfileSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  user_id: { type: String, required: true, unique: true },

  // 1️⃣ Basic Information
  title: { type: String }, // Professional Title
  bio: { type: String },
  languages: [String],
  location: { type: String },
  website: { type: String },
  linkedin: { type: String },
  github: { type: String },
  youtube: { type: String },
  twitter: { type: String },
  instagram: { type: String },
  phone: { type: String },

  // 3️⃣ Professional Details
  qualifications: [{
    title: String,
    year: String,
    institute: String
  }],
  experience: { type: Number }, // Years
  current_org: { type: String },
  skills: [String],

  // 4️⃣ Teaching Preferences
  teaching_categories: [String],
  teaching_mode: {
    type: String,
    enum: ['video', 'live', 'mixed', 'assignment'],
    default: 'video'
  },
  hourly_rate: { type: Number },
  availability: {
    type: String,
    enum: ['flexible', 'part_time', 'full_time', 'weekends_only'],
    default: 'flexible'
  },

  // 5️⃣ Verification
  verification_status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'approved', 'rejected']
  },

  // 7️⃣ Payment
  bank_details: {
    account_holder: String,
    account_number: String,
    bank_name: String,
    ifsc: String,
    upi_id: String
  },
  payout_method: { type: String, default: 'bank_transfer' },
  tax_id: { type: String },

  // 6️⃣ Documents & Assets
  resume: { type: String }, // URL
  resume_name: { type: String },
  government_id: { type: String }, // URL
  government_id_name: { type: String },
  logo: { type: String }, // Personal Brand Logo URL
  logo_name: { type: String },
  intro_video: { type: String }, // URL
  intro_video_name: { type: String },

  // 8️⃣ Settings & Notifications
  is_public: { type: Boolean, default: true },
  notification_email: { type: Boolean, default: true },
  notification_course_updates: { type: Boolean, default: true },
  notification_promotions: { type: Boolean, default: false },
  profile_completed: { type: Boolean, default: false },

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }

}, { versionKey: false });

// Admin Schema
const adminSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, default: 'admin' },
  avatar: { type: String, default: "" },
  phone: { type: String },
  title: { type: String },
  bio: { type: String },
  timezone: { type: String, default: 'UTC' },
  language: { type: String, default: 'en' },
  last_login: { type: Date },
  two_factor_enabled: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
}, { versionKey: false });

// Export Models
export const User = mongoose.model('User', userSchema);
export const Admin = mongoose.model('Admin', adminSchema);
export const Course = mongoose.model('Course', courseSchema);
export const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
export const Lecture = mongoose.model('Lecture', lectureSchema);
export const Assignment = mongoose.model('Assignment', assignmentSchema);
export const Submission = mongoose.model('Submission', submissionSchema);
export const Certificate = mongoose.model('Certificate', certificateSchema);
export const Review = mongoose.model('Review', reviewSchema);
export const Message = mongoose.model('Message', messageSchema);
export const Notification = mongoose.model('Notification', notificationSchema);
export const VerificationCode = mongoose.model('VerificationCode', verificationCodeSchema);
export const InstructorProfile = mongoose.model('InstructorProfile', instructorProfileSchema);

// Student Profile Schema
// Student Profile Schema
const studentProfileSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  user_id: { type: String, required: true, unique: true },

  // 1️⃣ Basic Information
  phone: { type: String },
  date_of_birth: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'non_binary', 'other', 'prefer_not_to_say', ''] },
  location: { type: String },
  country: { type: String },
  timezone: { type: String },

  // 2️⃣ Academic / Learning Info
  education_level: {
    type: String,
    enum: ['high_school', 'diploma', 'undergraduate', 'postgraduate', 'phd', 'professional', 'other', '']
  },
  field_of_study: { type: String },
  skills_interested_in: [String],
  current_skill_level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert', '']
  },
  learning_goals: { type: String },
  certifications: [String], // Array of strings or objects if needed in future

  // 3️⃣ Course Preferences
  preferred_categories: [String],
  learning_mode: {
    type: String,
    enum: ['video', 'live', 'reading', 'interactive', 'mixed', '']
  },
  daily_learning_time: { type: String },
  language_preference: { type: String },

  // 4️⃣ Social & Professional Links
  linkedin: { type: String },
  github: { type: String },
  portfolio: { type: String },
  resume: { type: String },
  resume_name: { type: String },
  cover_letter: { type: String },
  cover_letter_name: { type: String },

  // 6️⃣ Settings
  notification_preferences: {
    email_alerts: { type: Boolean, default: true },
    course_updates: { type: Boolean, default: true },
    promotions: { type: Boolean, default: false },
    assignment_deadlines: { type: Boolean, default: true },
    instructor_announcements: { type: Boolean, default: true }
  },
  privacy_settings: {
    profile_visibility: {
      type: String,
      enum: ['public', 'students', 'instructors', 'private'],
      default: 'public'
    },
    show_progress: { type: Boolean, default: true },
    show_achievements: { type: Boolean, default: true },
    allow_messaging: { type: Boolean, default: true }
  },
  accessibility_preferences: {
    reduced_motion: { type: Boolean, default: false },
    high_contrast: { type: Boolean, default: false },
    larger_text: { type: Boolean, default: false }
  },
  theme_preference: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },

  profile_completed: { type: Boolean, default: false },

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { versionKey: false });


export const StudentProfile = mongoose.model('StudentProfile', studentProfileSchema);

// Admin Profile Schema
const adminProfileSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  user_id: { type: String, required: true, unique: true }, // Links to Admin collection

  // Basic Info
  phone: { type: String },
  title: { type: String },
  bio: { type: String },
  location: { type: String },
  timezone: { type: String, default: 'UTC' },
  language: { type: String, default: 'en' },

  // Social Links
  linkedin: { type: String },
  twitter: { type: String },
  github: { type: String },
  website: { type: String },

  // Preferences
  notifications: {
    email_alerts: { type: Boolean, default: true },
    system_updates: { type: Boolean, default: true },
    security_alerts: { type: Boolean, default: true }
  },

  // Metadata
  last_active: { type: Date },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { versionKey: false });

// Audit Log Schema
const auditLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  user_id: { type: String, required: true },
  user_name: { type: String },
  user_role: { type: String },
  action: { type: String, required: true },
  target_type: { type: String },
  target_id: { type: String },
  details: { type: mongoose.Schema.Types.Mixed },
  ip_address: { type: String },
  user_agent: { type: String },
  timestamp: { type: Date, default: Date.now }
}, { versionKey: false });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export const AdminProfile = mongoose.model('AdminProfile', adminProfileSchema);

// Setting Schema
const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  updated_at: { type: Date, default: Date.now },
  updated_by: { type: String }
}, { versionKey: false });

export const Setting = mongoose.model('Setting', settingSchema);