'use strict';

const Joi = require('joi');
const { Op } = require('sequelize');
const { Product, User } = require('../models');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

// ─── Inline Joi Validation Schemas ────────────────────────────────────────────

const createProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(255).required().messages({
    'string.empty': 'Product name is required.',
  }),
  description: Joi.string().trim().allow('', null).optional(),
  price: Joi.number().positive().precision(2).required().messages({
    'number.base': 'Price must be a valid number.',
    'number.positive': 'Price must be greater than zero.',
  }),
  stock: Joi.number().integer().min(0).default(0),
  category: Joi.string().trim().required().messages({
    'string.empty': 'Category is required.',
  }),
});

const updateProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(255).optional(),
  description: Joi.string().trim().allow('', null).optional(),
  price: Joi.number().positive().precision(2).optional(),
  stock: Joi.number().integer().min(0).optional(),
  category: Joi.string().trim().optional(),
  removeImageIds: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string()),
      Joi.string().custom((val) => {
        try {
          return JSON.parse(val);
        } catch {
          return [val];
        }
      })
    )
    .optional(),
});

const queryProductSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().trim().empty('').optional(),
  category: Joi.string().trim().empty('').optional(),
  minPrice: Joi.number().min(0).empty('').optional(),
  maxPrice: Joi.number().min(0).empty('').optional(),
  ownerId: Joi.string().uuid().empty('').optional(),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'price', 'name', 'stock').default('createdAt'),
  sortOrder: Joi.string().valid('ASC', 'DESC', 'asc', 'desc').default('DESC'),
});

function parseImages(raw) {
  if (!raw) return [];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  }
  return Array.isArray(raw) ? raw : [raw];
}

// ─── Controller Handlers (Self-Contained) ──────────────────────────────────────

/**
 * Create a new product with image uploads to Cloudinary
 */
