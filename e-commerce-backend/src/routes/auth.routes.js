'use strict';

const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { allowRoles } = require('../middlewares/role.middleware');

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticate, authController.getMe);
router.put('/me', authenticate, authController.updateProfile);
router.put('/profile', authenticate, authController.updateProfile);
router.get('/view/:id', authenticate, authController.getUserById);
router.get('/users/:id', authenticate, authController.getUserById);
router.post('/admin/create-user', authenticate, allowRoles('ADMIN'), authController.createAdminUser);

module.exports = router;
