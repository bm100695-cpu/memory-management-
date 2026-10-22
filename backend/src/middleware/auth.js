const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Require a valid JWT access token.
 * Attaches req.user with the authenticated user document.
 */
const requireAuth = async (req, res, next) => {
  try {
    // Support Bearer token in Authorization header
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
    }

    const token = authHeader.slice(7); // Remove 'Bearer '

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      const message =
        err.name === 'TokenExpiredError'
          ? 'Session expired. Please refresh your token.'
          : 'Invalid token. Please log in again.';
      return res.status(401).json({ success: false, message });
    }

    const user = await User.findById(decoded.sub).select('+isActive');
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account not found or deactivated.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    next(error);
  }
};

/**
 * Optionally attach user if a valid token is provided.
 * Does NOT reject unauthenticated requests.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const decoded = verifyAccessToken(token);
        const user = await User.findById(decoded.sub);
        if (user && user.isActive) req.user = user;
      } catch {
        // Silently ignore invalid tokens
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { requireAuth, optionalAuth };
