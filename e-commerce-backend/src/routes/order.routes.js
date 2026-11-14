'use strict';

const { Router } = require('express');
const orderController = require('../controllers/order.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { allowRoles } = require('../middlewares/role.middleware');

const router = Router();

router.use(authenticate);

// Customer's order history (USER only)
router.get('/my', allowRoles('USER'), orderController.getMyOrders);

// Seller's order items
router.get('/seller', allowRoles('SALES_PERSON', 'ADMIN'), orderController.getSellerOrders);

// Admin: view all orders
router.get('/all', allowRoles('ADMIN'), orderController.getAllOrders);

// Single order details (authorized by role/ownership)
router.get('/:id', orderController.getOrderById);

// Admin: update order status
router.put('/:id/status', allowRoles('ADMIN'), orderController.updateStatus);

module.exports = router;

