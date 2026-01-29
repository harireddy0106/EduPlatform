// server/routes/courseRoutes.js

import express from 'express';
import {
  Course,
  Lecture,
  Assignment,
  Submission,
  Message,
  Enrollment,
  User,
  Review,
  Certificate,
  Notification
} from '../models/index.js';
import { getAuthUser } from '../utils/auth.js';
import {
  validateRequest,
  hasRole,
  sanitizeInput,
  hasRole as requireRole
} from '../utils/security.js';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import Joi from 'joi';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// ========== Validation Schemas ==========

const courseSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().min(3).max(2000).required(),
  thumbnail_url: Joi.string().uri().allow(''),
  category: Joi.string().max(100).default('General'),
  price: Joi.number().min(0).default(0),
  duration: Joi.number().min(0).default(0),
  difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced').default('beginner'),
  tags: Joi.array().items(Joi.string().max(50)),
  status: Joi.string().valid('draft', 'published', 'archived').default('draft'),
  completion_status: Joi.string().valid('ongoing', 'completed').default('ongoing')
});

const lectureSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().max(1000).default(''),
  video_url: Joi.string().uri().required(),
  duration: Joi.number().min(0).default(0),
  order: Joi.number().min(0).required(),
  resources: Joi.array().items(
    Joi.object({
      title: Joi.string().required(),
      url: Joi.string().uri().required(),
      type: Joi.string().valid('pdf', 'doc', 'link', 'other').default('link')
    })
  ).default([]),
  is_preview: Joi.boolean().default(false)
});

const assignmentSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().min(10).max(2000).required(),
  instructions: Joi.string().max(1000).default(''),
  due_date: Joi.date().iso().required(),
  type: Joi.string().valid('file', 'quiz').default('file'),
  questions: Joi.array().items(
    Joi.object({
      question_text: Joi.string().required(),
      options: Joi.array().items(Joi.string()).min(2).required(),
      correct_option_index: Joi.number().integer().min(0).required()
    })
  ).default([])
});

const submissionSchema = Joi.object({
  file_url: Joi.string().uri().allow(''),
  text_content: Joi.string().allow(''),
  assignment_id: Joi.string().required(),
  answers: Joi.array().items(Joi.object({
    question_index: Joi.number().required(),
    selected_option_index: Joi.number().required()
  }))
});

const reviewSchema = Joi.object({
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().min(10).max(1000).required()
});

// ========== Middleware ==========

// Check course authorization (instructor or admin)
const checkCourseAuth = async (req, res, next) => {
  try {
    const course = await Course.findOne({ id: req.params.course_id }).lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'COURSE_NOT_FOUND',
          message: 'Course not found'
        }
      });
    }

    req.course = course;
    const user = req.currentUser;

    // Admin or course instructor can modify
    if (user.role === 'admin' || course.instructor_id === user.id) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'You are not authorized to perform this action'
      }
    });

  } catch (error) {
    console.error('Course auth check error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to verify course authorization'
      }
    });
  }
};

// Check if user is enrolled in course
const checkEnrollment = async (req, res, next) => {
  try {
    const user = req.currentUser;
    const course_id = req.params.course_id;

    if (user.role === 'instructor' || user.role === 'admin') {
      return next();
    }

    const enrollment = await Enrollment.findOne({
      student_id: user.id,
      course_id,
      enrollment_status: { $in: ['active', 'completed'] }
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'NOT_ENROLLED',
          message: 'You must be enrolled in this course to access this content'
        }
      });
    }

    req.enrollment = enrollment;
    next();

  } catch (error) {
    console.error('Enrollment check error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to verify enrollment'
      }
    });
  }
};

// ========== Course Routes ==========

// Create a new course
router.post("/courses",
  getAuthUser,
  requireRole('instructor', 'admin'),
  validateRequest(courseSchema),
  async (req, res) => {
    try {
      const user = req.currentUser;
      const validatedData = req.validatedData;

      const course_id = uuidv4();

      const newCourse = new Course({
        id: course_id,
        ...validatedData,
        instructor_id: user.id,
        instructor_name: user.name,
        created_at: new Date(),
        updated_at: new Date()
      });

      const savedCourse = await newCourse.save();

      // Create notification for admin (if not admin creating)
      if (user.role !== 'admin') {
        await Notification.create({
          id: uuidv4(),
          user_id: 'admin', // or find admin users
          title: 'New Course Created',
          message: `${user.name} created a new course: ${validatedData.title}`,
          type: 'course',
          related_id: course_id
        });
      }

      res.status(201).json({
        success: true,
        data: savedCourse.toObject({ versionKey: false }),
        message: 'Course created successfully'
      });

    } catch (error) {
      console.error('Create course error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_COURSE_FAILED',
          message: 'Failed to create course'
        }
      });
    }
  });

// Get all courses with filters
router.get("/courses", async (req, res) => {
  try {
    const {
      category,
      difficulty,
      instructor_id,
      status = 'published',
      search,
      page = 1,
      limit = 10,
      sort = 'created_at',
      order = 'desc'
    } = req.query;

    const query = {};

    // Apply filters
    if (status && status !== 'all') {
      query.status = status;
    }

    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;
    if (instructor_id) query.instructor_id = instructor_id;

    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const sortOrder = order === 'desc' ? -1 : 1;

    const [courses, total] = await Promise.all([
      Course.find(query)
        .sort({ [sort]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Course.countDocuments(query)
    ]);

    // Calculate average ratings
    const coursesWithRatings = await Promise.all(
      courses.map(async (course) => {
        const reviews = await Review.find({ course_id: course.id }).lean();
        const avgRating = reviews.length > 0
          ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
          : 0;

        const enrolledCount = await Enrollment.countDocuments({
          course_id: course.id,
          enrollment_status: 'active'
        });

        return {
          ...course,
          average_rating: parseFloat(avgRating.toFixed(1)),
          enrolled_count: enrolledCount,
          review_count: reviews.length
        };
      })
    );

    res.json({
      success: true,
      data: coursesWithRatings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_COURSES_FAILED',
        message: 'Failed to fetch courses'
      }
    });
  }
});

// Get recommended courses
router.get("/courses/recommended", async (req, res) => {
  try {
    // In a real app, this would use a recommendation engine
    // For now, return top rated published courses
    const courses = await Course.find({ status: 'published' })
      .sort({ enrolled_students: -1, created_at: -1 })
      .limit(8)
      .lean();

    res.json({
      success: true,
      data: courses
    });
  } catch (error) {
    console.error('Recommended courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recommended courses'
    });
  }
});

