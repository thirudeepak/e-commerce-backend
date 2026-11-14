'use strict';

const jwt = require('jsonwebtoken');

/**
 * Authenticate middleware.
 * Reads a Bearer token from the Authorization header,
 * verifies it, and sets req.user = { id, role }.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        data: null,
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Token is missing.',
        data: null,
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Set minimal user payload on the request
    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    next();
  } catch (error) {
    // Delegate JWT errors to the central error handler
    next(error);
  }
}

module.exports = { authenticate };
