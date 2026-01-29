// server/routes/uploadRoutes.js

import express from "express";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { getAuthUser } from '../utils/auth.js';
import { hasRole as requireRole } from '../utils/security.js';
import { User, Course, Assignment, Submission } from '../models/index.js';
import sharp from 'sharp';
import mime from 'mime-types';

const router = express.Router();

// ========== Configuration ==========

// Create uploads directory if it doesn't exist
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Allowed file types and their maximum sizes (in bytes)
const ALLOWED_FILE_TYPES = {
  image: {
    mimes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    maxSize: 5 * 1024 * 1024, // 5MB
    resourceType: 'image',
    folder: 'images'
  },
  video: {
    mimes: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
    maxSize: 100 * 1024 * 1024, // 100MB
    resourceType: 'video',
    folder: 'videos'
  },
  document: {
    mimes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv'
    ],
    maxSize: 10 * 1024 * 1024, // 10MB
    resourceType: 'auto',
    folder: 'documents'
  },
  audio: {
    mimes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'],
    maxSize: 20 * 1024 * 1024, // 20MB
    resourceType: 'video', // Cloudinary uses 'video' for audio
    folder: 'audio'
  },
  other: {
    mimes: ['*/*'],
    maxSize: 50 * 1024 * 1024, // 50MB
    resourceType: 'auto',
    folder: 'others'
  }
};

// ========== Multer Configuration ==========

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const fileType = getFileType(file.mimetype);

  if (!fileType) {
    return cb(new Error('File type not allowed'), false);
  }

  if (file.size > ALLOWED_FILE_TYPES[fileType].maxSize) {
    return cb(new Error(`File too large. Maximum size is ${formatBytes(ALLOWED_FILE_TYPES[fileType].maxSize)}`), false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max overall
    files: 5 // Maximum 5 files at once
  }
});

// ========== Helper Functions ==========

const getFileType = (mimeType) => {
  for (const [type, config] of Object.entries(ALLOWED_FILE_TYPES)) {
    if (config.mimes.includes(mimeType) || (type === 'other' && config.mimes[0] === '*/*')) {
      return type;
    }
  }
  return null;
};

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const generateFileName = (originalName, fileType) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = path.extname(originalName) || `.${mime.extension(fileType) || 'bin'}`;
  return `${timestamp}-${randomString}${extension}`;
};

