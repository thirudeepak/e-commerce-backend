'use strict';

const { Router } = require('express');

const authRouter      = require('./auth.routes');
const productRouter   = require('./product.routes');
const cartRouter      = require('./cart.routes');
const wishlistRouter  = require('./wishlist.routes');
const paymentRouter   = require('./payment.routes');
const orderRouter     = require('./order.routes');
const dashboardRouter = require('./dashboard.routes');

const router = Router();

router.use('auth',      authRouter);
router.use('products',  productRouter);
router.use('cart',      cartRouter);
router.use('wishlist',  wishlistRouter);
router.use('payments',  paymentRouter);
router.use('orders',    orderRouter);
router.use('dashboard', dashboardRouter);

module.exports = router;