// Get all course categories
router.get("/courses/categories", async (req, res) => {
  try {
    // Get distinct categories from published courses
    const categories = await Course.distinct("category", { status: 'published' });

    // If no categories found, provide some defaults
    const finalCategories = categories.length > 0 ? categories : [
      'Programming', 'Design', 'Business', 'Marketing', 'Development', 'IT & Software',
      'Personal Development', 'Photography', 'Music', 'Health & Fitness', 'Science',
      'Mathematics', 'Language', 'Engineering', 'Arts & Humanities'
    ];

    // Map to objects for frontend
    const categoryData = finalCategories.map((name, index) => ({
      id: `cat-${index}`,
      name: name,
      slug: name.toLowerCase().replace(/ /g, '-')
    }));

    res.json({
      success: true,
      data: categoryData
    });
  } catch (error) {
    console.error('Fetch categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

// Get course by ID with detailed information
router.get("/courses/:course_id", async (req, res) => {
  try {
    const { course_id } = req.params;
    console.log(`[DEBUG] Fetching course details for ID: ${course_id}`);

    const course = await Course.findOne({ id: course_id }).lean();

    if (!course) {
      console.log(`[DEBUG] Course not found for ID: ${course_id}`);
      return res.status(404).json({
        success: false,
        error: {
          code: 'COURSE_NOT_FOUND',
          message: 'Course not found'
        }
      });
    }


    // Get instructor details
    const instructor = await User.findOne({ id: course.instructor_id })
      .select('name email profile_picture bio')
      .lean();

    // Get course statistics
    const [enrollments, reviews, lectures] = await Promise.all([
      Enrollment.find({ course_id: course.id, enrollment_status: 'active' }).lean(),
      Review.find({ course_id: course.id }).lean(),
      Lecture.find({ course_id: course.id }).sort({ order: 1 }).lean()
    ]);

    // Calculate average rating
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

    // Check if user is enrolled (if authenticated)
    let isEnrolled = false;
    let userProgress = null;

    if (req.headers.authorization) {
      try {
        // Extract user from token without calling getAuthUser middleware
        const token = req.headers.authorization.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const enrollment = await Enrollment.findOne({
          student_id: decoded.userId,
          course_id: course.id
        }).lean();

        if (enrollment) {
          isEnrolled = true;
          userProgress = enrollment;

          // Check for certificate
          const certificate = await Certificate.findOne({
            user_id: decoded.userId,
            course_id: course.id
          }).lean();

          if (certificate) {
            userProgress.certificate = certificate;
          }
        }
      } catch (error) {
        // Token verification failed, user not authenticated
      }
    }

    const detailedCourse = {
      ...course,
      instructor: {
        name: instructor?.name,
        email: instructor?.email,
        profile_picture: instructor?.profile_picture,
        bio: instructor?.bio
      },
      statistics: {
        enrolled_students: enrollments.length,
        average_rating: parseFloat(avgRating.toFixed(1)),
        review_count: reviews.length,
        lecture_count: lectures.length,
        total_duration: lectures.reduce((sum, lecture) => sum + lecture.duration, 0)
      },
      is_enrolled: isEnrolled,
      user_progress: userProgress,
      preview_lectures: lectures.filter(lecture => lecture.is_preview).slice(0, 2)
    };

    res.json({
      success: true,
      data: detailedCourse
    });

  } catch (error) {
    console.error('Get course details error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_COURSE_FAILED',
        message: 'Failed to fetch course details'
      }
    });
  }
});

// Update course
router.put("/courses/:course_id",
  getAuthUser,
  checkCourseAuth,
  validateRequest(courseSchema),
  async (req, res) => {
    try {
      const validatedData = req.validatedData;

      await Course.updateOne(
        { id: req.params.course_id },
        {
          $set: {
            ...validatedData,
            updated_at: new Date()
          }
        }
      );

      // Check if course is being marked as completed
      if (validatedData.completion_status === 'completed') {
        const eligibleEnrollments = await Enrollment.find({
          course_id: req.params.course_id,
          progress: 100
        });

        for (const enrollment of eligibleEnrollments) {
          const existingCert = await Certificate.findOne({
            user_id: enrollment.student_id,
            course_id: enrollment.course_id
          });

          if (!existingCert) {
            const certificateCode = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

            await Certificate.create({
              id: uuidv4(),
              user_id: enrollment.student_id,
              student_name: enrollment.student_name, // Use stored name if available
              course_id: enrollment.course_id,
              course_name: validatedData.title, // Use updated title
              instructor_name: enrollment.instructor_name, // Use stored name
              certificate_url: `/certificates/${certificateCode}.pdf`,
              issued_at: new Date(),
              verification_code: certificateCode
            });

            await Notification.create({
              id: uuidv4(),
              user_id: enrollment.student_id,
              title: 'Course Completed!',
              message: `The instructor has marked the course as completed. Your certificate is now available for download.`,
              type: 'course',
              related_id: enrollment.course_id
            });
          }
        }
      }

      const updatedCourse = await Course.findOne({ id: req.params.course_id }).lean();

      res.json({
        success: true,
        data: updatedCourse,
        message: 'Course updated successfully'
      });

    } catch (error) {
      console.error('Update course error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_COURSE_FAILED',
          message: 'Failed to update course'
        }
      });
    }
  });

// Delete course with all related data
router.delete("/courses/:course_id",
  getAuthUser,
  checkCourseAuth,
  async (req, res) => {
    try {
      const course_id = req.params.course_id;

      // Check if course exists (redundant due to checkCourseAuth but good for safety)
      const course = await Course.findOne({ id: course_id });
      if (!course) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'COURSE_NOT_FOUND',
            message: 'Course not found'
          }
        });
      }

      // Perform deletions directly without transaction (safer for single-node Mongo)
      try {
        // Delete related data first
        await Enrollment.deleteMany({ course_id });
        await Lecture.deleteMany({ course_id });
        await Assignment.deleteMany({ course_id });
        await Message.deleteMany({ course_id });
        await Review.deleteMany({ course_id });

        // Finally delete the course
        await Course.deleteOne({ id: course_id });

        res.json({
          success: true,
          message: 'Course and all related data deleted successfully'
        });

      } catch (error) {
        console.error('Cascade delete error:', error);
        throw error; // Re-throw to be caught by outer catch
      }

    } catch (error) {
      console.error('Delete course error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_COURSE_FAILED',
          message: 'Failed to delete course: ' + error.message
        }
      });
    }
  });

