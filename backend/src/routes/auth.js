const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { body } = require('express-validator');
const { validate } = require('../middleware/validation');

// Register
router.post('/register', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('first_name').trim().notEmpty(),
    body('last_name').trim().notEmpty(),
    body('company_name').trim().notEmpty(),
    validate
], authController.register);

// Login
router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
    validate
], authController.login);

// Get profile
router.get('/profile', authenticate, authController.getProfile);

// Change password
router.put('/password', authenticate, [
    body('current_password').notEmpty(),
    body('new_password').isLength({ min: 8 }),
    validate
], authController.changePassword);

// Refresh token
router.post('/refresh', [
    body('refreshToken').notEmpty(),
    validate
], authController.refreshToken);

// Logout
router.post('/logout', authenticate, authController.logout);

module.exports = router;

