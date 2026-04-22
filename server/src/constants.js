// Centralized constants. Previously hardcoded throughout server/index.js.
// Audit bug S14.

/** XP thresholds — element N is the XP required to be level N+1 (1-indexed). */
const XP_LEVELS = [0, 500, 1200, 2100, 3200, 4500, 6000, 7800, 9900, 12500];

/** Max XP — level 10 is the current cap. */
const XP_MAX = XP_LEVELS[XP_LEVELS.length - 1];

/** Hero classes available to athletes on registration. */
const HERO_CLASSES = {
  warrior: { name: 'Воин', emoji: '⚔️', xpMult: 1.0 },
  runner: { name: 'Бегун', emoji: '⚡', xpMult: 1.0 },
  monk: { name: 'Монах', emoji: '🧘', xpMult: 1.0 },
  titan: { name: 'Титан', emoji: '🔥', xpMult: 1.0 },
};

/** Default hero when one isn't provided or is invalid. */
const DEFAULT_HERO = 'warrior';

/** Achievement definitions. Evaluated after each workout. */
const ACHIEVEMENTS = [
  { id: 'first_blood', name: 'Первая кровь', desc: 'Первая тренировка', field: 'total_w', op: '>=', val: 1 },
  { id: 'streak3', name: 'Серия ×3', desc: '3 дня подряд', field: 'streak', op: '>=', val: 3 },
  { id: 'streak7', name: 'Неделя огня', desc: '7 дней подряд', field: 'streak', op: '>=', val: 7 },
  { id: 'streak30', name: 'Месяц стали', desc: '30 дней подряд', field: 'streak', op: '>=', val: 30 },
  { id: 'w10', name: 'Десятка', desc: '10 тренировок', field: 'total_w', op: '>=', val: 10 },
  { id: 'w50', name: 'Полтинник', desc: '50 тренировок', field: 'total_w', op: '>=', val: 50 },
  { id: 'w100', name: 'Центурион', desc: '100 тренировок', field: 'total_w', op: '>=', val: 100 },
  { id: 'lv5', name: 'Середняк', desc: 'Уровень 5', field: 'level', op: '>=', val: 5 },
  { id: 'lv10', name: 'Легенда', desc: 'Уровень 10', field: 'level', op: '>=', val: 10 },
  { id: 'ton1k', name: 'Тонна', desc: '1 000 кг', field: 'total_ton', op: '>=', val: 1000 },
  { id: 'ton10k', name: 'Тяжеловес', desc: '10 000 кг', field: 'total_ton', op: '>=', val: 10000 },
];

/** XP formula tuning. */
const XP_BASE = 200;
const XP_PER_MINUTE = 5;
const XP_STREAK_MULT = 50;
const XP_STREAK_CAP = 30;

/** Streak thresholds for inactivity alerts (days). */
const ALERT_DAYS_LOW = 5;
const ALERT_DAYS_MEDIUM = 7;
const ALERT_DAYS_HIGH = 14;

/** Rate limit windows and max attempts. */
const RATE_LIMITS = {
  general: { windowMs: 15 * 60 * 1000, max: 100 },
  login: { windowMs: 15 * 60 * 1000, max: 10 },
  registerClub: { windowMs: 60 * 60 * 1000, max: 5 },
  registerMember: { windowMs: 60 * 60 * 1000, max: 20 },
};

/** JWT expiry windows. */
const JWT_EXPIRES_IN_USER = '30d';
const JWT_EXPIRES_IN_QR = '24h';

module.exports = {
  XP_LEVELS,
  XP_MAX,
  HERO_CLASSES,
  DEFAULT_HERO,
  ACHIEVEMENTS,
  XP_BASE,
  XP_PER_MINUTE,
  XP_STREAK_MULT,
  XP_STREAK_CAP,
  ALERT_DAYS_LOW,
  ALERT_DAYS_MEDIUM,
  ALERT_DAYS_HIGH,
  RATE_LIMITS,
  JWT_EXPIRES_IN_USER,
  JWT_EXPIRES_IN_QR,
};