// ========== Enrollment Routes ==========

// Enroll in a course
router.post("/courses/:course_id/enroll",
  getAuthUser,
  requireRole('student'),
  async (req, res) => {
    try {
      const user = req.currentUser;
      const course_id = req.params.course_id;

      // Resolve student ID from body or auth token
      const studentId = req.body.studentId || req.body.student_id || user?.id;

      console.log(`[ENROLL DEBUG] Request to enroll student: ${studentId} in course: ${course_id}`);

      if (!studentId) {
        console.log('[ENROLL DEBUG] Missing student ID');
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_STUDENT_ID',
            message: 'Student ID is required'
          }
        });
      }

      const course = await Course.findOne({ id: course_id }); // Allow enrollment in drafts for testing

      if (!course) {
        console.log('[ENROLL DEBUG] Course not found');
        return res.status(404).json({
          success: false,
          error: {
            code: 'COURSE_NOT_FOUND',
            message: 'Course not found or not published'
          }
        });
      }

      // Check if already enrolled
      const existing = await Enrollment.findOne({
        student_id: studentId,
        course_id,
        enrollment_status: { $ne: 'dropped' }
      });

      if (existing) {
        console.log('[ENROLL DEBUG] Already enrolled:', existing.id);
        return res.status(200).json({
          success: true,
          data: {
            enrollment: existing,
            course: course
          },
          message: 'You are already enrolled in this course'
        });
      }

      // Check course capacity (if implemented)
      const enrolledCount = await Enrollment.countDocuments({
        course_id,
        enrollment_status: 'active'
      });

      if (course.max_students && enrolledCount >= course.max_students) {
        console.log('[ENROLL DEBUG] Course full. Max:', course.max_students, 'Current:', enrolledCount);
        return res.status(400).json({
          success: false,
          error: {
            code: 'COURSE_FULL',
            message: 'This course has reached maximum capacity'
          }
        });
      }

      const enrollment = new Enrollment({
        id: uuidv4(),
        student_id: studentId,
        student_name: user?.name,
        course_id,
        course_name: course.title,
        instructor_name: course.instructor_name,
        enrolled_at: new Date(),
        progress: 0,
        enrollment_status: 'active',
        last_accessed: new Date()
      });

      await enrollment.save();

      // Update course enrollment count
      await Course.updateOne(
        { id: course_id },
        { $inc: { enrolled_students: 1 } }
      );

      // Send notification to instructor
      await Notification.create({
        id: uuidv4(),
        user_id: course.instructor_id,
        title: 'New Student Enrollment',
        message: `${user.name} has enrolled in your course: ${course.title}`,
        type: 'course',
        related_id: course_id
      });

      res.json({
        success: true,
        data: {
          enrollment: enrollment.toObject({ versionKey: false }),
          course: course.toObject({ versionKey: false })
        },
        message: 'Successfully enrolled in the course'
      });

    } catch (error) {
      console.error('Enrollment error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ENROLLMENT_FAILED',
          message: 'Failed to enroll in course'
        }
      });
    }
  });

// Check enrollment status
router.get("/courses/:course_id/check-enrollment",
  getAuthUser,
  async (req, res) => {
    try {
      const enrollment = await Enrollment.findOne({
        student_id: req.currentUser.id,
        course_id: req.params.course_id
      }).lean();

      res.json({
        success: true,
        data: {
          enrolled: !!enrollment,
          enrollment: enrollment || null
        }
      });

    } catch (error) {
      console.error('Check enrollment error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CHECK_ENROLLMENT_FAILED',
          message: 'Failed to check enrollment status'
        }
      });
    }
  });

// Unenroll from a course
router.delete("/courses/:course_id/enroll/:student_id",
  getAuthUser,
  async (req, res) => {
    try {
      const { course_id, student_id } = req.params;
      const user = req.currentUser;

      // Only allow students to unenroll themselves or admins
      if (user.id !== student_id && user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED_UNENROLL',
            message: 'You can only unenroll yourself'
          }
        });
      }

      const result = await Enrollment.findOneAndDelete({
        course_id,
        student_id
      });

      if (!result) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ENROLLMENT_NOT_FOUND',
            message: 'Enrollment not found'
          }
        });
      }

      // Decrement student count
      await Course.updateOne(
        { id: course_id },
        { $inc: { enrolled_students: -1 } }
      );

      res.json({
        success: true,
        message: 'Successfully unenrolled from course'
      });

    } catch (error) {
      console.error('Unenroll error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UNENROLL_FAILED',
          message: 'Failed to unenroll from course'
        }
      });
    }
  });

// Mark lecture as completed
router.post("/courses/:course_id/lectures/:lecture_id/complete",
  getAuthUser,
  requireRole('student'),
  async (req, res) => {
    try {
      const { course_id, lecture_id } = req.params;
      const user = req.currentUser;

      const enrollment = await Enrollment.findOne({
        student_id: user.id,
        course_id: course_id
      });

      if (!enrollment) {
        return res.status(404).json({
          success: false,
          error: { code: 'ENROLLMENT_NOT_FOUND', message: 'Enrollment not found' }
        });
      }

      // Add to completed_lessons if not exists
      if (!enrollment.completed_lessons.includes(lecture_id)) {
        enrollment.completed_lessons.push(lecture_id);

        // Recalculate progress
        const totalLectures = await Lecture.countDocuments({ course_id });
        if (totalLectures > 0) {
          enrollment.progress = Math.round((enrollment.completed_lessons.length / totalLectures) * 100);
        } else {
          enrollment.progress = 100;
        }

        if (enrollment.progress === 100) {
          enrollment.enrollment_status = 'completed';
          enrollment.completed_at = new Date();

          // Check if course is marked as completed by instructor
          const course = await Course.findOne({ id: course_id });

          // Generate certificate immediately when progress is 100%, regardless of course status
          if (course) {
            const existingCert = await Certificate.findOne({
              user_id: user.id,
              course_id
            });

            if (!existingCert) {
              const certificateCode = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

              await Certificate.create({
                id: uuidv4(),
                user_id: user.id,
                student_name: user.name,
                course_id,
                course_name: course.title,
                instructor_name: course.instructor_name,
                certificate_url: `/certificates/${certificateCode}.pdf`,
                issued_at: new Date(),
                verification_code: certificateCode
              });

              await Notification.create({
                id: uuidv4(),
                user_id: user.id,
                title: 'Course Completed!',
                message: `Congratulations! You have completed the course. Your certificate is ready for download.`,
                type: 'course',
                related_id: course_id
              });
            }
          }
        }

        await enrollment.save();
      }

      res.json({
        success: true,
        data: enrollment
      });

    } catch (error) {
      console.error('Complete lecture error:', error);
      res.status(500).json({ success: false, message: 'Failed to mark lecture as complete' });
    }
  });

