'use strict';

// Unit tests for src/services/xp.js (calcLevel, calcXP, getStreakAction).
// Uses Node's built-in node:test runner + node:assert/strict. No external deps.

const test = require('node:test');
const assert = require('node:assert/strict');

const { calcLevel, calcXP, getStreakAction } = require('../../src/services/xp');
const {
  XP_LEVELS,
  XP_BASE,
  XP_PER_MINUTE,
  XP_STREAK_MULT,
  XP_STREAK_CAP,
} = require('../../src/constants');

// ─── calcLevel ────────────────────────────────────────────

test('calcLevel: xp=0 → level 1', () => {
  assert.equal(calcLevel(0), 1);
});

test('calcLevel: xp=499 (just below level-2 threshold) → level 1', () => {
  assert.equal(calcLevel(499), 1);
});

test('calcLevel: xp=500 (exactly level-2 threshold) → level 2', () => {
  assert.equal(calcLevel(500), 2);
});

test('calcLevel: xp=1199 (just below level-3 threshold) → level 2', () => {
  assert.equal(calcLevel(1199), 2);
});

test('calcLevel: xp=2100 (exactly level-4 threshold) → level 4', () => {
  assert.equal(calcLevel(2100), 4);
});

test('calcLevel: xp at max threshold → level 10', () => {
  assert.equal(calcLevel(XP_LEVELS[XP_LEVELS.length - 1]), 10);
});

test('calcLevel: xp above max → caps at level 10', () => {
  assert.equal(calcLevel(XP_LEVELS[XP_LEVELS.length - 1] + 1000), 10);
});

// ─── calcXP ───────────────────────────────────────────────

test('calcXP: zero mins, zero streak, warrior → XP_BASE', () => {
  assert.equal(calcXP(0, 0, 'warrior'), XP_BASE);
});

test('calcXP: 45 min + streak 3, warrior → base + mins*5 + streak*50', () => {
  // 200 + 45*5 + 3*50 = 200 + 225 + 150 = 575
  const expected = XP_BASE + 45 * XP_PER_MINUTE + 3 * XP_STREAK_MULT;
  assert.equal(calcXP(45, 3, 'warrior'), expected);
  assert.equal(calcXP(45, 3, 'warrior'), 575);
});

test('calcXP: streak 100 caps at XP_STREAK_CAP (30) days', () => {
  // 200 + 0*5 + min(100,30)*50 = 200 + 1500 = 1700
  const expected = XP_BASE + XP_STREAK_CAP * XP_STREAK_MULT;
  assert.equal(calcXP(0, 100, 'warrior'), expected);
  assert.equal(calcXP(0, 100, 'warrior'), 1700);
});

test('calcXP: unknown hero class → multiplier of 1', () => {
  // 200 + 30*5 + 5*50 = 200 + 150 + 250 = 600
  const expected = Math.round(
    (XP_BASE + 30 * XP_PER_MINUTE + 5 * XP_STREAK_MULT) * 1,
  );
  assert.equal(calcXP(30, 5, 'nonexistent_hero'), expected);
  assert.equal(calcXP(30, 5, 'nonexistent_hero'), 600);
});

// ─── getStreakAction ──────────────────────────────────────

test('getStreakAction: null input → reset', () => {
  assert.equal(getStreakAction(null), 'reset');
});

test('getStreakAction: undefined input → reset', () => {
  assert.equal(getStreakAction(undefined), 'reset');
});

test('getStreakAction: today → same', (t) => {
  const fixedNow = new Date('2026-04-23T12:00:00Z').getTime();
  t.mock.timers.enable({ apis: ['Date'], now: fixedNow });
  assert.equal(getStreakAction('2026-04-23'), 'same');
});

test('getStreakAction: yesterday → continue', (t) => {
  const fixedNow = new Date('2026-04-23T12:00:00Z').getTime();
  t.mock.timers.enable({ apis: ['Date'], now: fixedNow });
  assert.equal(getStreakAction('2026-04-22'), 'continue');
});

test('getStreakAction: two days ago → reset', (t) => {
  const fixedNow = new Date('2026-04-23T12:00:00Z').getTime();
  t.mock.timers.enable({ apis: ['Date'], now: fixedNow });
  assert.equal(getStreakAction('2026-04-21'), 'reset');
});

test('getStreakAction: Date object for lastW (yesterday) → continue', (t) => {
  const fixedNow = new Date('2026-04-23T12:00:00Z').getTime();
  t.mock.timers.enable({ apis: ['Date'], now: fixedNow });
  assert.equal(getStreakAction(new Date('2026-04-22T10:00:00Z')), 'continue');
});