const optimizeImage = async (buffer, mimeType) => {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // Resize if too large
    if (metadata.width > 1920 || metadata.height > 1080) {
      image.resize(1920, 1080, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Optimize based on format
    if (mimeType === 'image/jpeg') {
      return await image.jpeg({ quality: 80, progressive: true }).toBuffer();
    } else if (mimeType === 'image/png') {
      return await image.png({ compressionLevel: 8, progressive: true }).toBuffer();
    } else if (mimeType === 'image/webp') {
      return await image.webp({ quality: 80 }).toBuffer();
    }

    return buffer;
  } catch (error) {
    console.warn('Image optimization failed:', error.message);
    return buffer; // Return original if optimization fails
  }
};

const validateUploadContext = async (req) => {
  const { context, contextId } = req.body;

  if (!context) {
    return { valid: true }; // No context validation needed
  }

  const user = req.currentUser;

  switch (context) {
    case 'course_thumbnail':
      const course = await Course.findOne({ id: contextId });
      if (!course) {
        return { valid: false, error: 'Course not found' };
      }
      if (user.role !== 'admin' && course.instructor_id !== user.id) {
        return { valid: false, error: 'Not authorized to update this course' };
      }
      break;

    case 'profile_picture':
    case 'avatar':
    case 'government_id':
    case 'resume':
    case 'logo':
    case 'intro_video':
      // Ensure contextId matches the authenticated user's ID
      // We convert both to strings to ensure safe comparison
      if (String(contextId) !== String(user.id) && user.role !== 'admin') {
        return { valid: false, error: 'Not authorized to update this profile' };
      }
      break;

    case 'assignment_submission':
      const assignment = await Assignment.findOne({ id: contextId });
      if (!assignment) {
        return { valid: false, error: 'Assignment not found' };
      }

      // Check if student is enrolled in the course
      const enrollment = await require('mongoose').model('Enrollment').findOne({
        student_id: user.id,
        course_id: assignment.course_id
      });

      if (!enrollment && user.role !== 'admin') {
        return { valid: false, error: 'You are not enrolled in this course' };
      }
      break;

    case 'lecture_video':
      // Similar validation as course_thumbnail
      break;

    default:
      return { valid: false, error: 'Invalid upload context' };
  }

  return { valid: true };
};

// ========== Upload Routes ==========

// Default upload route (redirects to single upload logic)
router.post("/",
  getAuthUser,
  upload.single("file"),
  async (req, res) => {
    // This duplicates the logic of /single but ensures POST /api/upload works directly
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No file uploaded'
          }
        });
      }

      // Validate upload context
      const contextValidation = await validateUploadContext(req);
      if (!contextValidation.valid) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UPLOAD_CONTEXT_INVALID',
            message: contextValidation.error
          }
        });
      }

      const fileType = getFileType(req.file.mimetype);
      const config = ALLOWED_FILE_TYPES[fileType];

      // Optimize images before upload
      let fileBuffer = req.file.buffer;
      if (fileType === 'image') {
        fileBuffer = await optimizeImage(fileBuffer, req.file.mimetype);
      }

      // Convert to data URI for Cloudinary
      const dataUri = `data:${req.file.mimetype};base64,${fileBuffer.toString("base64")}`;

      // Generate public ID without extension for Cloudinary (avoids .pdf.pdf)
      const fileNameWithExt = generateFileName(req.file.originalname, req.file.mimetype);
      const publicId = fileNameWithExt.replace(/\.[^/.]+$/, "");

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(dataUri, {
        resource_type: config.resourceType,
        folder: config.folder,
        public_id: publicId,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        tags: [req.body.context || 'general', `user_${req.currentUser.id}`],
        context: {
          uploader: req.currentUser.name,
          uploader_id: req.currentUser.id,
          context: req.body.context || 'general',
          original_filename: req.file.originalname
        }
      });

      res.json({
        success: true,
        data: {
          url: result.secure_url,
          public_id: result.public_id,
          original_filename: req.file.originalname,
          file_type: fileType,
          size: req.file.size,
          uploaded_at: new Date()
        },
        message: 'File uploaded successfully'
      });

    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: 'Upload failed',
          details: error.message
        }
      });
    }
  });

// Single file upload
router.post("/single",
  getAuthUser,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No file uploaded'
          }
        });
      }

      // Validate upload context
      const contextValidation = await validateUploadContext(req);
      if (!contextValidation.valid) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UPLOAD_CONTEXT_INVALID',
            message: contextValidation.error
          }
        });
      }

      const fileType = getFileType(req.file.mimetype);
      const config = ALLOWED_FILE_TYPES[fileType];

      // Optimize images before upload
      let fileBuffer = req.file.buffer;
      if (fileType === 'image') {
        fileBuffer = await optimizeImage(fileBuffer, req.file.mimetype);
      }

      // Convert to data URI for Cloudinary
      const dataUri = `data:${req.file.mimetype};base64,${fileBuffer.toString("base64")}`;

      // Generate public ID without extension for Cloudinary (avoids .pdf.pdf)
      const fileNameWithExt = generateFileName(req.file.originalname, req.file.mimetype);
      const publicId = fileNameWithExt.replace(/\.[^/.]+$/, "");

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(dataUri, {
        resource_type: config.resourceType,
        folder: config.folder,
        public_id: publicId,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        tags: [req.body.context || 'general', `user_${req.currentUser.id}`],
        context: {
          uploader: req.currentUser.name,
          uploader_id: req.currentUser.id,
          context: req.body.context || 'general',
          original_filename: req.file.originalname
        }
      });

      // Store upload record in database (optional)
      const uploadRecord = {
        id: uuidv4(),
        user_id: req.currentUser.id,
        original_filename: req.file.originalname,
        cloudinary_url: result.secure_url,
        cloudinary_public_id: result.public_id,
        file_type: fileType,
        mime_type: req.file.mimetype,
        size: req.file.size,
        context: req.body.context || 'general',
        context_id: req.body.contextId || null,
        uploaded_at: new Date(),
        metadata: {
          width: result.width,
          height: result.height,
          format: result.format,
          resource_type: result.resource_type,
          bytes: result.bytes,
          duration: result.duration // for videos/audio
        }
      };

      // You can save this to a database if needed
      // await UploadRecord.create(uploadRecord);

      res.json({
        success: true,
        data: {
          url: result.secure_url,
          public_id: result.public_id,
          original_filename: req.file.originalname,
          file_type: fileType,
          size: req.file.size,
          uploaded_at: new Date(),
          metadata: uploadRecord.metadata
        },
        message: 'File uploaded successfully'
      });

    } catch (error) {
      console.error("Upload error:", error);

      let errorCode = 'UPLOAD_FAILED';
      let errorMessage = 'Upload failed';
      let statusCode = 500;

      if (error.message.includes('File type not allowed')) {
        errorCode = 'INVALID_FILE_TYPE';
        errorMessage = `File type not allowed. Allowed types: ${Object.values(ALLOWED_FILE_TYPES).flatMap(c => c.mimes).filter(m => m !== '*/*').join(', ')}`;
        statusCode = 400;
      } else if (error.message.includes('File too large')) {
        errorCode = 'FILE_TOO_LARGE';
        errorMessage = error.message;
        statusCode = 400;
      } else if (error.message.includes('Cloudinary')) {
        errorCode = 'CLOUDINARY_ERROR';
        errorMessage = 'File storage service error';
      }

      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  });

