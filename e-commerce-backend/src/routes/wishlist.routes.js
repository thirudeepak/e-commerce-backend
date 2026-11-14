'use strict';

const { Router } = require('express');
const wishlistController = require('../controllers/wishlist.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { allowRoles } = require('../middlewares/role.middleware');

const router = Router();

// Wishlist is exclusively accessible to customers (USER role)
router.use(authenticate, allowRoles('USER'));

router.get('/', wishlistController.getWishlist);
router.post('/add', wishlistController.addToWishlist);
router.delete('/item/:productId', wishlistController.removeFromWishlist);
router.delete('/clear', wishlistController.clearWishlist);

module.exports = router;

