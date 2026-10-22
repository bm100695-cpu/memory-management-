require('dotenv').config();

const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
];

const validateEnv = () => {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

module.exports = {
  validateEnv,
  env: {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT) || 5000,
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

    MONGODB_URI: process.env.MONGODB_URI,

    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,

    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

    AI_PROVIDER: process.env.AI_PROVIDER || 'gemini',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
    GOOGLE_AI_MODEL: process.env.GOOGLE_AI_MODEL || 'gemini-3.5-flash',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',

    TTS_PROVIDER: process.env.TTS_PROVIDER || 'openai',
    STT_PROVIDER: process.env.STT_PROVIDER || 'openai',
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
    ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID,

    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,

    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX) || 100,

    LOG_LEVEL: process.env.LOG_LEVEL || 'info',

    DAILY_SUMMARY_CRON: process.env.DAILY_SUMMARY_CRON || '55 23 * * *',
    DEFAULT_TIMEZONE: process.env.DEFAULT_TIMEZONE || 'Asia/Kolkata',
  },
};
