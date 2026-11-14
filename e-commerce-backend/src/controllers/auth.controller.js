'use strict';

const Joi = require('joi');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Cart, Wishlist, Role } = require('../models');

// ─── Token Helper ─────────────────────────────────────────────────────────────

function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
}

// ─── Inline Joi Validation Schemas ────────────────────────────────────────────

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Name is required.',
    'string.min': 'Name must be at least 2 characters long.',
  }),
  email: Joi.string().trim().email().required().messages({
    'string.empty': 'Email is required.',
    'string.email': 'Please provide a valid email address.',
  }),
  password: Joi.string().min(6).max(128).required().messages({
    'string.empty': 'Password is required.',
    'string.min': 'Password must be at least 6 characters long.',
  }),
  role: Joi.string().valid('ADMIN', 'SALES_PERSON', 'USER').optional().default('USER'),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().email().required().messages({
    'string.empty': 'Email is required.',
    'string.email': 'Please provide a valid email address.',
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required.',
  }),
});

const adminCreateUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Name is required.',
    'string.min': 'Name must be at least 2 characters long.',
  }),
  email: Joi.string().trim().email().required().messages({
    'string.empty': 'Email is required.',
    'string.email': 'Please provide a valid email address.',
  }),
  password: Joi.string().min(6).max(128).required().messages({
    'string.empty': 'Password is required.',
    'string.min': 'Password must be at least 6 characters long.',
  }),
  role: Joi.string().valid('ADMIN', 'SALES_PERSON', 'USER').required().messages({
    'any.only': 'Role must be one of ADMIN, SALES_PERSON, USER.',
    'any.required': 'Role is required.',
  }),
  isActive: Joi.boolean().optional().default(true),
});

// ─── Controller Handlers (Self-Contained) ──────────────────────────────────────

/**
 * Register a new user, create their default Cart and Wishlist
 */
async function register(req, res, next) {
  try {
    const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
    if (error) {
      error.statusCode = 422;
      return next(error);
    }

    const { name, email, password, role } = value;
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered.',
        data: null,
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Validate role
    const assignedRole = ['ADMIN', 'SALES_PERSON', 'USER'].includes(role) ? role : 'USER';

    let roleId = null;
    const roleRecord = await Role.findOne({ where: { name: assignedRole } });
    if (roleRecord) {
      roleId = roleRecord.id;
    }

    // Create user
    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: assignedRole,
      roleId,
    });

    // Auto-create default Cart and Wishlist for user
    await Promise.all([
      Cart.create({ userId: user.id }),
      Wishlist.create({ userId: user.id }),
    ]);

    const token = generateToken({ id: user.id, role: user.role });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Login user with email and password
 */
async function login(req, res, next) {
  try {
    const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
    if (error) {
      error.statusCode = 422;
      return next(error);
    }

    const { email, password } = value;
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.scope('withPassword').findOne({
      where: { email: normalizedEmail },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        data: null,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
        data: null,
      });
    }

    const token = generateToken({ id: user.id, role: user.role });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get current authenticated user profile
 */
async function getMe(req, res, next) {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email', 'role', 'address', 'isActive', 'createdAt', 'updatedAt'],
      include: [{ model: Role, as: 'roleDetails', attributes: ['id', 'name', 'description'] }],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User profile retrieved successfully',
      data: user,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * View user profile by ID (User can view their own profile; Admin can view any user)
 */
async function getUserById(req, res, next) {
  try {
    const { id } = req.params;

    // Allow user to view their own profile or allow ADMIN
    if (req.user.id !== id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view your own user profile.',
        data: null,
      });
    }

    const user = await User.findByPk(id, {
      attributes: ['id', 'name', 'email', 'role', 'address', 'isActive', 'createdAt', 'updatedAt'],
      include: [{ model: Role, as: 'roleDetails', attributes: ['id', 'name', 'description'] }],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User profile retrieved successfully',
      data: user,
    });
  } catch (err) {
    next(err);
  }
}

const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  address: Joi.string().trim().max(1000).allow('', null).optional(),
});

/**
 * Update authenticated user profile (e.g. name, delivery address)
 */
async function updateProfile(req, res, next) {
  try {
    const { error, value } = updateProfileSchema.validate(req.body, { abortEarly: false });
    if (error) {
      error.statusCode = 422;
      return next(error);
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
        data: null,
      });
    }

    if (value.name !== undefined) user.name = value.name;
    if (value.address !== undefined) user.address = value.address;

    await user.save();

    const updated = await User.findByPk(user.id, {
      attributes: ['id', 'name', 'email', 'role', 'address', 'isActive', 'createdAt', 'updatedAt'],
      include: [{ model: Role, as: 'roleDetails', attributes: ['id', 'name', 'description'] }],
    });

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin creates a user with RBAC role (ADMIN only)
 */
async function createAdminUser(req, res, next) {
  try {
    const { error, value } = adminCreateUserSchema.validate(req.body, { abortEarly: false });
    if (error) {
      error.statusCode = 422;
      return next(error);
    }

    const { name, email, password, role, isActive } = value;
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered.',
        data: null,
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    let roleId = null;
    const roleRecord = await Role.findOne({ where: { name: role } });
    if (roleRecord) {
      roleId = roleRecord.id;
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      roleId,
      isActive: isActive !== undefined ? isActive : true,
    });

    await Promise.all([
      Cart.create({ userId: user.id }),
      Wishlist.create({ userId: user.id }),
    ]);

    const created = await User.findByPk(user.id, {
      attributes: ['id', 'name', 'email', 'role', 'isActive', 'createdAt'],
      include: [{ model: Role, as: 'roleDetails', attributes: ['id', 'name', 'description'] }],
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully with RBAC role',
      data: created,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  getMe,
  getUserById,
  updateProfile,
  createAdminUser,
  registerSchema,
  loginSchema,
  updateProfileSchema,
  adminCreateUserSchema,
};
