const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { auth } = require('../middleware/auth');
const { wrap, HttpError } = require('../middleware/errorHandler');
const { query, queryOne } = require('../db/pool');
const { calcXP, calcLevel, getStreakAction } = require('../services/xp');
const { checkAchievements } = require('../services/achievements');
const { body } = require('../models/schemas');
const { validateBody } = require('../middleware/validate');

const router = express.Router();

router.post(
  '/',
  auth('member'),
  validateBody(body.qrCheckin),
  wrap(async (req, res) => {
    const { qr_token } = req.body;

    let decoded;
    try {
      decoded = jwt.verify(qr_token, config.jwtSecret);
    } catch {
      throw new HttpError(400, 'Invalid or expired QR');
    }
    if (decoded.type !== 'checkin' || decoded.club_id !== req.user.club_id) {
      throw new HttpError(403, 'Wrong club QR');
    }

    const today = new Date().toISOString().split('T')[0];
    if (decoded.date !== today) {
      throw new HttpError(400, 'QR expired for today');
    }

    const mid = req.user.id;
    const cid = req.user.club_id;
    const m = await queryOne(
      `SELECT id, hero, xp, level, streak, total_w, total_ton, last_w
       FROM members WHERE id=$1`,
      [mid]
    );
    if (!m) throw new HttpError(404, 'Member not found');

    const action = getStreakAction(m.last_w);
    const newStreak =
      action === 'continue' ? m.streak + 1 : action === 'same' ? m.streak : 1;
    const xp = calcXP(0, newStreak, m.hero);
    const wid = uuidv4();

    await query(
      `INSERT INTO workouts(id, member_id, club_id, date, mins, cal, xp_earned, type)
       VALUES($1, $2, $3, $4, 0, 0, $5, 'qr_checkin')`,
      [wid, mid, cid, today, xp]
    );

    const newXP = m.xp + xp;
    const newLv = calcLevel(newXP);
    await query(
      `UPDATE members
       SET xp=$1, level=$2, streak=$3, max_streak=GREATEST(max_streak, $3),
           total_w=total_w+1, last_w=$4
       WHERE id=$5`,
      [newXP, newLv, newStreak, today, mid]
    );
    await query(
      `UPDATE alerts SET status='resolved' WHERE member_id=$1 AND status='open'`,
      [mid]
    );

    const stats = {
      total_w: m.total_w + 1,
      streak: newStreak,
      level: newLv,
      total_ton: m.total_ton,
    };
    const newAchs = await checkAchievements(mid, stats);

    res.json({
      workout_id: wid,
      xp_earned: xp,
      new_xp: newXP,
      new_level: newLv,
      level_up: newLv > m.level,
      streak: newStreak,
      tonnage: 0,
      new_achievements: newAchs,
      qr: true,
    });
  })
);

module.exports = router;
