require('dotenv').config();

const { validateEnv, env } = require('./config/env');
const { connectDB } = require('./config/database');
const logger = require('./utils/logger');
const { startDailySummaryJob, recoverMissedSummariesOnStartup } = require('./jobs/dailySummaryJob');

// Validate env before importing app (which loads routes/models)
validateEnv();

const app = require('./app');

const start = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start the HTTP server
    const server = app.listen(env.PORT, '0.0.0.0', () => {
      logger.info(`🚀 Server running on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
    });

    // Start scheduled jobs
    startDailySummaryJob();

    // Recover any missed summaries (run in background after startup)
    if (env.NODE_ENV === 'production') {
      setImmediate(() => recoverMissedSummariesOnStartup());
    }

    // ── Graceful Shutdown ──────────────────────────────────────────────────────
    const shutdown = async (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        const { disconnectDB } = require('./config/database');
        const { stopDailySummaryJob } = require('./jobs/dailySummaryJob');
        stopDailySummaryJob();
        await disconnectDB();
        logger.info('Server closed.');
        process.exit(0);
      });

      // Force exit after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Promise Rejection:', reason);
    });

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', err);
      shutdown('uncaughtException');
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