// Update enrollment progress
router.put("/enrollments/:enrollment_id/progress",
  getAuthUser,
  async (req, res) => {
    try {
      const { progress, completed_lectures } = req.body;
      const user = req.currentUser;

      const enrollment = await Enrollment.findOne({
        id: req.params.enrollment_id,
        student_id: user.id
      });

      if (!enrollment) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ENROLLMENT_NOT_FOUND',
            message: 'Enrollment not found'
          }
        });
      }

      const updateData = { last_accessed: new Date() };

      if (progress !== undefined) {
        updateData.progress = Math.min(Math.max(progress, 0), 100);
      }

      if (completed_lectures && Array.isArray(completed_lectures)) {
        updateData.completed_lessons = [...new Set([
          ...(enrollment.completed_lessons || []),
          ...completed_lectures
        ])];
      }

      // Check if course is completed
      if (updateData.progress === 100 && enrollment.progress < 100) {
        updateData.enrollment_status = 'completed';
        updateData.completed_at = new Date();

        // Check if course is marked as completed by instructor
        const course = await Course.findOne({ id: enrollment.course_id });

        if (course) {
          // Generate certificate
          const certificateCode = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

          await Certificate.create({
            id: uuidv4(),
            user_id: user.id,
            student_name: user.name,
            course_id: enrollment.course_id,
            course_name: course.title,
            instructor_name: course.instructor_name,
            certificate_url: `/certificates/${certificateCode}.pdf`,
            issued_at: new Date(),
            verification_code: certificateCode
          });

          // Send completion notification
          await Notification.create({
            id: uuidv4(),
            user_id: user.id,
            title: 'Course Completed!',
            message: `Congratulations! You have completed the course. Your certificate is ready for download.`,
            type: 'course',
            related_id: enrollment.course_id
          });
        }
      }

      await Enrollment.updateOne(
        { id: req.params.enrollment_id },
        { $set: updateData }
      );

      res.json({
        success: true,
        message: 'Progress updated successfully'
      });

    } catch (error) {
      console.error('Update progress error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_PROGRESS_FAILED',
          message: 'Failed to update progress'
        }
      });
    }
  });

// Get user's courses (my-courses)
router.get("/my-courses",
  getAuthUser,
  async (req, res) => {
    try {
      const user = req.currentUser;
      let courses = [];

      if (user.role === "student") {
        const enrollments = await Enrollment.find({
          student_id: user.id,
          enrollment_status: 'active'
        }).lean();

        const course_ids = enrollments.map(e => e.course_id);
        courses = await Course.find({ id: { $in: course_ids } }).lean();

        // Merge enrollment data
        const enrollmentMap = new Map();
        enrollments.forEach(e => enrollmentMap.set(e.course_id, e));

        courses = courses.map(course => ({
          ...course,
          enrollment: enrollmentMap.get(course.id)
        }));

      } else if (user.role === "instructor") {
        courses = await Course.find({ instructor_id: user.id }).lean();

        // Add enrollment statistics
        courses = await Promise.all(courses.map(async (course) => {
          const enrolledCount = await Enrollment.countDocuments({
            course_id: course.id,
            enrollment_status: 'active'
          });

          return {
            ...course,
            enrolled_students: enrolledCount
          };
        }));

      } else { // admin
        courses = await Course.find({}).lean();
      }

      res.json({
        success: true,
        data: courses
      });

    } catch (error) {
      console.error('Get my-courses error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_MY_COURSES_FAILED',
          message: 'Failed to fetch your courses'
        }
      });
    }
  });

// ========== Lecture Routes ==========

// Create lecture
router.post("/courses/:course_id/lectures",
  getAuthUser,
  checkCourseAuth,
  validateRequest(lectureSchema),
  async (req, res) => {
    try {
      const validatedData = req.validatedData;

      const lecture = new Lecture({
        id: uuidv4(),
        course_id: req.params.course_id,
        course_name: req.course.title,
        instructor_name: req.course.instructor_name,
        ...validatedData,
        created_at: new Date(),
        updated_at: new Date()
      });

      const savedLecture = await lecture.save();

      // Update course duration
      await Course.updateOne(
        { id: req.params.course_id },
        { $inc: { duration: validatedData.duration } }
      );

      res.status(201).json({
        success: true,
        data: savedLecture.toObject({ versionKey: false }),
        message: 'Lecture created successfully'
      });

    } catch (error) {
      console.error('Create lecture error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_LECTURE_FAILED',
          message: 'Failed to create lecture'
        }
      });
    }
  });

// Get all lectures for a course
router.get("/courses/:course_id/lectures",
  getAuthUser,
  checkEnrollment,
  async (req, res) => {
    try {
      const user = req.currentUser;
      const course_id = req.params.course_id;

      let lectures = await Lecture.find({ course_id })
        .sort({ order: 1 })
        .lean();

      // If student, mark completed lectures
      if (user.role === 'student' && req.enrollment) {
        const completedLectures = req.enrollment.completed_lessons || [];
        lectures = lectures.map(lecture => ({
          ...lecture,
          is_completed: completedLectures.includes(lecture.id)
        }));
      }

      res.json({
        success: true,
        data: lectures
      });

    } catch (error) {
      console.error('Get lectures error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_LECTURES_FAILED',
          message: 'Failed to fetch lectures'
        }
      });
    }
  });

