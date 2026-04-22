const express = require('express');
const { auth } = require('../middleware/auth');
const { wrap, HttpError } = require('../middleware/errorHandler');
const { query, queryOne } = require('../db/pool');
const { HERO_CLASSES, XP_LEVELS } = require('../constants');

const router = express.Router();

router.get(
  '/',
  auth('member'),
  wrap(async (req, res) => {
    const m = await queryOne(
      `SELECT id, club_id, name, hero, xp, level, streak, max_streak,
              total_w, total_min, total_ton, total_cal, last_w
       FROM members WHERE id=$1`,
      [req.user.id]
    );
    if (!m) throw new HttpError(404, 'Not found');
    m.xp_next = XP_LEVELS[Math.min(m.level, 9)] || 12500;
    m.hero_info = HERO_CLASSES[m.hero];
    m.achievements = await query(
      'SELECT ach_id, unlocked_at AS at FROM achievements WHERE member_id=$1',
      [m.id]
    );
    res.json(m);
  })
);

module.exports = router;
