const mongoose = require('mongoose');

const userSettingsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    // Appearance
    theme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
    language: { type: String, enum: ['en', 'hi', 'hinglish'], default: 'en' },
    // Notifications
    notifications: {
      dailySummaryEnabled: { type: Boolean, default: true },
      dailySummaryCron: { type: String, default: '55 23 * * *' },
      timezone: { type: String, default: 'Asia/Kolkata' },
    },
    // Voice
    voice: {
      enabled: { type: Boolean, default: true },
      ttsProvider: { type: String, enum: ['openai', 'elevenlabs', 'browser'], default: 'browser' },
      sttProvider: { type: String, enum: ['openai', 'browser'], default: 'browser' },
      speed: { type: Number, min: 0.5, max: 2.0, default: 1.0 },
    },
    // AI
    ai: {
      provider: { type: String, enum: ['openai', 'gemini', 'anthropic'], default: 'openai' },
      model: String,
      memoryEnabled: { type: Boolean, default: true },
      autoSaveMemory: { type: Boolean, default: true },
    },
    // Privacy
    privacy: {
      shareAnalytics: { type: Boolean, default: false },
      allowBrowserAutomation: { type: Boolean, default: false },
      allowedDomains: [String],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserSettings', userSettingsSchema);