// Update lecture
router.put("/lectures/:lecture_id",
  getAuthUser,
  async (req, res) => {
    try {
      const { lecture_id } = req.params;
      const updateData = req.body;

      // Find lecture to get course_id for authorization
      const lecture = await Lecture.findOne({ id: lecture_id });

      if (!lecture) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'LECTURE_NOT_FOUND',
            message: 'Lecture not found'
          }
        });
      }

      // Check authorization
      const course = await Course.findOne({ id: lecture.course_id });
      const user = req.currentUser;

      if (user.role !== 'admin' && course.instructor_id !== user.id) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You are not authorized to update this lecture'
          }
        });
      }

      // Update duration difference
      if (updateData.duration !== undefined) {
        const durationDiff = updateData.duration - lecture.duration;
        if (durationDiff !== 0) {
          await Course.updateOne(
            { id: lecture.course_id },
            { $inc: { duration: durationDiff } }
          );
        }
      }

      updateData.updated_at = new Date();
      await Lecture.updateOne(
        { id: lecture_id },
        { $set: updateData }
      );

      const updatedLecture = await Lecture.findOne({ id: lecture_id }).lean();

      res.json({
        success: true,
        data: updatedLecture,
        message: 'Lecture updated successfully'
      });

    } catch (error) {
      console.error('Update lecture error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_LECTURE_FAILED',
          message: 'Failed to update lecture'
        }
      });
    }
  });

// Delete lecture
router.delete("/lectures/:lecture_id",
  getAuthUser,
  async (req, res) => {
    try {
      const { lecture_id } = req.params;

      const lecture = await Lecture.findOne({ id: lecture_id });

      if (!lecture) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'LECTURE_NOT_FOUND',
            message: 'Lecture not found'
          }
        });
      }

      // Check authorization
      const course = await Course.findOne({ id: lecture.course_id });
      const user = req.currentUser;

      if (user.role !== 'admin' && course.instructor_id !== user.id) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You are not authorized to delete this lecture'
          }
        });
      }

      // Update course duration
      await Course.updateOne(
        { id: lecture.course_id },
        { $inc: { duration: -lecture.duration } }
      );

      // Remove from enrollments' completed lectures
      await Enrollment.updateMany(
        { course_id: lecture.course_id },
        { $pull: { completed_lessons: lecture_id } }
      );

      await Lecture.deleteOne({ id: lecture_id });

      res.json({
        success: true,
        message: 'Lecture deleted successfully'
      });

    } catch (error) {
      console.error('Delete lecture error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_LECTURE_FAILED',
          message: 'Failed to delete lecture'
        }
      });
    }
  });

// ========== Assignment Routes ==========

// Create assignment
router.post("/courses/:course_id/assignments",
  getAuthUser,
  checkCourseAuth,
  validateRequest(assignmentSchema),
  async (req, res) => {
    try {
      const validatedData = req.validatedData;

      const assignment = new Assignment({
        id: uuidv4(),
        course_id: req.params.course_id,
        course_name: req.course.title,
        instructor_name: req.course.instructor_name,
        ...validatedData,
        created_at: new Date(),
        updated_at: new Date()
      });

      const savedAssignment = await assignment.save();

      // Send notification to enrolled students
      const enrollments = await Enrollment.find({
        course_id: req.params.course_id,
        enrollment_status: 'active'
      }).lean();

      const notificationPromises = enrollments.map(enrollment =>
        Notification.create({
          id: uuidv4(),
          user_id: enrollment.student_id,
          title: 'New Assignment Posted',
          message: `A new assignment has been posted for ${req.course.title}`,
          type: 'assignment',
          related_id: savedAssignment.id
        })
      );

      await Promise.all(notificationPromises);

      res.status(201).json({
        success: true,
        data: savedAssignment.toObject({ versionKey: false }),
        message: 'Assignment created successfully'
      });

    } catch (error) {
      console.error('Create assignment error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_ASSIGNMENT_FAILED',
          message: 'Failed to create assignment'
        }
      });
    }
  });

// Get assignments for a course
router.get("/courses/:course_id/assignments",
  getAuthUser,
  checkEnrollment,
  async (req, res) => {
    try {
      const user = req.currentUser;
      const course_id = req.params.course_id;

      const assignments = await Assignment.find({ course_id }).lean();

      if (user.role === "student") {
        const submissions = await Submission.find({
          student_id: user.id,
          assignment_id: { $in: assignments.map(a => a.id) }
        }).lean();

        const submissionMap = new Map();
        submissions.forEach(s => submissionMap.set(s.assignment_id, s));

        const merged = assignments.map(assignment => {
          const submission = submissionMap.get(assignment.id);
          const dueDate = new Date(assignment.due_date);
          const now = new Date();
          const isOverdue = now > dueDate && !submission;

          // Hide correct answers for quizzes if not yet submitted
          if (assignment.type === 'quiz' && !submission && assignment.questions) {
            assignment.questions = assignment.questions.map(q => {
              const { correct_option_index, ...rest } = q;
              return rest;
            });
          }

          return {
            ...assignment,
            is_submitted: !!submission,
            submission: submission || null,
            is_overdue: isOverdue,
            days_remaining: Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24))
          };
        });

        return res.json({
          success: true,
          data: merged
        });
      }

      // For instructors/admins, include submission counts
      const assignmentsWithStats = await Promise.all(
        assignments.map(async (assignment) => {
          const submissionCount = await Submission.countDocuments({
            assignment_id: assignment.id
          });

          const gradedCount = await Submission.countDocuments({
            assignment_id: assignment.id,
            grade: { $ne: null }
          });

          return {
            ...assignment,
            submission_count: submissionCount,
            graded_count: gradedCount
          };
        })
      );

      res.json({
        success: true,
        data: assignmentsWithStats
      });

    } catch (error) {
      console.error('Get assignments error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ASSIGNMENTS_FAILED',
          message: 'Failed to fetch assignments'
        }
      });
    }
  });

// Update assignment
router.put("/assignments/:assignment_id",
  getAuthUser,
  async (req, res) => {
    try {
      const { assignment_id } = req.params;
      const updateData = req.body;

      const assignment = await Assignment.findOne({ id: assignment_id });

      if (!assignment) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ASSIGNMENT_NOT_FOUND',
            message: 'Assignment not found'
          }
        });
      }

      // Check authorization
      const course = await Course.findOne({ id: assignment.course_id });
      const user = req.currentUser;

      if (user.role !== 'admin' && course.instructor_id !== user.id) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You are not authorized to update this assignment'
          }
        });
      }

      updateData.updated_at = new Date();
      await Assignment.updateOne(
        { id: assignment_id },
        { $set: updateData }
      );

      const updatedAssignment = await Assignment.findOne({ id: assignment_id }).lean();

      res.json({
        success: true,
        data: updatedAssignment,
        message: 'Assignment updated successfully'
      });

    } catch (error) {
      console.error('Update assignment error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_ASSIGNMENT_FAILED',
          message: 'Failed to update assignment'
        }
      });
    }
  });