// Multiple files upload
router.post("/multiple",
  getAuthUser,
  upload.array("files", 5), // Max 5 files
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILES',
            message: 'No files uploaded'
          }
        });
      }

      // Validate upload context
      const contextValidation = await validateUploadContext(req);
      if (!contextValidation.valid) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UPLOAD_CONTEXT_INVALID',
            message: contextValidation.error
          }
        });
      }

      const uploadPromises = req.files.map(async (file) => {
        const fileType = getFileType(file.mimetype);
        const config = ALLOWED_FILE_TYPES[fileType];

        // Optimize images
        let fileBuffer = file.buffer;
        if (fileType === 'image') {
          fileBuffer = await optimizeImage(fileBuffer, file.mimetype);
        }

        const dataUri = `data:${file.mimetype};base64,${fileBuffer.toString("base64")}`;

        const fileNameWithExt = generateFileName(file.originalname, file.mimetype);
        const publicId = fileNameWithExt.replace(/\.[^/.]+$/, "");

        const result = await cloudinary.uploader.upload(dataUri, {
          resource_type: config.resourceType,
          folder: config.folder,
          public_id: publicId,
          use_filename: true,
          unique_filename: true,
          overwrite: false,
          tags: [req.body.context || 'general', `user_${req.currentUser.id}`, 'batch_upload']
        });

        return {
          original_filename: file.originalname,
          url: result.secure_url,
          public_id: result.public_id,
          file_type: fileType,
          size: file.size,
          success: true
        };
      });

      const results = await Promise.allSettled(uploadPromises);

      const successfulUploads = [];
      const failedUploads = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulUploads.push(result.value);
        } else {
          failedUploads.push({
            filename: req.files[index].originalname,
            error: result.reason.message
          });
        }
      });

      res.json({
        success: true,
        data: {
          uploaded: successfulUploads,
          failed: failedUploads
        },
        message: `Uploaded ${successfulUploads.length} of ${req.files.length} files`
      });

    } catch (error) {
      console.error("Multiple upload error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: 'Multiple file upload failed'
        }
      });
    }
  });

