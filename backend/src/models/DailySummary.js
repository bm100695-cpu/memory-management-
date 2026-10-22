const mongoose = require('mongoose');

const dailySummarySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Date for this summary (stored as midnight UTC of that calendar date)
    date: {
      type: Date,
      required: true,
      index: true,
    },
    // Structured summary sections
    completedTasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DailyTask' }],
    inProgressTasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DailyTask' }],
    pendingTasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DailyTask' }],

    // AI-generated narrative
    narrativeSummary: {
      type: String,
      maxlength: [5000, 'Summary too long'],
    },
    achievements: [String],
    blockers: [String],
    // Suggested plan for next day (clearly marked as suggestion, not confirmed)
    suggestedTomorrow: [String],

    // Stats at time of generation
    stats: {
      totalTasks: { type: Number, default: 0 },
      completedCount: { type: Number, default: 0 },
      pendingCount: { type: Number, default: 0 },
      inProgressCount: { type: Number, default: 0 },
      completionPercentage: { type: Number, default: 0 },
    },

    // Generation metadata
    generatedAt: { type: Date, default: Date.now },
    generationSource: {
      type: String,
      enum: ['scheduled', 'manual', 'recovery'],
      default: 'scheduled',
    },
    // Whether the user has viewed this summary
    isViewed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Unique constraint: one summary per user per day
dailySummarySchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailySummary', dailySummarySchema);