// Delete assignment
router.delete("/assignments/:assignment_id",
  getAuthUser,
  async (req, res) => {
    try {
      const { assignment_id } = req.params;

      const assignment = await Assignment.findOne({ id: assignment_id });

      if (!assignment) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ASSIGNMENT_NOT_FOUND',
            message: 'Assignment not found'
          }
        });
      }

      // Check authorization
      const course = await Course.findOne({ id: assignment.course_id });
      const user = req.currentUser;

      if (user.role !== 'admin' && course.instructor_id !== user.id) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You are not authorized to delete this assignment'
          }
        });
      }

      // Delete associated submissions
      await Submission.deleteMany({ assignment_id });

      await Assignment.deleteOne({ id: assignment_id });

      res.json({
        success: true,
        message: 'Assignment deleted successfully'
      });

    } catch (error) {
      console.error('Delete assignment error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_ASSIGNMENT_FAILED',
          message: 'Failed to delete assignment'
        }
      });
    }
  });

// ========== Submission Routes ==========

// Submit assignment
router.post("/assignments/:assignment_id/submit",
  getAuthUser,
  requireRole('student'),
  validateRequest(submissionSchema),
  async (req, res) => {
    try {
      const { assignment_id } = req.params;
      const validatedData = req.validatedData;
      const student = req.currentUser;

      // Validation
      const assignment = await Assignment.findOne({ id: assignment_id }).lean();

      if (!assignment) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ASSIGNMENT_NOT_FOUND',
            message: 'Assignment not found'
          }
        });
      }

      // Check if student is enrolled in the course
      const enrollment = await Enrollment.findOne({
        student_id: student.id,
        course_id: assignment.course_id,
        enrollment_status: { $in: ['active', 'completed'] }
      });

      if (!enrollment) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'NOT_ENROLLED',
            message: 'You must be enrolled in the course to submit assignments'
          }
        });
      }

      // Check due date
      const dueDate = new Date(assignment.due_date);
      const now = new Date();

      if (now > dueDate) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'SUBMISSION_OVERDUE',
            message: 'Assignment submission is overdue'
          }
        });
      }

      // Check file format if specified
      if (assignment.allowed_formats && assignment.allowed_formats.length > 0) {
        if (validatedData.file_url) {
          const fileExt = validatedData.file_url.split('.').pop().toLowerCase();
          if (!assignment.allowed_formats.includes(fileExt)) {
            return res.status(400).json({
              success: false,
              error: {
                code: 'INVALID_FILE_FORMAT',
                message: `File format not allowed. Allowed formats: ${assignment.allowed_formats.join(', ')}`
              }
            });
          }
        }
      }

      // Check for existing submission
      const existing = await Submission.findOne({
        assignment_id,
        student_id: student.id
      });

      let submission;

      let submissionData = {
        submitted_at: new Date(),
        status: 'submitted'
      };

      if (assignment.type === 'quiz') {
        const answers = validatedData.answers || [];
        let correctCount = 0;

        // Calculate score
        if (assignment.questions && assignment.questions.length > 0) {
          assignment.questions.forEach((q, idx) => {
            const answer = answers.find(a => a.question_index === idx);
            if (answer && answer.selected_option_index === q.correct_option_index) {
              correctCount++;
            }
          });
          submissionData.score = (correctCount / assignment.questions.length) * 100;
          submissionData.grade = `${correctCount}/${assignment.questions.length}`;
        }
        submissionData.answers = answers;
      } else {
        // File assignment
        submissionData.file_url = validatedData.file_url || '';
        submissionData.text_content = validatedData.text_content || '';
      }

      if (existing) {
        // Update existing submission
        Object.assign(existing, submissionData);
        await existing.save();
        submission = existing;
      } else {
        // Create new submission
        submission = new Submission({
          id: uuidv4(),
          assignment_id,
          student_id: student.id,
          student_name: student.name,
          course_name: assignment.course_name, // Inherit if available
          instructor_name: assignment.instructor_name, // Inherit if available
          ...submissionData
        });

        // If course info missing on assignment (legacy), fetch course
        if (!submission.course_name) {
          const course = await Course.findOne({ id: assignment.course_id });
          if (course) {
            submission.course_name = course.title;
            submission.instructor_name = course.instructor_name;
          }
        }

        await submission.save();
      }

      // Send notification to instructor
      const course = await Course.findOne({ id: assignment.course_id });

      await Notification.create({
        id: uuidv4(),
        user_id: course.instructor_id,
        title: 'New Assignment Submission',
        message: `${student.name} submitted assignment: ${assignment.title}`,
        type: 'assignment',
        related_id: assignment_id
      });

      res.status(existing ? 200 : 201).json({
        success: true,
        data: submission.toObject({ versionKey: false }),
        message: existing ? 'Submission updated successfully' : 'Submission created successfully'
      });

    } catch (error) {
      console.error('Submission error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SUBMISSION_FAILED',
          message: 'Failed to submit assignment'
        }
      });
    }
  });

// Get submissions for an assignment
router.get("/submissions/:assignment_id",
  getAuthUser,
  async (req, res) => {
    try {
      const { assignment_id } = req.params;
      const user = req.currentUser;

      const assignment = await Assignment.findOne({ id: assignment_id });

      if (!assignment) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ASSIGNMENT_NOT_FOUND',
            message: 'Assignment not found'
          }
        });
      }

      // Check authorization
      const course = await Course.findOne({ id: assignment.course_id });

      if (user.role !== 'admin' && course.instructor_id !== user.id) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You are not authorized to view submissions'
          }
        });
      }

      const submissions = await Submission.find({ assignment_id })
        .sort({ submitted_at: -1 })
        .lean();

      // Get student details
      const submissionsWithDetails = await Promise.all(
        submissions.map(async (submission) => {
          const student = await User.findOne({ id: submission.student_id })
            .select('name email profile_picture')
            .lean();

          return {
            ...submission,
            student: {
              name: student?.name,
              email: student?.email,
              profile_picture: student?.profile_picture
            }
          };
        })
      );

      res.json({
        success: true,
        data: submissionsWithDetails,
        assignment: {
          title: assignment.title,
          due_date: assignment.due_date,
          max_points: assignment.max_points
        }
      });

    } catch (error) {
      console.error('Get submissions error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_SUBMISSIONS_FAILED',
          message: 'Failed to fetch submissions'
        }
      });
    }
  });

