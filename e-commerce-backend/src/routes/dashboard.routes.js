'use strict';

const { Router } = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { allowRoles } = require('../middlewares/role.middleware');

const router = Router();

router.use(authenticate);

router.get('/admin', allowRoles('ADMIN'), dashboardController.getAdminDashboard);
router.get('/sales', allowRoles('SALES_PERSON', 'ADMIN'), dashboardController.getSalesDashboard);
router.get('/user', dashboardController.getUserDashboard);

module.exports = router;

