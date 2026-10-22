const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { registerValidator, loginValidator } = require('../validators/authValidators');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// POST /api/auth/register
router.post('/register', authLimiter, registerValidator, validate, authController.register);

// POST /api/auth/login
router.post('/login', authLimiter, loginValidator, validate, authController.login);

// POST /api/auth/google
router.post('/google', authLimiter, authController.googleLogin);

// POST /api/auth/refresh
router.post('/refresh', authLimiter, authController.refresh);

// POST /api/auth/logout
router.post('/logout', requireAuth, authController.logout);

// GET /api/auth/me
router.get('/me', requireAuth, authController.me);

module.exports = router;
