'use strict';

const { Router } = require('express');
const productController = require('../controllers/product.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { allowRoles } = require('../middlewares/role.middleware');
const { upload } = require('../middlewares/upload.middleware');

const router = Router();

// Public routes
router.get('/', productController.getAll);
router.get('/:id', productController.getById);

// Protected routes (ADMIN & SALES_PERSON)
router.post(
  '/',
  authenticate,
  allowRoles('ADMIN', 'SALES_PERSON'),
  upload.array('images', 5),
  productController.create
);

router.put(
  '/:id',
  authenticate,
  allowRoles('ADMIN', 'SALES_PERSON'),
  upload.array('images', 5),
  productController.update
);

router.delete(
  '/:id',
  authenticate,
  allowRoles('ADMIN', 'SALES_PERSON'),
  productController.remove
);

module.exports = router;

