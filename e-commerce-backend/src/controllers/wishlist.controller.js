'use strict';

const Joi = require('joi');
const { Wishlist, WishlistItem, Product, User } = require('../models');

// ─── Inline Joi Validation Schemas ────────────────────────────────────────────

const addToWishlistSchema = Joi.object({
  productId: Joi.string().uuid().required().messages({
    'string.empty': 'Product ID is required.',
    'string.guid': 'Product ID must be a valid UUID.',
  }),
});

// ─── Helper Functions ─────────────────────────────────────────────────────────

async function getOrCreateWishlist(userId) {
  let wishlist = await Wishlist.findOne({ where: { userId } });
  if (!wishlist) {
    wishlist = await Wishlist.create({ userId });
  }
  return wishlist;
}

async function formatWishlistResponse(wishlistId, userId) {
  const wishlistWithItems = await Wishlist.findByPk(wishlistId, {
    include: [
      {
        model: WishlistItem,
        as: 'items',
        include: [
          {
            model: Product,
            as: 'product',
            include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email'] }],
          },
        ],
      },
    ],
  });

  return {
    wishlistId,
    userId,
    items: wishlistWithItems ? wishlistWithItems.items : [],
    totalItems: wishlistWithItems && wishlistWithItems.items ? wishlistWithItems.items.length : 0,
  };
}

// ─── Controller Handlers (Self-Contained) ──────────────────────────────────────

/**
 * Get authenticated user's wishlist
 */
async function getWishlist(req, res, next) {
  try {
    const wishlist = await getOrCreateWishlist(req.user.id);
    const data = await formatWishlistResponse(wishlist.id, req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Wishlist retrieved successfully',
      data,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Add product to wishlist (prevent duplicates)
 */
async function addToWishlist(req, res, next) {
  try {
    const { error, value } = addToWishlistSchema.validate(req.body, { abortEarly: false });
    if (error) {
      error.statusCode = 422;
      return next(error);
    }

    const { productId } = value;
    const wishlist = await getOrCreateWishlist(req.user.id);

    const product = await Product.findByPk(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or inactive.',
        data: null,
      });
    }

    // Check duplicate
    const existing = await WishlistItem.findOne({
      where: { wishlistId: wishlist.id, productId },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Product is already in your wishlist.',
        data: null,
      });
    }

    await WishlistItem.create({
      wishlistId: wishlist.id,
      productId,
    });

    const data = await formatWishlistResponse(wishlist.id, req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Product added to wishlist successfully',
      data,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Remove a product from wishlist
 */
async function removeFromWishlist(req, res, next) {
  try {
    const wishlist = await getOrCreateWishlist(req.user.id);

    const item = await WishlistItem.findOne({
      where: { wishlistId: wishlist.id, productId: req.params.productId },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in your wishlist.',
        data: null,
      });
    }

    await item.destroy();

    const data = await formatWishlistResponse(wishlist.id, req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Product removed from wishlist successfully',
      data,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Clear wishlist
 */
async function clearWishlist(req, res, next) {
  try {
    const wishlist = await getOrCreateWishlist(req.user.id);

    await WishlistItem.destroy({ where: { wishlistId: wishlist.id } });

    return res.status(200).json({
      success: true,
      message: 'Wishlist cleared successfully',
      data: {
        wishlistId: wishlist.id,
        userId: req.user.id,
        items: [],
        totalItems: 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  addToWishlistSchema,
};
