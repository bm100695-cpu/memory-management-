const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const DailyTask = require('../models/DailyTask');
const Memory = require('../models/Memory');
const DailySummary = require('../models/DailySummary');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const UserProfile = require('../models/UserProfile');
const UserSettings = require('../models/UserSettings');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/settings/audit-logs
router.get('/audit-logs', async (req, res, next) => {
  try {
    const logs = await AuditLog.find({ user: req.user._id })
      .sort({ timestamp: -1 })
      .limit(50);
    res.json({ success: true, data: { logs } });
  } catch (error) {
    next(error);
  }
});

// GET /api/settings/export - Export entire user dataset for local backup
router.get('/export', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const [tasks, memories, summaries, conversations, messages, profile, settings] = await Promise.all([
      DailyTask.find({ user: userId }),
      Memory.find({ user: userId }),
      DailySummary.find({ user: userId }),
      Conversation.find({ user: userId }),
      Message.find({ user: userId }),
      UserProfile.findOne({ user: userId }),
      UserSettings.findOne({ user: userId }),
    ]);

    const backupData = {
      exportedAt: new Date().toISOString(),
      user: { id: req.user._id, email: req.user.email, name: req.user.name },
      profile,
      settings,
      tasks,
      memories,
      summaries,
      conversations,
      messages,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=jarvis-backup-${Date.now()}.json`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
