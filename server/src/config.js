// Centralized configuration. All reads of process.env happen here.
// In production, missing required values cause fail-fast (process.exit 1)
// instead of silently falling back to defaults (audit bug S1).

require('dotenv').config();

const logger = require('./logger');

const isProd = process.env.NODE_ENV === 'production';

/**
 * Require an env variable or fail fast in production.
 * In non-prod (dev/test), return the fallback.
 */
function required(name, fallback) {
  const v = process.env[name];
  if (v && v.length > 0) return v;
  if (isProd) {
    logger.fatal({ event: 'config_missing', name }, `Missing required env var ${name} in production`);
    process.exit(1);
  }
  return fallback;
}

function optional(name, fallback) {
  const v = process.env[name];
  return v && v.length > 0 ? v : fallback;
}

function parseIntEnv(name, fallback) {
  const v = process.env[name];
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * DB SSL mode mapping (audit bug S2):
 *   DB_SSL_MODE=disable       → ssl: false
 *   DB_SSL_MODE=require       → ssl: { rejectUnauthorized: false }  (current prod behavior)
 *   DB_SSL_MODE=verify-ca     → ssl: { rejectUnauthorized: true }
 *   unset + prod              → defaults to 'require' (preserves current prod behavior)
 *   unset + non-prod          → defaults to 'disable'
 */
function parseDbSsl() {
  const mode = (process.env.DB_SSL_MODE || (isProd ? 'require' : 'disable')).toLowerCase();
  if (mode === 'disable' || mode === 'false' || mode === 'off') return false;
  if (mode === 'verify-ca') return { rejectUnauthorized: true };
  return { rejectUnauthorized: false };
}

const config = {
  isProd,
  port: parseIntEnv('PORT', 3000),
  logLevel: optional('LOG_LEVEL', isProd ? 'info' : 'debug'),
  jwtSecret: required('JWT_SECRET', 'hq_dev_secret_change_in_prod'),
  databaseUrl: required('DATABASE_URL', 'postgresql://gymquest:gymquest@localhost:5432/gymquest'),
  dbSsl: parseDbSsl(),
  smtp: {
    host: optional('SMTP_HOST', ''),
    port: parseIntEnv('SMTP_PORT', 587),
    user: optional('SMTP_USER', ''),
    pass: optional('SMTP_PASS', ''),
  },
};

module.exports = config;
