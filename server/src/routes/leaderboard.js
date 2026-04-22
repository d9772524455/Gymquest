const express = require('express');
const { auth } = require('../middleware/auth');
const { wrap } = require('../middleware/errorHandler');
const { query } = require('../db/pool');

const router = express.Router();

router.get(
  '/:club_id',
  auth('member'),
  wrap(async (req, res) => {
    const rows = await query(
      `SELECT id, name, hero, xp, level, streak, total_w
       FROM members WHERE club_id=$1 AND active=TRUE
       ORDER BY xp DESC LIMIT 50`,
      [req.params.club_id]
    );
    res.json(rows.map((r, i) => ({ ...r, rank: i + 1, is_you: r.id === req.user.id })));
  })
);

module.exports = router;