// Grade submission
router.put("/submissions/:submission_id/grade",
  getAuthUser,
  async (req, res) => {
    try {
      const { submission_id } = req.params;
      const { grade, feedback } = req.body;
      const user = req.currentUser;

      const submission = await Submission.findOne({ id: submission_id });

      if (!submission) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SUBMISSION_NOT_FOUND',
            message: 'Submission not found'
          }
        });
      }

      // Check authorization
      const assignment = await Assignment.findOne({ id: submission.assignment_id });
      const course = await Course.findOne({ id: assignment.course_id });

      if (user.role !== 'admin' && course.instructor_id !== user.id) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You are not authorized to grade this submission'
          }
        });
      }

      // Validate grade
      if (grade !== undefined) {
        if (isNaN(grade) || grade < 0 || grade > assignment.max_points) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_GRADE',
              message: `Grade must be between 0 and ${assignment.max_points}`
            }
          });
        }
      }

      const updateData = {
        updated_at: new Date(),
        status: 'graded'
      };

      if (grade !== undefined) {
        updateData.grade = grade;
        updateData.graded_at = new Date();
        updateData.graded_by = user.id;
      }

      if (feedback !== undefined) {
        updateData.feedback = sanitizeInput(feedback);
      }

      await Submission.updateOne(
        { id: submission_id },
        { $set: updateData }
      );

      // Send notification to student
      await Notification.create({
        id: uuidv4(),
        user_id: submission.student_id,
        title: 'Assignment Graded',
        message: `Your submission for "${assignment.title}" has been graded${grade !== undefined ? `: ${grade}/${assignment.max_points}` : ''}`,
        type: 'grade',
        related_id: submission.assignment_id
      });

      const updatedSubmission = await Submission.findOne({ id: submission_id }).lean();

      res.json({
        success: true,
        data: updatedSubmission,
        message: 'Submission graded successfully'
      });

    } catch (error) {
      console.error('Grade submission error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GRADE_SUBMISSION_FAILED',
          message: 'Failed to grade submission'
        }
      });
    }
  });

// Delete submission
router.delete("/submissions/:submission_id",
  getAuthUser,
  async (req, res) => {
    try {
      const { submission_id } = req.params;
      const user = req.currentUser;

      const submission = await Submission.findOne({ id: submission_id });

      if (!submission) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SUBMISSION_NOT_FOUND',
            message: 'Submission not found'
          }
        });
      }

      // Authorization: student can delete their own, instructor/admin can delete any
      if (user.role === 'student' && submission.student_id !== user.id) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You can only delete your own submissions'
          }
        });
      }

      // For instructors/admins, check course authorization
      if (user.role !== 'student') {
        const assignment = await Assignment.findOne({ id: submission.assignment_id });
        const course = await Course.findOne({ id: assignment.course_id });

        if (user.role !== 'admin' && course.instructor_id !== user.id) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'You are not authorized to delete this submission'
            }
          });
        }
      }

      await Submission.deleteOne({ id: submission_id });

      res.json({
        success: true,
        message: 'Submission deleted successfully'
      });

    } catch (error) {
      console.error('Delete submission error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_SUBMISSION_FAILED',
          message: 'Failed to delete submission'
        }
      });
    }
  });

// ========== Message Routes ==========

// Get messages for a course
router.get("/courses/:course_id/messages",
  getAuthUser,
  checkEnrollment,
  async (req, res) => {
    try {
      const { course_id } = req.params;

      const messages = await Message.find({ course_id })
        .sort({ timestamp: 1 })
        .limit(100) // Limit to last 100 messages
        .lean();

      res.json({
        success: true,
        data: messages
      });

    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_MESSAGES_FAILED',
          message: 'Failed to fetch messages'
        }
      });
    }
  });

// Post a message to a course
router.post("/courses/:course_id/messages",
  getAuthUser,
  checkEnrollment,
  async (req, res) => {
    try {
      const { course_id } = req.params;
      const { message } = req.body;
      const user = req.currentUser;

      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_MESSAGE',
            message: 'Message cannot be empty'
          }
        });
      }

      const newMessage = new Message({
        id: uuidv4(),
        course_id,
        sender_id: user.id,
        sender_name: user.name,
        sender_role: user.role,
        message: message.trim(),
        timestamp: new Date()
      });

      await newMessage.save();

      res.status(201).json({
        success: true,
        data: newMessage.toObject({ versionKey: false }),
        message: 'Message sent'
      });

    } catch (error) {
      console.error('Post message error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SEND_MESSAGE_FAILED',
          message: 'Failed to send message'
        }
      });
    }
  });

// ========== Review Routes ==========

// Add course review
router.post("/courses/:course_id/reviews",
  getAuthUser,
  requireRole('student'),
  validateRequest(reviewSchema),
  async (req, res) => {
    try {
      const course_id = req.params.course_id;
      const user = req.currentUser;
      const validatedData = req.validatedData;

      // Check if user is enrolled and has completed the course
      const enrollment = await Enrollment.findOne({
        student_id: user.id,
        course_id,
        enrollment_status: 'completed'
      });

      if (!enrollment) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'NOT_ELIGIBLE',
            message: 'You must complete the course before leaving a review'
          }
        });
      }

      // Check if user already reviewed
      const existingReview = await Review.findOne({
        course_id,
        student_id: user.id
      });

      if (existingReview) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ALREADY_REVIEWED',
            message: 'You have already reviewed this course'
          }
        });
      }

      const review = new Review({
        id: uuidv4(),
        course_id,
        student_id: user.id,
        student_name: user.name,
        ...validatedData,
        created_at: new Date(),
        updated_at: new Date()
      });

      await review.save();

      // Update course rating
      const reviews = await Review.find({ course_id }).lean();
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

      await Course.updateOne(
        { id: course_id },
        {
          $set: { rating: parseFloat(avgRating.toFixed(1)) },
          $inc: { review_count: 1 }
        }
      );

      res.status(201).json({
        success: true,
        data: review.toObject({ versionKey: false }),
        message: 'Review added successfully'
      });

    } catch (error) {
      console.error('Add review error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ADD_REVIEW_FAILED',
          message: 'Failed to add review'
        }
      });
    }
  });

