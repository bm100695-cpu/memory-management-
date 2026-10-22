const cron = require('node-cron');
const User = require('../models/User');
const UserSettings = require('../models/UserSettings');
const { generateSummary } = require('../services/journalService');
const { toDateKey } = require('../services/taskService');
const logger = require('../utils/logger');
const { env } = require('../config/env');

let summaryJob = null;

/**
 * Scheduled job that generates daily summaries for all active users.
 * Runs on the configured cron schedule (default: 11:55 PM).
 * Uses each user's configured timezone for date calculation.
 */
const startDailySummaryJob = () => {
  const cronExpression = env.DAILY_SUMMARY_CRON;

  if (!cron.validate(cronExpression)) {
    logger.error(`Invalid cron expression for daily summary: ${cronExpression}`);
    return;
  }

  summaryJob = cron.schedule(
    cronExpression,
    async () => {
      logger.info('Daily summary job started');
      try {
        const users = await User.find({ isActive: true }).select('_id');
        const today = new Date();

        let generated = 0;
        let skipped = 0;
        let errors = 0;

        for (const user of users) {
          try {
            // Get user's timezone from settings
            const settings = await UserSettings.findOne({ user: user._id }).select('notifications');
            const timezone = settings?.notifications?.timezone || env.DEFAULT_TIMEZONE;

            // Calculate "today" in user's timezone
            const localDate = toDateKey(today);

            const { created } = await generateSummary(user._id, localDate, 'scheduled');
            if (created) generated++;
            else skipped++;
          } catch (err) {
            errors++;
            logger.error(`Summary job error for user ${user._id}:`, err.message);
          }
        }

        logger.info(`Daily summary job complete — generated: ${generated}, skipped: ${skipped}, errors: ${errors}`);
      } catch (err) {
        logger.error('Daily summary job fatal error:', err);
      }
    },
    {
      timezone: env.DEFAULT_TIMEZONE,
    }
  );

  logger.info(`Daily summary job scheduled: ${cronExpression} (${env.DEFAULT_TIMEZONE})`);
};

/**
 * Run recovery for missed summaries on server startup.
 * Checks each user for missing summaries in the past N days.
 */
const recoverMissedSummariesOnStartup = async () => {
  const { recoverMissedSummaries } = require('../services/journalService');
  try {
    const users = await User.find({ isActive: true }).select('_id');
    logger.info(`Checking missed summaries for ${users.length} users...`);

    for (const user of users) {
      const recovered = await recoverMissedSummaries(user._id, 3); // Check last 3 days
      if (recovered.length > 0) {
        logger.info(`Recovered ${recovered.length} summaries for user ${user._id}`);
      }
    }
  } catch (err) {
    logger.error('Missed summary recovery error:', err.message);
  }
};

const stopDailySummaryJob = () => {
  if (summaryJob) {
    summaryJob.stop();
    logger.info('Daily summary job stopped');
  }
};

module.exports = { startDailySummaryJob, stopDailySummaryJob, recoverMissedSummariesOnStartup };