async function create(req, res, next) {
  try {
    const { error, value } = createProductSchema.validate(req.body, { abortEarly: false });
    if (error) {
      error.statusCode = 422;
      return next(error);
    }

    const { name, description, price, stock, category } = value;
    const imageFiles = req.files || [];

    // Upload image buffers to Cloudinary in parallel
    let uploadedImages = [];
    if (imageFiles.length > 0) {
      uploadedImages = await Promise.all(
        imageFiles.map((file) => uploadToCloudinary(file.buffer, 'ecommerce/products'))
      );
    }

    const images = uploadedImages.length > 0
      ? uploadedImages.map(({ url, publicId }) => ({ url, publicId }))
      : [{
          url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
          publicId: `default_${Date.now()}`
        }];

    const product = await Product.create({
      name,
      description: description || null,
      price: Number(price),
      stock: Number(stock) || 0,
      category,
      ownerId: req.user.id,
      images,
      isActive: true,
    });

    const created = await Product.findByPk(product.id, {
      include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email'] }],
    });

    const createdJson = created.toJSON();
    createdJson.images = parseImages(createdJson.images);

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: createdJson,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get paginated list of products with search, category, and price range filters
 */
async function getAll(req, res, next) {
  try {
    const { error, value } = queryProductSchema.validate(req.query, { abortEarly: false });
    if (error) {
      error.statusCode = 422;
      return next(error);
    }

    const { page, limit, search, category, minPrice, maxPrice, ownerId, sortBy, sortOrder } = value;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    const andConditions = [{ isActive: true }];

    if (search) {
      andConditions.push({
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
          { category: { [Op.like]: `%${search}%` } },
        ],
      });
    }

    if (category && category !== 'All') {
      andConditions.push({ category });
    }

    if (ownerId) {
      andConditions.push({ ownerId });
    }

    if (minPrice !== undefined && maxPrice !== undefined) {
      andConditions.push({ price: { [Op.between]: [Number(minPrice), Number(maxPrice)] } });
    } else if (minPrice !== undefined) {
      andConditions.push({ price: { [Op.gte]: Number(minPrice) } });
    } else if (maxPrice !== undefined) {
      andConditions.push({ price: { [Op.lte]: Number(maxPrice) } });
    }

    const allowedSortFields = ['createdAt', 'updatedAt', 'price', 'name', 'stock'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows } = await Product.findAndCountAll({
      where: { [Op.and]: andConditions },
      include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email'] }],
      order: [[safeSortBy, safeSortOrder]],
      limit: limitNum,
      offset,
      distinct: true,
    });

    const products = rows.map((r) => {
      const item = r.toJSON();
      item.images = parseImages(item.images);
      return item;
    });

    return res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
      data: {
        products,
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
 * Get single product by ID
 */
async function getById(req, res, next) {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email'] }],
    });

    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
        data: null,
      });
    }

    const p = product.toJSON();
    p.images = parseImages(p.images);

    return res.status(200).json({
      success: true,
      message: 'Product retrieved successfully',
      data: p,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update product (Admin can update any, Sales Person can only update own product)
 */
async function update(req, res, next) {
  try {
    const { error, value } = updateProductSchema.validate(req.body, { abortEarly: false });
    if (error) {
      error.statusCode = 422;
      return next(error);
    }

    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
        data: null,
      });
    }

    // Role ownership check
    if (req.user.role === 'SALES_PERSON' && product.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not own this product.',
        data: null,
      });
    }

    let existingImages = parseImages(product.images);
    const newImageFiles = req.files || [];
    let images = [...existingImages];

    // If new image files are uploaded, they REPLACE the existing product images
    if (newImageFiles.length > 0) {
      const uploaded = await Promise.all(
        newImageFiles.map((file) => uploadToCloudinary(file.buffer, 'ecommerce/products'))
      );

      // Clean up previous Cloudinary images if they were actual remote assets
      if (existingImages.length > 0) {
        await Promise.all(
          existingImages
            .filter((img) => img.publicId && !img.publicId.startsWith('default_') && !img.publicId.startsWith('mock_') && !img.publicId.startsWith('fallback_'))
            .map((img) => deleteFromCloudinary(img.publicId))
        );
      }
      images = uploaded.map(({ url, publicId }) => ({ url, publicId }));
    } else {
      // If no new files uploaded, handle removeImageIds if provided
      const removeImageIds = Array.isArray(value.removeImageIds) ? value.removeImageIds : [];
      if (removeImageIds.length > 0) {
        await Promise.all(removeImageIds.map((publicId) => deleteFromCloudinary(publicId)));
        images = images.filter((img) => !removeImageIds.includes(img.publicId));
      }
    }

    // Ensure at least one image exists
    if (images.length === 0) {
      images = [{
        url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
        publicId: `default_${Date.now()}`
      }];
    }

    const fieldsToUpdate = { images };
    if (value.name !== undefined) fieldsToUpdate.name = value.name;
    if (value.description !== undefined) fieldsToUpdate.description = value.description;
    if (value.price !== undefined) fieldsToUpdate.price = Number(value.price);
    if (value.stock !== undefined) fieldsToUpdate.stock = Number(value.stock);
    if (value.category !== undefined) fieldsToUpdate.category = value.category;

    await product.update(fieldsToUpdate);

    const updated = await Product.findByPk(req.params.id, {
      include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email'] }],
    });

    const updatedJson = updated.toJSON();
    updatedJson.images = parseImages(updatedJson.images);

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updatedJson,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete product (Admin can delete any, Sales Person can only delete own product)
 */
async function remove(req, res, next) {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
        data: null,
      });
    }

    // Role ownership check
    if (req.user.role === 'SALES_PERSON' && product.ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not own this product.',
        data: null,
      });
    }

    // Clean up images from Cloudinary
    const images = parseImages(product.images);
    if (images.length > 0) {
      await Promise.all(
        images
          .filter((img) => img.publicId && !img.publicId.startsWith('default_') && !img.publicId.startsWith('mock_'))
          .map((img) => deleteFromCloudinary(img.publicId))
      );
    }

    // Soft delete
    await product.update({ isActive: false });

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      data: null,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  create,
  getAll,
  getById,
  update,
  remove,
};
