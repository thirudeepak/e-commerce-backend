'use strict';

const crypto = require('crypto');
const Joi = require('joi');
const razorpay = require('../config/razorpay');
const { sequelize } = require('../config/database');
const { Order, OrderItem, Cart, CartItem, Product, User } = require('../models');
const { sendOrderConfirmationEmail } = require('../config/mail');

// ─── Inline Joi Validation Schemas ────────────────────────────────────────────

const verifyPaymentSchema = Joi.object({
  razorpayOrderId: Joi.string().required().messages({
    'string.empty': 'razorpayOrderId is required.',
  }),
  razorpayPaymentId: Joi.string().required().messages({
    'string.empty': 'razorpayPaymentId is required.',
  }),
  razorpaySignature: Joi.string().required().messages({
    'string.empty': 'razorpaySignature is required.',
  }),
  deliveryAddress: Joi.string().trim().max(1000).allow('', null).optional(),
});

// ─── Controller Handlers (Self-Contained) ──────────────────────────────────────

/**
 * Initiate checkout and create Razorpay order
 */
async function createOrder(req, res, next) {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({
      where: { userId },
      include: [
        {
          model: CartItem,
          as: 'items',
          include: [{ model: Product, as: 'product' }],
        },
      ],
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your cart is empty. Add products before checkout.',
        data: null,
      });
    }

    // Calculate total amount from database prices & verify current stock
    let totalAmount = 0;

    for (const item of cart.items) {
      if (!item.product || !item.product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Product ${item.product ? item.product.name : item.productId} is no longer available.`,
          data: null,
        });
      }

      if (item.product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${item.product.name}". Available: ${item.product.stock}, in cart: ${item.quantity}.`,
          data: null,
        });
      }

      const price = Number(item.product.price);
      totalAmount += price * item.quantity;
    }

    totalAmount = parseFloat(totalAmount.toFixed(2));
    const amountInPaise = Math.round(totalAmount * 100);

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rcpt_${userId.substring(0, 8)}_${Date.now()}`,
      notes: {
        userId,
        cartId: cart.id,
      },
    };

    const razorpayOrder = await razorpay.orders.create(options);

    return res.status(200).json({
      success: true,
      message: 'Razorpay order created successfully',
      data: {
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount, // in paise
        currency: razorpayOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        totalAmount,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Verify Razorpay payment signature & confirm order in an ACID DB transaction
 */
async function verifyPayment(req, res, next) {
  try {
    const { error, value } = verifyPaymentSchema.validate(req.body, { abortEarly: false });
    if (error) {
      error.statusCode = 422;
      return next(error);
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = value;
    const userId = req.user.id;

    // Prevent duplicate processing
    const existingOrder = await Order.findOne({ where: { razorpayOrderId } });
    if (existingOrder && existingOrder.paymentStatus === 'PAID') {
      return res.status(409).json({
        success: false,
        message: 'This payment has already been verified and processed.',
        data: null,
      });
    }

    // HMAC SHA256 Signature verification
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature. Payment verification failed.',
        data: null,
      });
    }

    // Execute order creation, stock decrement, and cart clearing inside a transaction
    const confirmedOrder = await sequelize.transaction(async (t) => {
      // 1. Fetch user's cart
      const cart = await Cart.findOne({
        where: { userId },
        include: [{ model: CartItem, as: 'items' }],
        transaction: t,
      });

      if (!cart || !cart.items || cart.items.length === 0) {
        const err = new Error('Cart is empty. Cannot process order.');
        err.statusCode = 400;
        throw err;
      }

      let calculatedTotal = 0;
      const orderItemsToCreate = [];

      // 2. Lock product rows with SELECT FOR UPDATE to prevent race condition on stock
      for (const item of cart.items) {
        const product = await Product.findByPk(item.productId, {
          lock: t.LOCK.UPDATE,
          transaction: t,
        });

        if (!product || !product.isActive) {
          const err = new Error(`Product ${item.productId} is unavailable.`);
          err.statusCode = 400;
          throw err;
        }

        if (product.stock < item.quantity) {
          const err = new Error(
            `Insufficient stock for "${product.name}". Remaining stock: ${product.stock}.`
          );
          err.statusCode = 400;
          throw err;
        }

        const unitPrice = Number(product.price);
        const subtotal = parseFloat((unitPrice * item.quantity).toFixed(2));
        calculatedTotal += subtotal;

        // Decrement stock
        product.stock -= item.quantity;
        await product.save({ transaction: t });

        orderItemsToCreate.push({
          productId: product.id,
          sellerId: product.ownerId,
          productName: product.name,
          quantity: item.quantity,
          price: unitPrice,
          subtotal,
        });
      }

      calculatedTotal = parseFloat(calculatedTotal.toFixed(2));

      // Fetch user profile to retrieve delivery address
      const currentUser = await User.findByPk(userId, { transaction: t });
      const finalAddress =
        (value.deliveryAddress && value.deliveryAddress.trim()) ||
        (currentUser && currentUser.address) ||
        'Standard Home Delivery Address (On Account File)';

      // 3. Create confirmed Order with delivery address
      const order = await Order.create(
        {
          userId,
          totalAmount: calculatedTotal,
          deliveryAddress: finalAddress,
          paymentStatus: 'PAID',
          orderStatus: 'CONFIRMED',
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
        },
        { transaction: t }
      );

      // 4. Create OrderItems
      const itemsWithOrderId = orderItemsToCreate.map((item) => ({
        ...item,
        orderId: order.id,
      }));
      await OrderItem.bulkCreate(itemsWithOrderId, { transaction: t });

      // 5. Clear the user's cart
      await CartItem.destroy({
        where: { cartId: cart.id },
        transaction: t,
      });

      return order;
    });

    const result = await Order.findByPk(confirmedOrder.id, {
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'images', 'category'] }],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'address'],
        },
      ],
    });

    // Send order confirmation email to customer via Nodemailer
    const customer = result.user || req.user;
    if (customer && customer.email) {
      sendOrderConfirmationEmail({
        user: customer,
        order: result,
        items: result.items,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified and order placed successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle incoming Razorpay webhooks
 */
async function webhook(req, res, next) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      return res.status(400).json({
        success: false,
        message: 'x-razorpay-signature header is missing.',
        data: null,
      });
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return res.status(500).json({
        success: false,
        message: 'RAZORPAY_WEBHOOK_SECRET is not configured.',
        data: null,
      });
    }

    const rawBody = req.body;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature.',
        data: null,
      });
    }

    const event = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;

    if (event.event === 'payment.failed') {
      const paymentEntity = event.payload && event.payload.payment && event.payload.payment.entity;
      if (paymentEntity && paymentEntity.order_id) {
        const order = await Order.findOne({
          where: { razorpayOrderId: paymentEntity.order_id },
        });

        if (order && order.paymentStatus === 'PENDING') {
          order.paymentStatus = 'FAILED';
          order.orderStatus = 'CANCELLED';
          await order.save();
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      data: { event: event.event },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createOrder,
  verifyPayment,
  webhook,
  verifyPaymentSchema,
};
