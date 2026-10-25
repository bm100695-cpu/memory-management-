/**
 * Utility to detect and sanitize sensitive secrets before saving to memory.
 * Strips or redacts passwords, API keys, database credentials, tokens, etc.
 */

const SECRET_PATTERNS = [
  // Passwords in various formats (excluding already redacted markers)
  /(?:password|passwd|pwd)\s*[:=]\s*['"]?(?!\[REDACTED)([^\s,'"]+)['"]?/gi,
  // MongoDB URIs
  /mongodb(?:\+srv)?:\/\/[^\s'"]+/gi,
  // OpenAI API Keys
  /sk-[a-zA-Z0-9_-]{20,}/g,
  // Google / Gemini API Keys
  /AQ\.[a-zA-Z0-9_-]{20,}/g,
  /AIza[0-9A-Za-z-_]{35}/g,
  // Generic Bearer / JWT Tokens
  /Bearer\s+[a-zA-Z0-9_\-\.]+/gi,
  /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]+/g,
  // Generic Private Keys
  /-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----/g,
  // AWS Keys
  /AKIA[0-9A-Z]{16}/g,
  // GitHub Personal Access Tokens
  /ghp_[a-zA-Z0-9]{36}/g,
];

/**
 * Checks if a string contains potential secrets
 */
const containsSecret = (text) => {
  if (!text || typeof text !== 'string') return false;
  return SECRET_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });
};

/**
 * Redacts secrets from text, replacing them with [REDACTED_SECRET]
 */
const sanitizeSecrets = (text) => {
  if (!text || typeof text !== 'string') return text;
  let sanitized = text;

  // Specific password replacement
  sanitized = sanitized.replace(/(?:password|passwd|pwd)\s*[:=]\s*['"]?([^\s,'"]+)['"]?/gi, (match) => {
    return match.replace(/[:=]\s*['"]?([^\s,'"]+)['"]?/, ': [REDACTED_PASSWORD]');
  });

  // Redact matching token/key patterns
  for (const pattern of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    sanitized = sanitized.replace(pattern, '[REDACTED_SECRET]');
  }

  return sanitized;
};

module.exports = {
  containsSecret,
  sanitizeSecrets,
};
