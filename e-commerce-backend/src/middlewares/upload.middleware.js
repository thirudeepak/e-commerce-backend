'use strict';

const multer = require('multer');

// Use in-memory storage so files are available as buffers (for Cloudinary upload_stream)
const storage = multer.memoryStorage();

// Allowed MIME types
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * File filter — only allows jpeg, jpg, png, and webp images.
 */
function fileFilter(req, file, cb) {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error(
      'INVALID_FILE_TYPE: Only JPEG, JPG, PNG, and WEBP image files are allowed.'
    );
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
}

// Multer instance with memoryStorage, fileFilter, and 5 MB size limit
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

module.exports = { upload };
