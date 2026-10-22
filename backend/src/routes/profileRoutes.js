const express = require('express');
const router = express.Router();
const UserProfile = require('../models/UserProfile');
const UserSettings = require('../models/UserSettings');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/profile
router.get('/', async (req, res, next) => {
  try {
    const profile = await UserProfile.findOne({ user: req.user._id });
    res.json({ success: true, data: { profile } });
  } catch (error) {
    next(error);
  }
});

// PUT /api/profile
router.put('/', async (req, res, next) => {
  try {
    const profile = await UserProfile.findOneAndUpdate(
      { user: req.user._id },
      req.body,
      { new: true, runValidators: true, upsert: true }
    );
    res.json({ success: true, data: { profile } });
  } catch (error) {
    next(error);
  }
});

// GET /api/profile/settings
router.get('/settings', async (req, res, next) => {
  try {
    const settings = await UserSettings.findOne({ user: req.user._id });
    res.json({ success: true, data: { settings } });
  } catch (error) {
    next(error);
  }
});

// PUT /api/profile/settings
router.put('/settings', async (req, res, next) => {
  try {
    const settings = await UserSettings.findOneAndUpdate(
      { user: req.user._id },
      req.body,
      { new: true, runValidators: true, upsert: true }
    );
    res.json({ success: true, data: { settings } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
