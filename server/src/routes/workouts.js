const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { auth } = require('../middleware/auth');
const { wrap, HttpError } = require('../middleware/errorHandler');
const { query, queryOne } = require('../db/pool');
const { calcXP, calcLevel, getStreakAction } = require('../services/xp');
const { checkAchievements } = require('../services/achievements');

const router = express.Router();

/**
 * Build a multi-row INSERT for exercises. Fixes N+1 (audit bug S11).
 * Returns { text, values, totalTonnage }.
 */
function buildExercisesInsert(workoutId, exercises) {
  if (!exercises || exercises.length === 0) {
    return { text: null, values: [], totalTonnage: 0 };
  }
  const rows = [];
  const values = [];
  let totalTonnage = 0;
  exercises.forEach((ex) => {
    const sets = Number(ex.sets) || 0;
    const reps = Number(ex.reps) || 0;
    const weight = Number(ex.weight_kg) || 0;
    const tonnage = sets * reps * weight;
    totalTonnage += tonnage;
    const base = values.length;
    rows.push(
      `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`
    );
    values.push(uuidv4(), workoutId, ex.name || '', sets, reps, weight, tonnage);
  });
  const text = `INSERT INTO exercises(id, workout_id, name, sets, reps, weight, tonnage) VALUES ${rows.join(',')}`;
  return { text, values, totalTonnage };
}

router.post(
  '/',
  auth('member'),
  wrap(async (req, res) => {
    const {
      duration_minutes = 0,
      calories = 0,
      exercises = [],
      type = 'checkin',
    } = req.body;

    const mid = req.user.id;
    const cid = req.user.club_id;

    const m = await queryOne(
      `SELECT id, hero, xp, level, streak, max_streak, total_w, total_min,
              total_ton, total_cal, last_w
       FROM members WHERE id=$1`,
      [mid]
    );
    if (!m) throw new HttpError(404, 'Member not found');

    const action = getStreakAction(m.last_w);
    const newStreak =
      action === 'continue' ? m.streak + 1 : action === 'same' ? m.streak : 1;
    const xp = calcXP(duration_minutes, newStreak, m.hero);

    const wid = uuidv4();
    const today = new Date().toISOString().split('T')[0];

    await query(
      `INSERT INTO workouts(id, member_id, club_id, date, mins, cal, xp_earned, type)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8)`,
      [wid, mid, cid, today, duration_minutes, calories, xp, type]
    );

    // Multi-row INSERT for exercises (was N+1 in the old code — audit S11)
    const exIns = buildExercisesInsert(wid, exercises);
    if (exIns.text) {
      await query(exIns.text, exIns.values);
    }
    const tonnage = exIns.totalTonnage;

    const newXP = m.xp + xp;
    const newLv = calcLevel(newXP);
    await query(
      `UPDATE members
       SET xp=$1, level=$2, streak=$3, max_streak=GREATEST(max_streak, $3),
           total_w=total_w+1, total_min=total_min+$4, total_ton=total_ton+$5,
           total_cal=total_cal+$6, last_w=$7
       WHERE id=$8`,
      [newXP, newLv, newStreak, duration_minutes, tonnage, calories, today, mid]
    );
    await query(
      `UPDATE alerts SET status='resolved' WHERE member_id=$1 AND status='open'`,
      [mid]
    );

    const stats = {
      total_w: m.total_w + 1,
      streak: newStreak,
      level: newLv,
      total_ton: Number(m.total_ton) + tonnage,
    };
    const newAchs = await checkAchievements(mid, stats);

    res.json({
      workout_id: wid,
      xp_earned: xp,
      new_xp: newXP,
      new_level: newLv,
      level_up: newLv > m.level,
      streak: newStreak,
      tonnage,
      new_achievements: newAchs,
    });
  })
);

router.get(
  '/history',
  auth('member'),
  wrap(async (req, res) => {
    const limitRaw = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 20;
    const rows = await query(
      `SELECT id, date, mins, cal, xp_earned, type
       FROM workouts WHERE member_id=$1
       ORDER BY created_at DESC LIMIT $2`,
      [req.user.id, limit]
    );
    res.json(rows);
  })
);

module.exports = router;
