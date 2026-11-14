'use strict';

const { Router } = require('express');
const cartController = require('../controllers/cart.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { allowRoles } = require('../middlewares/role.middleware');

const router = Router();

// Cart is exclusively accessible to customers (USER role)
router.use(authenticate, allowRoles('USER'));

router.get('/', cartController.getCart);
router.post('/add', cartController.addToCart);
router.put('/item/:id', cartController.updateCartItem);
router.delete('/item/:id', cartController.removeCartItem);
router.delete('/clear', cartController.clearCart);

module.exports = router;

