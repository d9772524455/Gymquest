// XP / level / streak calculations. Pure functions, no DB or side effects.

const {
  XP_LEVELS,
  XP_BASE,
  XP_PER_MINUTE,
  XP_STREAK_MULT,
  XP_STREAK_CAP,
  HERO_CLASSES,
} = require('../constants');

/**
 * Return the (1-indexed) level for a given XP total.
 * @param {number} xp
 * @returns {number}
 */
function calcLevel(xp) {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i]) return i + 1;
  }
  return 1;
}

/**
 * Compute XP earned for a workout.
 * Base + per-minute + streak bonus (capped at XP_STREAK_CAP days),
 * multiplied by hero class multiplier.
 * @param {number} mins
 * @param {number} streak
 * @param {string} hero
 */
function calcXP(mins, streak, hero) {
  const base = XP_BASE + mins * XP_PER_MINUTE;
  const bonus = Math.min(streak, XP_STREAK_CAP) * XP_STREAK_MULT;
  const mult = (HERO_CLASSES[hero] && HERO_CLASSES[hero].xpMult) || 1;
  return Math.round((base + bonus) * mult);
}

/**
 * Given the previous workout's date, decide streak action for today.
 * 'same'     — same UTC date as today (already counted)
 * 'continue' — yesterday (streak += 1)
 * 'reset'    — anything else (streak = 1)
 * Returns 'reset' if lastW is null/falsy.
 * Known limitation (audit bug S9): UTC-based; timezone-aware streak is out of budget.
 * @param {string|Date|null} lastW
 * @returns {'same'|'continue'|'reset'}
 */
function getStreakAction(lastW) {
  if (!lastW) return 'reset';
  const today = new Date().toISOString().split('T')[0];
  const last = new Date(lastW).toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (last === today) return 'same';
  if (last === yesterday) return 'continue';
  return 'reset';
}

module.exports = { calcLevel, calcXP, getStreakAction };
