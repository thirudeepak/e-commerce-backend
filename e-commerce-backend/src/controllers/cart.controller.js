'use strict';

const Joi = require('joi');
const { Cart, CartItem, Product } = require('../models');

// ─── Inline Joi Validation Schemas ────────────────────────────────────────────

const addToCartSchema = Joi.object({
  productId: Joi.string().uuid().required().messages({
    'string.empty': 'Product ID is required.',
    'string.guid': 'Product ID must be a valid UUID.',
  }),
  quantity: Joi.number().integer().min(1).default(1).messages({
    'number.min': 'Quantity must be at least 1.',
  }),
});

const updateCartItemSchema = Joi.object({
  quantity: Joi.number().integer().min(1).required().messages({
    'number.min': 'Quantity must be at least 1.',
    'any.required': 'Quantity is required.',
  }),
});

// ─── Helper Functions ─────────────────────────────────────────────────────────

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ where: { userId } });
  if (!cart) {
    cart = await Cart.create({ userId });
  }
  return cart;
}

async function formatCartResponse(cartId, userId) {
  const cartWithItems = await Cart.findByPk(cartId, {
    include: [
      {
        model: CartItem,
        as: 'items',
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'price', 'stock', 'category', 'images', 'isActive'],
          },
        ],
      },
    ],
  });

  const items = cartWithItems ? cartWithItems.items : [];

  let totalItems = 0;
  let subtotal = 0;

  const formattedItems = items.map((item) => {
    const currentPrice = item.product ? Number(item.product.price) : Number(item.price);
    const itemSubtotal = currentPrice * item.quantity;
    totalItems += item.quantity;
    subtotal += itemSubtotal;

    return {
      id: item.id,
      productId: item.productId,
      product: item.product,
      quantity: item.quantity,
      price: currentPrice,
      subtotal: parseFloat(itemSubtotal.toFixed(2)),
    };
  });

  return {
    cartId,
    userId,
    items: formattedItems,
    totalItems,
    subtotal: parseFloat(subtotal.toFixed(2)),
    totalAmount: parseFloat(subtotal.toFixed(2)),
  };
}

// ─── Controller Handlers (Self-Contained) ──────────────────────────────────────

/**
 * Get authenticated user's cart
 */
async function getCart(req, res, next) {
  try {
    const cart = await getOrCreateCart(req.user.id);
    const cartData = await formatCartResponse(cart.id, req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Cart retrieved successfully',
      data: cartData,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Add a product to cart (or increment quantity if already exists)
 */
async function addToCart(req, res, next) {
  try {
    const { error, value } = addToCartSchema.validate(req.body, { abortEarly: false });
    if (error) {
      error.statusCode = 422;
      return next(error);
    }

    const { productId, quantity = 1 } = value;
    const cart = await getOrCreateCart(req.user.id);

    const product = await Product.findByPk(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or inactive.',
        data: null,
      });
    }

    const existingItem = await CartItem.findOne({
      where: { cartId: cart.id, productId },
    });

    const currentCartQty = existingItem ? existingItem.quantity : 0;
    const newQuantity = currentCartQty + quantity;

    if (product.stock < newQuantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${product.stock}, currently in cart: ${currentCartQty}, requested additional: ${quantity}`,
        data: null,
      });
    }

    if (existingItem) {
      existingItem.quantity = newQuantity;
      existingItem.price = product.price; // Backend verified price
      await existingItem.save();
    } else {
      await CartItem.create({
        cartId: cart.id,
        productId,
        quantity,
        price: product.price, // Backend verified price
      });
    }

    const cartData = await formatCartResponse(cart.id, req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Product added to cart successfully',
      data: cartData,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update quantity of a cart item
 */
async function updateCartItem(req, res, next) {
  try {
    const { error, value } = updateCartItemSchema.validate(req.body, { abortEarly: false });
    if (error) {
      error.statusCode = 422;
      return next(error);
    }

    const cart = await getOrCreateCart(req.user.id);

    const item = await CartItem.findOne({
      where: { id: req.params.id, cartId: cart.id },
      include: [{ model: Product, as: 'product' }],
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found.',
        data: null,
      });
    }

    if (!item.product || !item.product.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Product is no longer available.',
        data: null,
      });
    }

    if (item.product.stock < value.quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available stock is ${item.product.stock}.`,
        data: null,
      });
    }

    item.quantity = value.quantity;
    item.price = item.product.price;
    await item.save();

    const cartData = await formatCartResponse(cart.id, req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Cart item updated successfully',
      data: cartData,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Remove an item from cart
 */
async function removeCartItem(req, res, next) {
  try {
    const cart = await getOrCreateCart(req.user.id);

    const item = await CartItem.findOne({
      where: { id: req.params.id, cartId: cart.id },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found.',
        data: null,
      });
    }

    await item.destroy();

    const cartData = await formatCartResponse(cart.id, req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Cart item removed successfully',
      data: cartData,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Clear the entire cart
 */
async function clearCart(req, res, next) {
  try {
    const cart = await getOrCreateCart(req.user.id);

    await CartItem.destroy({ where: { cartId: cart.id } });

    return res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      data: {
        cartId: cart.id,
        userId: req.user.id,
        items: [],
        totalItems: 0,
        subtotal: 0,
        totalAmount: 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  addToCartSchema,
  updateCartItemSchema,
};
