// Rate-limit middlewares. express-rate-limit is a REQUIRED dependency now
// (audit bug S3) — no more try/catch swallowing a missing module.

const rateLimit = require('express-rate-limit');
const { RATE_LIMITS } = require('../constants');

const general = rateLimit({
  windowMs: RATE_LIMITS.general.windowMs,
  max: RATE_LIMITS.general.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, try again later' },
});

const login = rateLimit({
  windowMs: RATE_LIMITS.login.windowMs,
  max: RATE_LIMITS.login.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts' },
});

const registerClub = rateLimit({
  windowMs: RATE_LIMITS.registerClub.windowMs,
  max: RATE_LIMITS.registerClub.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registrations' },
});

const registerMember = rateLimit({
  windowMs: RATE_LIMITS.registerMember.windowMs,
  max: RATE_LIMITS.registerMember.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registrations' },
});

module.exports = { general, login, registerClub, registerMember };