// Chunked upload for large files
router.post("/chunked",
  getAuthUser,
  upload.single("chunk"),
  async (req, res) => {
    try {
      const { chunkIndex, totalChunks, fileName, fileType, context, contextId } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_CHUNK',
            message: 'No chunk data received'
          }
        });
      }

      // Validate context
      const contextValidation = await validateUploadContext(req);
      if (!contextValidation.valid) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'UPLOAD_CONTEXT_INVALID',
            message: contextValidation.error
          }
        });
      }

      const chunkNumber = parseInt(chunkIndex);
      const totalChunksCount = parseInt(totalChunks);

      if (isNaN(chunkNumber) || isNaN(totalChunksCount)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CHUNK_DATA',
            message: 'Invalid chunk data'
          }
        });
      }

      // Create temporary directory for chunks
      const tempDir = path.join(UPLOADS_DIR, 'temp', req.currentUser.id, fileName);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Save chunk
      const chunkPath = path.join(tempDir, `chunk-${chunkNumber}`);
      fs.writeFileSync(chunkPath, req.file.buffer);

      // Check if all chunks are uploaded
      const uploadedChunks = fs.readdirSync(tempDir).filter(f => f.startsWith('chunk-'));

      if (uploadedChunks.length === totalChunksCount) {
        // All chunks received, reassemble file
        const reassembledBuffer = Buffer.concat(
          Array.from({ length: totalChunksCount }, (_, i) => {
            const chunkFile = path.join(tempDir, `chunk-${i}`);
            return fs.readFileSync(chunkFile);
          })
        );

        // Clean up chunks
        fs.rmSync(tempDir, { recursive: true, force: true });

        // Upload to Cloudinary
        const config = ALLOWED_FILE_TYPES[fileType] || ALLOWED_FILE_TYPES.other;
        const dataUri = `data:${req.file.mimetype};base64,${reassembledBuffer.toString("base64")}`;

        const fileNameWithExt = generateFileName(fileName, req.file.mimetype);
        const publicId = fileNameWithExt.replace(/\.[^/.]+$/, "");

        const result = await cloudinary.uploader.upload(dataUri, {
          resource_type: config.resourceType,
          folder: config.folder,
          public_id: publicId,
          use_filename: true,
          unique_filename: true,
          overwrite: false
        });

        return res.json({
          success: true,
          data: {
            url: result.secure_url,
            public_id: result.public_id,
            original_filename: fileName,
            file_type: fileType,
            size: reassembledBuffer.length
          },
          message: 'File uploaded successfully',
          completed: true
        });
      }

      res.json({
        success: true,
        data: {
          chunk_received: chunkNumber,
          total_chunks: totalChunksCount,
          remaining: totalChunksCount - uploadedChunks.length
        },
        message: `Chunk ${chunkNumber + 1} of ${totalChunksCount} received`,
        completed: false
      });

    } catch (error) {
      console.error("Chunked upload error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CHUNKED_UPLOAD_FAILED',
          message: 'Chunked upload failed'
        }
      });
    }
  });

// Delete uploaded file
router.delete("/:public_id",
  getAuthUser,
  async (req, res) => {
    try {
      const { public_id } = req.params;

      // Cloudinary destroy doesn't reliably support 'auto', so we try common types
      const resourceTypes = ['image', 'video', 'raw'];
      let deleted = false;
      let lastResult = null;

      for (const type of resourceTypes) {
        try {
          const result = await cloudinary.uploader.destroy(public_id, {
            resource_type: type,
            invalidate: true
          });

          if (result.result === 'ok') {
            deleted = true;
            lastResult = result;
            break;
          }
        } catch (e) {
          // Continue to next type if error
          console.log(`Failed to delete as ${type}:`, e.message);
        }
      }

      if (!deleted) {
        // If we couldn't delete it, it might not exist or we missed the type.
        // However, we should probably check if it was already gone.
        // For user experience, if it's gone, that's good enough.
        console.warn(`File ${public_id} could not be deleted or not found.`);
        // We return success anyway to allow the client to clear the UI
        return res.json({
          success: true,
          message: 'File not found or already deleted (checked image, video, raw)',
          data: { result: 'not found' }
        });
      }

      res.json({
        success: true,
        message: 'File deleted successfully',
        data: lastResult
      });

    } catch (error) {
      console.error("Delete file error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to delete file'
        }
      });
    }
  });

