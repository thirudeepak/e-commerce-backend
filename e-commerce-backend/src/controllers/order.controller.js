'use strict';

const Joi = require('joi');
const { Order, OrderItem, Product, User } = require('../models');

// ─── Inline Joi Validation Schemas ────────────────────────────────────────────

const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED')
    .required()
    .messages({
      'any.only': 'Status must be one of PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED',
      'string.empty': 'Status is required.',
    }),
});

const queryOrderSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  orderStatus: Joi.string().valid('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED').optional(),
  paymentStatus: Joi.string().valid('PENDING', 'PAID', 'FAILED', 'REFUNDED').optional(),
});

// ─── Controller Handlers (Self-Contained) ──────────────────────────────────────

/**
 * Get authenticated user's order history
 */
async function getMyOrders(req, res, next) {
  try {
    const { error, value } = queryOrderSchema.validate(req.query, { abortEarly: false });
    if (error) {
      error.statusCode = 422;
      return next(error);
    }

    const { page = 1, limit = 10 } = value;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await Order.findAndCountAll({
      where: { userId: req.user.id },
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'images', 'category'] }],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset,
      distinct: true,
    });

    return res.status(200).json({
      success: true,
      message: 'Orders retrieved successfully',
      data: {
        orders: rows,
        total: count,
        page: pageNum,
        totalPages: Math.ceil(count / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get single order details with role checking (Admin, Seller, Buyer)
 */
async function getOrderById(req, res, next) {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: OrderItem,
          as: 'items',
          include: [
            { model: Product, as: 'product', attributes: ['id', 'name', 'images', 'category'] },
            { model: User, as: 'seller', attributes: ['id', 'name', 'email'] },
          ],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
        data: null,
      });
    }

    // Role check
    if (req.user.role === 'ADMIN') {
      return res.status(200).json({
        success: true,
        message: 'Order retrieved successfully',
        data: order,
      });
    }

    if (req.user.role === 'USER') {
      if (order.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden. You do not have permission to view this order.',
          data: null,
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Order retrieved successfully',
        data: order,
      });
    }

    if (req.user.role === 'SALES_PERSON') {
      const hasSoldItem = order.items.some((item) => item.sellerId === req.user.id);
      const isBuyer = order.userId === req.user.id;

      if (!hasSoldItem && !isBuyer) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden. You do not have permission to view this order.',
          data: null,
        });
      }

      if (!isBuyer && hasSoldItem) {
        const plainOrder = order.toJSON();
        plainOrder.items = plainOrder.items.filter((item) => item.sellerId === req.user.id);
        return res.status(200).json({
          success: true,
          message: 'Order retrieved successfully',
          data: plainOrder,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Order retrieved successfully',
        data: order,
      });
    }

    return res.status(403).json({
      success: false,
      message: 'Forbidden.',
      data: null,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get seller's order items (SALES_PERSON or ADMIN)
 */
async function getSellerOrders(req, res, next) {
  try {
    const { error, value } = queryOrderSchema.validate(req.query, { abortEarly: false });
    if (error) {
      error.statusCode = 422;
      return next(error);
    }

    const { page = 1, limit = 10 } = value;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const offset = (pageNum - 1) * limitNum;

    const { count, rows: sellerItems } = await OrderItem.findAndCountAll({
      where: { sellerId: req.user.id },
      include: [
        {
          model: Order,
          as: 'order',
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'images', 'category'],
        },
      ],
      order: [['id', 'DESC']],
      limit: limitNum,
      offset,
    });

    return res.status(200).json({
      success: true,
      message: 'Seller orders retrieved successfully',
      data: {
        items: sellerItems,
        total: count,
        page: pageNum,
        totalPages: Math.ceil(count / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get all orders platform-wide (ADMIN only)
 */
async function getAllOrders(req, res, next) {
  try {
    const { error, value } = queryOrderSchema.validate(req.query, { abortEarly: false });
    if (error) {
      error.statusCode = 422;
      return next(error);
    }

    const { page = 1, limit = 10, orderStatus, paymentStatus } = value;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const offset = (pageNum - 1) * limitNum;

    const where = {};
    if (orderStatus) where.orderStatus = orderStatus;
    if (paymentStatus) where.paymentStatus = paymentStatus;

    const { count, rows } = await Order.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'images', 'category'] }],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset,
      distinct: true,
    });

    return res.status(200).json({
      success: true,
      message: 'All orders retrieved successfully',
      data: {
        orders: rows,
        total: count,
        page: pageNum,
        totalPages: Math.ceil(count / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update order status (ADMIN only)
 */
async function updateStatus(req, res, next) {
  try {
    const { error, value } = updateOrderStatusSchema.validate(req.body, { abortEarly: false });
    if (error) {
      error.statusCode = 422;
      return next(error);
    }

    const order = await Order.findByPk(req.params.id, {
      include: [{ model: OrderItem, as: 'items' }],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
        data: null,
      });
    }

    order.orderStatus = value.status;
    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: order,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMyOrders,
  getOrderById,
  getSellerOrders,
  getAllOrders,
  updateStatus,
  updateOrderStatusSchema,
  queryOrderSchema,
};
