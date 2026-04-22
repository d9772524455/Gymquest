const express = require('express');
const { query, queryOne } = require('../db/pool');
const { ACHIEVEMENTS, HERO_CLASSES } = require('../constants');
const { wrap } = require('../middleware/errorHandler');

const router = express.Router();

router.get('/achievements', (_req, res) => {
  res.json(ACHIEVEMENTS.map((a) => ({ id: a.id, name: a.name, desc: a.desc })));
});

router.get('/hero-classes', (_req, res) => {
  res.json(HERO_CLASSES);
});

router.get(
  '/seasons/:club_id/active',
  wrap(async (req, res) => {
    const s = await queryOne(
      `SELECT id, name, description, start_date, end_date FROM seasons
       WHERE club_id=$1 AND active=TRUE AND start_date<=CURRENT_DATE AND end_date>=CURRENT_DATE
       ORDER BY start_date DESC LIMIT 1`,
      [req.params.club_id]
    );
    res.json(s || { active: false });
  })
);

router.get(
  '/global/leaderboard',
  wrap(async (_req, res) => {
    res.json(
      await query(
        `SELECT c.id, c.name, c.city, COUNT(m.id)::int as members,
           COALESCE(ROUND(AVG(m.xp)),0)::int as avg_xp
         FROM clubs c LEFT JOIN members m ON m.club_id=c.id AND m.active=TRUE
         WHERE c.active=TRUE
         GROUP BY c.id HAVING COUNT(m.id) > 0
         ORDER BY avg_xp DESC LIMIT 20`
      )
    );
  })
);

module.exports = router;
