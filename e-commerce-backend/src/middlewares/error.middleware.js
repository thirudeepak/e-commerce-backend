'use strict';

const { ValidationError: JoiValidationError } = require('joi');
const { ValidationError, UniqueConstraintError } = require('sequelize');
const { JsonWebTokenError, TokenExpiredError } = require('jsonwebtoken');
const multer = require('multer');
const logger = require('../config/logger');

/**
 * Centralized Express error-handling middleware.
 * Must be registered as a 4-argument middleware after all routes.
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
// eslint-disable-next-line no-unused-vars
function errorMiddleware(err, req, res, next) {
  const isProduction = process.env.NODE_ENV === 'production';

  // Log the error internally
  logger.error(`${req.method} ${req.originalUrl} — ${err.message}`, {
    stack: isProduction ? undefined : err.stack,
    statusCode: err.statusCode,
  });

  // --- Joi Validation Error (422) ---
  if (err instanceof JoiValidationError || err.isJoi) {
    const messages = err.details
      ? err.details.map((d) => d.message.replace(/['"]/g, ''))
      : [err.message];

    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      data: messages,
    });
  }

  // --- Sequelize UniqueConstraintError (409) ---
  if (err instanceof UniqueConstraintError) {
    const fields = err.errors.map((e) => `${e.path} already exists`);
    return res.status(409).json({
      success: false,
      message: fields.join(', ') || 'A unique constraint was violated.',
      data: null,
    });
  }

  // --- Sequelize ValidationError (422) ---
  if (err instanceof ValidationError) {
    const messages = err.errors.map((e) => e.message);
    return res.status(422).json({
      success: false,
      message: messages.join(', ') || 'Sequelize validation error.',
      data: null,
    });
  }

  // --- JWT TokenExpiredError (401) ---
  if (err instanceof TokenExpiredError) {
    return res.status(401).json({
      success: false,
      message: 'Token has expired. Please log in again.',
      data: null,
    });
  }

  // --- JWT JsonWebTokenError (401) ---
  if (err instanceof JsonWebTokenError) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token. Please log in again.',
      data: null,
    });
  }

  // --- Multer Errors (400) ---
  if (err instanceof multer.MulterError) {
    let message = 'File upload error.';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size exceeds the allowed limit of 5 MB.';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files uploaded at once.';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = `Unexpected field: ${err.field}.`;
    }
    return res.status(400).json({
      success: false,
      message,
      data: null,
    });
  }

  // Handle manually thrown file type error from fileFilter
  if (err.message && err.message.startsWith('INVALID_FILE_TYPE')) {
    return res.status(400).json({
      success: false,
      message: err.message.replace('INVALID_FILE_TYPE: ', ''),
      data: null,
    });
  }

  // --- Default / Unhandled Error (500) ---
  const statusCode = err.statusCode || err.status || 500;
  return res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500 && isProduction
        ? 'An internal server error occurred.'
        : err.message || 'An internal server error occurred.',
    data: null,
    ...(isProduction ? {} : { stack: err.stack }),
  });
}

module.exports = { errorMiddleware };
