const DailyTask = require('../models/DailyTask');
const DailySummary = require('../models/DailySummary');
const { toDateKey } = require('./taskService');
const logger = require('../utils/logger');

/**
 * Generate or retrieve a daily summary for a user and date.
 * Prevents duplicate summaries for the same user+date.
 *
 * @param {string} userId
 * @param {Date|string} date - Calendar date for the summary
 * @param {string} source - 'scheduled' | 'manual' | 'recovery'
 */
const generateSummary = async (userId, date, source = 'scheduled') => {
  const summaryDate = toDateKey(date);

  // Check for existing summary (unique constraint)
  const existing = await DailySummary.findOne({ user: userId, date: summaryDate });
  if (existing) {
    logger.info(`Summary already exists for user ${userId} on ${summaryDate.toISOString()}`);
    return { summary: existing, created: false };
  }

  // Fetch tasks for the day
  const nextDay = new Date(summaryDate);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  const tasks = await DailyTask.find({
    user: userId,
    scheduledDate: { $gte: summaryDate, $lt: nextDay },
  });

  const completed = tasks.filter((t) => t.status === 'completed');
  const inProgress = tasks.filter((t) => t.status === 'in_progress');
  const pending = tasks.filter((t) => ['pending', 'planned'].includes(t.status));

  const stats = {
    totalTasks: tasks.length,
    completedCount: completed.length,
    inProgressCount: inProgress.length,
    pendingCount: pending.length,
    completionPercentage:
      tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0,
  };

  // Generate a simple narrative without AI dependency (AI call can be added in Phase 4)
  const dateStr = summaryDate.toDateString();
  const narrativeSummary = generateNarrative(dateStr, completed, inProgress, pending, stats);

  // Suggested tomorrow plan = today's unfinished tasks (clearly marked as suggestions)
  const suggestedTomorrow = pending.map((t) => `[Suggested] ${t.title}`);

  const summary = await DailySummary.create({
    user: userId,
    date: summaryDate,
    completedTasks: completed.map((t) => t._id),
    inProgressTasks: inProgress.map((t) => t._id),
    pendingTasks: pending.map((t) => t._id),
    narrativeSummary,
    stats,
    suggestedTomorrow,
    generationSource: source,
    generatedAt: new Date(),
  });

  logger.info(`Summary generated for user ${userId} on ${summaryDate.toISOString()}`);
  return { summary, created: true };
};

/**
 * Build a plain-text narrative from task data.
 */
const generateNarrative = (dateStr, completed, inProgress, pending, stats) => {
  const lines = [`📅 Daily Summary — ${dateStr}`, ''];

  lines.push(`📊 Progress: ${stats.completionPercentage}% (${stats.completedCount}/${stats.totalTasks} tasks)`);
  lines.push('');

  if (completed.length > 0) {
    lines.push('✅ Completed:');
    completed.forEach((t) => lines.push(`  • ${t.title}`));
    lines.push('');
  }

  if (inProgress.length > 0) {
    lines.push('🔄 In Progress:');
    inProgress.forEach((t) => lines.push(`  • ${t.title}`));
    lines.push('');
  }

  if (pending.length > 0) {
    lines.push('⏳ Pending:');
    pending.forEach((t) => lines.push(`  • ${t.title}`));
  }

  return lines.join('\n');
};

/**
 * Get summary for a specific date.
 */
const getSummaryByDate = async (userId, date) => {
  const summaryDate = toDateKey(date);
  const summary = await DailySummary.findOne({ user: userId, date: summaryDate })
    .populate('completedTasks', 'title category status')
    .populate('inProgressTasks', 'title category status')
    .populate('pendingTasks', 'title category status');
  return summary;
};

/**
 * Get summary history with pagination.
 */
const getSummaryHistory = async (userId, { page = 1, limit = 10 } = {}) => {
  const skip = (page - 1) * limit;
  const [summaries, total] = await Promise.all([
    DailySummary.find({ user: userId })
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .select('-completedTasks -inProgressTasks -pendingTasks'),
    DailySummary.countDocuments({ user: userId }),
  ]);
  return { summaries, total, page, totalPages: Math.ceil(total / limit) };
};

/**
 * Recover missed summaries for a user (called on server start).
 * Generates summaries for past days that were missed.
 */
const recoverMissedSummaries = async (userId, daysBack = 7) => {
  const recovered = [];
  const today = toDateKey(new Date());

  for (let i = 1; i <= daysBack; i++) {
    const pastDate = new Date(today);
    pastDate.setUTCDate(pastDate.getUTCDate() - i);

    const exists = await DailySummary.findOne({ user: userId, date: pastDate });
    if (!exists) {
      try {
        const result = await generateSummary(userId, pastDate, 'recovery');
        if (result.created) recovered.push(pastDate);
      } catch (err) {
        logger.error(`Failed to recover summary for ${pastDate.toISOString()}:`, err.message);
      }
    }
  }

  return recovered;
};

module.exports = {
  generateSummary,
  getSummaryByDate,
  getSummaryHistory,
  recoverMissedSummaries,
};