// Get upload configuration (for frontend)
router.get("/config",
  getAuthUser,
  (req, res) => {
    try {
      const config = {
        allowed_types: Object.entries(ALLOWED_FILE_TYPES).reduce((acc, [type, typeConfig]) => {
          if (type !== 'other') {
            acc[type] = {
              mimes: typeConfig.mimes,
              max_size: typeConfig.maxSize,
              max_size_formatted: formatBytes(typeConfig.maxSize)
            };
          }
          return acc;
        }, {}),
        max_file_size: formatBytes(100 * 1024 * 1024), // 100MB
        max_files_per_upload: 5,
        supports_chunked_uploads: true,
        chunk_size: 5 * 1024 * 1024, // 5MB chunks
        contexts: [
          { value: 'profile_picture', label: 'Profile Picture', allowed_types: ['image'] },
          { value: 'course_thumbnail', label: 'Course Thumbnail', allowed_types: ['image'] },
          { value: 'lecture_video', label: 'Lecture Video', allowed_types: ['video'] },
          { value: 'assignment_submission', label: 'Assignment Submission', allowed_types: ['document', 'image'] },
          { value: 'resource_file', label: 'Resource File', allowed_types: ['document', 'image', 'video', 'audio'] },
          { value: 'general', label: 'General Upload', allowed_types: ['image', 'document', 'video', 'audio'] }
        ]
      };

      res.json({
        success: true,
        data: config
      });

    } catch (error) {
      console.error("Get config error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CONFIG_ERROR',
          message: 'Failed to get upload configuration'
        }
      });
    }
  });

// Upload progress endpoint (for tracking chunked uploads)
router.get("/progress/:uploadId",
  getAuthUser,
  (req, res) => {
    try {
      const { uploadId } = req.params;
      // In a real implementation, you would track progress in Redis or database
      // This is a simplified version

      res.json({
        success: true,
        data: {
          upload_id: uploadId,
          progress: 0, // This would be calculated from your tracking system
          status: 'pending'
        }
      });

    } catch (error) {
      console.error("Get progress error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PROGRESS_ERROR',
          message: 'Failed to get upload progress'
        }
      });
    }
  });

// Local file upload (for development or when Cloudinary is not available)
router.post("/local",
  getAuthUser,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No file uploaded'
          }
        });
      }

      // Only allow local uploads in development
      if (process.env.NODE_ENV === 'production' && process.env.USE_CLOUDINARY !== 'false') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'LOCAL_UPLOAD_DISABLED',
            message: 'Local uploads are disabled in production'
          }
        });
      }

      const fileType = getFileType(req.file.mimetype);
      const config = ALLOWED_FILE_TYPES[fileType];

      if (!config) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: 'File type not allowed'
          }
        });
      }

      // Optimize images
      let fileBuffer = req.file.buffer;
      if (fileType === 'image') {
        fileBuffer = await optimizeImage(fileBuffer, req.file.mimetype);
      }

      // Generate unique filename
      const fileName = generateFileName(req.file.originalname, req.file.mimetype);
      const filePath = path.join(UPLOADS_DIR, config.folder, fileName);

      // Ensure directory exists
      const dirPath = path.dirname(filePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Save file
      fs.writeFileSync(filePath, fileBuffer);

      // Construct URL
      const fileUrl = `/uploads/${config.folder}/${fileName}`;

      res.json({
        success: true,
        data: {
          url: fileUrl,
          path: filePath,
          original_filename: req.file.originalname,
          file_type: fileType,
          size: fileBuffer.length,
          uploaded_at: new Date()
        },
        message: 'File uploaded locally'
      });

    } catch (error) {
      console.error("Local upload error:", error);
      res.status(500).json({
        success: false,
        error: {
          code: 'LOCAL_UPLOAD_FAILED',
          message: 'Local upload failed'
        }
      });
    }
  });

// Health check for upload service
router.get("/health", (req, res) => {
  try {
    // Check if Cloudinary is configured
    const cloudinaryConfigured = !!process.env.CLOUDINARY_CLOUD_NAME;

    // Check if upload directory is writable
    let localStorageAvailable = false;
    try {
      fs.accessSync(UPLOADS_DIR, fs.constants.W_OK);
      localStorageAvailable = true;
    } catch (error) {
      localStorageAvailable = false;
    }

    res.json({
      success: true,
      data: {
        service: 'upload',
        status: 'operational',
        cloudinary_configured: cloudinaryConfigured,
        local_storage_available: localStorageAvailable,
        max_file_size: formatBytes(100 * 1024 * 1024),
        allowed_file_types: Object.keys(ALLOWED_FILE_TYPES).filter(k => k !== 'other'),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Upload service health check failed'
      }
    });
  }
});

export default router;