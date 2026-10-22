const authService = require('../services/authService');
const logger = require('../utils/logger');

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/auth/refresh',
};

const register = async (req, res, next) => {
  try {
    const { name, email, password, preferredLanguage } = req.body;
    const { user, accessToken, refreshToken } = await authService.register({
      name,
      email,
      password,
      preferredLanguage,
    });

    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { user, accessToken },
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await authService.login({
      email,
      password,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

    res.json({
      success: true,
      message: 'Logged in successfully',
      data: { user, accessToken },
    });
  } catch (error) {
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    // Accept from cookie or body
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token required' });
    }

    const { accessToken, refreshToken: newRefreshToken } = await authService.refresh(refreshToken);

    res.cookie('refreshToken', newRefreshToken, REFRESH_COOKIE_OPTIONS);

    res.json({
      success: true,
      data: { accessToken },
    });
  } catch (error) {
    next(error);
  }
};

const googleLogin = async (req, res, next) => {
  try {
    const { credential } = req.body;
    const { user, accessToken, refreshToken } = await authService.googleLogin({
      credential,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

    res.json({
      success: true,
      message: 'Google login successful',
      data: { user, accessToken },
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    await authService.logout(req.user._id);
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

const me = async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
};

module.exports = { register, login, refresh, logout, me, googleLogin };
