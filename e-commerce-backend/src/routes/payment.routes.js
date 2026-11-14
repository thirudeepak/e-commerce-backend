'use strict';

const { Router } = require('express');
const paymentController = require('../controllers/payment.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { allowRoles } = require('../middlewares/role.middleware');

const router = Router();

router.post('/create-order', authenticate, allowRoles('USER'), paymentController.createOrder);
router.post('/verify', authenticate, allowRoles('USER'), paymentController.verifyPayment);
router.post('/webhook', paymentController.webhook);

module.exports = router;