// Get course reviews
router.get("/courses/:course_id/reviews", async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = 'created_at', order = 'desc' } = req.query;
    const course_id = req.params.course_id;

    const skip = (page - 1) * limit;
    const sortOrder = order === 'desc' ? -1 : 1;

    const [reviews, total] = await Promise.all([
      Review.find({ course_id })
        .sort({ [sort]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Review.countDocuments({ course_id })
    ]);

    // Get student profile pictures
    const reviewsWithDetails = await Promise.all(
      reviews.map(async (review) => {
        const student = await User.findOne({ id: review.student_id })
          .select('profile_picture')
          .lean();

        return {
          ...review,
          student_profile_picture: student?.profile_picture
        };
      })
    );

    res.json({
      success: true,
      data: reviewsWithDetails,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_REVIEWS_FAILED',
        message: 'Failed to fetch reviews'
      }
    });
  }
});

// ========== Chat/Message Routes ==========

// Create message
router.post("/courses/:course_id/messages",
  getAuthUser,
  checkEnrollment,
  async (req, res) => {
    try {
      const { message } = req.body;
      const user = req.currentUser;
      const course_id = req.params.course_id;

      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'EMPTY_MESSAGE',
            message: 'Message cannot be empty'
          }
        });
      }

      const sanitizedMessage = sanitizeInput(message.trim());

      const msg = new Message({
        id: uuidv4(),
        course_id,
        sender_id: user.id,
        sender_name: user.name,
        sender_role: user.role,
        message: sanitizedMessage,
        timestamp: new Date()
      });

      await msg.save();

      // Real-time broadcasting would happen here (Socket.io)

      res.status(201).json({
        success: true,
        data: msg.toObject({ versionKey: false }),
        message: 'Message sent successfully'
      });

    } catch (error) {
      console.error('Create message error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SEND_MESSAGE_FAILED',
          message: 'Failed to send message'
        }
      });
    }
  });

// Get messages
router.get("/courses/:course_id/messages",
  getAuthUser,
  checkEnrollment,
  async (req, res) => {
    try {
      const { before, limit = 50 } = req.query;
      const course_id = req.params.course_id;

      let query = { course_id };

      if (before) {
        query.timestamp = { $lt: new Date(before) };
      }

      const messages = await Message.find(query)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .lean();

      res.json({
        success: true,
        data: messages.reverse() // Return in chronological order
      });

    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_MESSAGES_FAILED',
          message: 'Failed to fetch messages'
        }
      });
    }
  });

// ========== Admin Routes ==========

// Get all users (admin only)
router.get("/admin/users",
  getAuthUser,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { page = 1, limit = 20, role, search } = req.query;

      const query = {};

      if (role) query.role = role;
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        User.find(query, { password_hash: 0, verification_token: 0 })
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        User.countDocuments(query)
      ]);

      // Add statistics for each user
      const usersWithStats = await Promise.all(
        users.map(async (user) => {
          let stats = {};

          if (user.role === 'student') {
            const [enrollments, submissions] = await Promise.all([
              Enrollment.countDocuments({ student_id: user.id }),
              Submission.countDocuments({ student_id: user.id })
            ]);

            stats = { enrollments, submissions };

          } else if (user.role === 'instructor') {
            const [courses, students] = await Promise.all([
              Course.countDocuments({ instructor_id: user.id }),
              Enrollment.countDocuments({
                course_id: {
                  $in: (await Course.find({ instructor_id: user.id }).select('id')).map(c => c.id)
                }
              })
            ]);

            stats = { courses, students };
          }

          return { ...user, stats };
        })
      );

      res.json({
        success: true,
        data: usersWithStats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_USERS_FAILED',
          message: 'Failed to fetch users'
        }
      });
    }
  });

// Delete user (admin only)
router.delete("/admin/users/:user_id",
  getAuthUser,
  requireRole('admin'),
  async (req, res) => {
    try {
      const user_id = req.params.user_id;

      // Cannot delete self
      if (user_id === req.currentUser.id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CANNOT_DELETE_SELF',
            message: 'You cannot delete your own account'
          }
        });
      }

      const user = await User.findOne({ id: user_id });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      // Start transaction for cascaded deletes
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        if (user.role === 'instructor') {
          // Get instructor's courses
          const courses = await Course.find({ instructor_id: user_id }).select('id').session(session);
          const courseIds = courses.map(c => c.id);

          // Delete courses and related data
          await Course.deleteMany({ instructor_id: user_id }).session(session);
          await Lecture.deleteMany({ course_id: { $in: courseIds } }).session(session);
          await Assignment.deleteMany({ course_id: { $in: courseIds } }).session(session);
          await Message.deleteMany({ course_id: { $in: courseIds } }).session(session);
          await Review.deleteMany({ course_id: { $in: courseIds } }).session(session);
        }

        // Delete user's enrollments
        await Enrollment.deleteMany({ student_id: user_id }).session(session);

        // Delete user's submissions
        await Submission.deleteMany({ student_id: user_id }).session(session);

        // Delete user's reviews
        await Review.deleteMany({ student_id: user_id }).session(session);

        // Delete user
        await User.deleteOne({ id: user_id }).session(session);

        await session.commitTransaction();

        res.json({
          success: true,
          message: 'User and all related data deleted successfully'
        });

      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }

    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_USER_FAILED',
          message: 'Failed to delete user'
        }
      });
    }
  });


// ========== Certificate Routes ==========

// Get certificate by verification code (Public)
router.get("/certificates/:code", async (req, res) => {
  try {
    const { code } = req.params;

    // Find certificate
    const certificate = await Certificate.findOne({ verification_code: code });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CERTIFICATE_NOT_FOUND',
          message: 'Certificate not found'
        }
      });
    }

    // Return extended details for the view
    // We already denormalized data, so it should be there. 
    // If we missed something in denormalization, we might fetch it here, but denormalize_data.js ran.

    res.json({
      success: true,
      data: certificate
    });

  } catch (error) {
    console.error('Get certificate error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_CERTIFICATE_FAILED',
        message: 'Failed to fetch certificate'
      }
    });
  }
});

export default router;