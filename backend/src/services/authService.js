const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const { env } = require('../config/env');
const User = require('../models/User');
const UserProfile = require('../models/UserProfile');
const UserSettings = require('../models/UserSettings');
const AuditLog = require('../models/AuditLog');
const { generateTokenPair, verifyRefreshToken } = require('../utils/jwt');
const logger = require('../utils/logger');

/**
 * Register a new user.
 * Also creates default UserProfile and UserSettings documents.
 */
const register = async ({ name, email, password, preferredLanguage = 'en' }) => {
  // Check for existing user
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    const err = new Error('Email already registered');
    err.statusCode = 409;
    throw err;
  }

  const user = await User.create({ name, email, password, preferredLanguage });

  // Create default profile and settings in parallel
  await Promise.all([
    UserProfile.create({ user: user._id }),
    UserSettings.create({
      user: user._id,
      ai: { provider: 'openai' },
    }),
  ]);

  const { accessToken, refreshToken } = generateTokenPair(user);

  // Store hashed refresh token
  user.refreshTokenHash = await bcrypt.hash(refreshToken, 8);
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  await AuditLog.create({
    user: user._id,
    action: 'USER_REGISTER',
    resource: 'user',
    resourceId: user._id,
    status: 'success',
    severity: 'info',
  });

  return { user, accessToken, refreshToken };
};

/**
 * Log in with email and password.
 */
const login = async ({ email, password, ipAddress, userAgent }) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password +refreshTokenHash');

  const fail = async (msg) => {
    if (user) {
      await AuditLog.create({
        user: user._id,
        action: 'LOGIN_FAILED',
        resource: 'user',
        details: { reason: msg },
        ipAddress,
        userAgent,
        status: 'failure',
        severity: 'warning',
      });
    }
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  };

  if (!user || !user.isActive) return fail('user not found or inactive');

  const passwordOk = await user.comparePassword(password);
  if (!passwordOk) return fail('wrong password');

  const { accessToken, refreshToken } = generateTokenPair(user);
  user.refreshTokenHash = await bcrypt.hash(refreshToken, 8);
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  await AuditLog.create({
    user: user._id,
    action: 'LOGIN_SUCCESS',
    resource: 'user',
    ipAddress,
    userAgent,
    status: 'success',
    severity: 'info',
  });

  return { user, accessToken, refreshToken };
};

/**
 * Refresh access token using a valid refresh token.
 */
const refresh = async (refreshToken) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    const err = new Error('Invalid or expired refresh token');
    err.statusCode = 401;
    throw err;
  }

  const user = await User.findById(decoded.sub).select('+refreshTokenHash');
  if (!user || !user.isActive || !user.refreshTokenHash) {
    const err = new Error('Session not found. Please log in again.');
    err.statusCode = 401;
    throw err;
  }

  const tokenMatch = await bcrypt.compare(refreshToken, user.refreshTokenHash);
  if (!tokenMatch) {
    const err = new Error('Refresh token mismatch. Please log in again.');
    err.statusCode = 401;
    throw err;
  }

  const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(user);
  user.refreshTokenHash = await bcrypt.hash(newRefreshToken, 8);
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken: newRefreshToken };
};

/**
 * Log in or register using Google OAuth credential (ID token).
 * Uses Google's official google-auth-library to cryptographically verify:
 * - Signature
 * - Issuer (accounts.google.com or https://accounts.google.com)
 * - Audience (must match configured GOOGLE_CLIENT_ID)
 * - Expiration
 * - Email verification status
 */
const googleLogin = async ({ credential, ipAddress, userAgent }) => {
  if (!credential) {
    const err = new Error('Google credential token is required');
    err.statusCode = 400;
    throw err;
  }

  // Ensure Google OAuth client ID is configured
  if (!env.GOOGLE_CLIENT_ID) {
    const err = new Error('Google OAuth is not configured on the server. Please set GOOGLE_CLIENT_ID in backend/.env');
    err.statusCode = 503;
    throw err;
  }

  // Cryptographically verify Google ID token via OAuth2Client
  let payload;
  try {
    const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (verifyErr) {
    logger.warn(`Google ID token verification failed: ${verifyErr.message}`);
    const err = new Error('Invalid or expired Google credential token');
    err.statusCode = 401;
    throw err;
  }

  if (!payload || !payload.sub) {
    const err = new Error('Invalid Google credential payload');
    err.statusCode = 401;
    throw err;
  }

  const googleId = payload.sub;
  const email = payload.email?.toLowerCase();
  const name = payload.name;
  const picture = payload.picture;

  if (!email) {
    const err = new Error('Google account email not accessible');
    err.statusCode = 400;
    throw err;
  }

  if (!payload.email_verified) {
    const err = new Error('Google account email address is not verified');
    err.statusCode = 403;
    throw err;
  }

  // Check if account already exists with this googleId
  let user = await User.findOne({ googleId }).select('+refreshTokenHash');

  if (user) {
    if (!user.isActive) {
      const err = new Error('User account is deactivated');
      err.statusCode = 403;
      throw err;
    }
    if (picture && !user.avatar) {
      user.avatar = picture;
    }
  } else {
    // Check if account exists with this verified email
    const existingEmailUser = await User.findOne({ email }).select('+refreshTokenHash');

    if (existingEmailUser) {
      if (!existingEmailUser.isActive) {
        const err = new Error('User account is deactivated');
        err.statusCode = 403;
        throw err;
      }
      // If the account is already associated with a different Google account
      if (existingEmailUser.googleId && existingEmailUser.googleId !== googleId) {
        const err = new Error('This email is already associated with a different Google account');
        err.statusCode = 409;
        throw err;
      }
      // Link verified Google account to existing user
      existingEmailUser.googleId = googleId;
      if (picture && !existingEmailUser.avatar) {
        existingEmailUser.avatar = picture;
      }
      user = existingEmailUser;
    } else {
      // Create new user securely
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        googleId,
        avatar: picture,
        preferredLanguage: 'en',
      });

      await Promise.all([
        UserProfile.create({ user: user._id }),
        UserSettings.create({
          user: user._id,
          ai: { provider: 'openai' },
        }),
      ]);
    }
  }

  const { accessToken, refreshToken } = generateTokenPair(user);
  user.refreshTokenHash = await bcrypt.hash(refreshToken, 8);
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  await AuditLog.create({
    user: user._id,
    action: 'GOOGLE_LOGIN_SUCCESS',
    resource: 'user',
    ipAddress,
    userAgent,
    status: 'success',
    severity: 'info',
  });

  return { user, accessToken, refreshToken };
};

/**
 * Log out — invalidate refresh token.
 */
const logout = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshTokenHash: null });
  await AuditLog.create({
    user: userId,
    action: 'LOGOUT',
    resource: 'user',
    status: 'success',
    severity: 'info',
  });
};

module.exports = { register, login, refresh, logout, googleLogin };
