const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { auth } = require('../middleware/auth');
const { wrap } = require('../middleware/errorHandler');
const { query, queryOne } = require('../db/pool');
const { sendInactivityAlerts } = require('../services/alerts');
const {
  JWT_EXPIRES_IN_QR,
  ALERT_DAYS_LOW,
  ALERT_DAYS_MEDIUM,
  ALERT_DAYS_HIGH,
} = require('../constants');
const { body } = require('../models/schemas');
const { validateBody } = require('../middleware/validate');

const router = express.Router();

// All endpoints require a club token.
router.use(auth('club'));

router.get(
  '/stats',
  wrap(async (req, res) => {
    const c = req.user.id;
    const [total, active, wMonth, avgs, daily, lvl, clubRow] = await Promise.all([
      queryOne(
        'SELECT COUNT(*)::int AS n FROM members WHERE club_id=$1 AND active=TRUE',
        [c]
      ),
      queryOne(
        `SELECT COUNT(DISTINCT member_id)::int AS n FROM workouts
         WHERE club_id=$1 AND date>=CURRENT_DATE-7`,
        [c]
      ),
      queryOne(
        `SELECT COUNT(*)::int AS n FROM workouts
         WHERE club_id=$1 AND date>=CURRENT_DATE-30`,
        [c]
      ),
      queryOne(
        `SELECT COALESCE(AVG(xp),0)::int AS avg_xp,
                COALESCE(AVG(streak),0)::numeric(5,1) AS avg_streak
         FROM members WHERE club_id=$1 AND active=TRUE`,
        [c]
      ),
      query(
        `SELECT date::text, COUNT(*)::int AS visits FROM workouts
         WHERE club_id=$1 AND date>=CURRENT_DATE-7
         GROUP BY date ORDER BY date`,
        [c]
      ),
      query(
        `SELECT level, COUNT(*)::int AS count FROM members
         WHERE club_id=$1 AND active=TRUE GROUP BY level ORDER BY level`,
        [c]
      ),
      queryOne('SELECT name FROM clubs WHERE id=$1', [c]),
    ]);
    res.json({
      name: clubRow ? clubRow.name : null,
      total_members: total.n,
      active_week: active.n,
      workouts_month: wMonth.n,
      avg_xp: avgs.avg_xp,
      avg_streak: parseFloat(avgs.avg_streak),
      daily,
      level_dist: lvl,
    });
  })
);

router.get(
  '/alerts',
  wrap(async (req, res) => {
    const c = req.user.id;
    const members = await query(
      `SELECT id, name, hero, level, last_w,
        (CURRENT_DATE - COALESCE(last_w, created_at::date))::int AS days
       FROM members WHERE club_id=$1 AND active=TRUE ORDER BY days DESC`,
      [c]
    );
    const alerts = [];
    for (const m of members) {
      if (m.days < ALERT_DAYS_LOW) continue;
      const risk =
        m.days >= ALERT_DAYS_HIGH ? 'high' : m.days >= ALERT_DAYS_MEDIUM ? 'medium' : 'low';
      const existing = await queryOne(
        "SELECT id FROM alerts WHERE member_id=$1 AND status='open'",
        [m.id]
      );
      if (existing) {
        await query('UPDATE alerts SET days=$1, risk=$2 WHERE id=$3', [m.days, risk, existing.id]);
      } else {
        await query(
          'INSERT INTO alerts(id, club_id, member_id, risk, days) VALUES($1, $2, $3, $4, $5)',
          [uuidv4(), c, m.id, risk, m.days]
        );
      }
      alerts.push({
        member_id: m.id,
        name: m.name,
        hero: m.hero,
        level: m.level,
        days: m.days,
        risk,
      });
    }
    res.json(alerts);
  })
);

router.post(
  '/alerts/:id/resolve',
  wrap(async (req, res) => {
    await query(
      "UPDATE alerts SET status='resolved' WHERE id=$1 AND club_id=$2",
      [req.params.id, req.user.id]
    );
    res.json({ ok: true });
  })
);

router.get(
  '/members',
  wrap(async (req, res) => {
    const rows = await query(
      `SELECT id, name, email, hero, xp, level, streak, total_w, last_w,
        (CURRENT_DATE - COALESCE(last_w, created_at::date))::int AS days
       FROM members WHERE club_id=$1 AND active=TRUE ORDER BY xp DESC`,
      [req.user.id]
    );
    res.json(
      rows.map((r) => ({
        ...r,
        risk:
          r.days >= ALERT_DAYS_HIGH
            ? 'high'
            : r.days >= ALERT_DAYS_MEDIUM
              ? 'medium'
              : r.days >= ALERT_DAYS_LOW
                ? 'low'
                : 'none',
      }))
    );
  })
);

router.get(
  '/top',
  wrap(async (req, res) => {
    res.json(
      await query(
        `SELECT id, name, hero, xp, level, streak, total_w FROM members
         WHERE club_id=$1 AND active=TRUE ORDER BY xp DESC LIMIT 10`,
        [req.user.id]
      )
    );
  })
);

router.get(
  '/qr-token',
  wrap(async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const token = jwt.sign(
      { club_id: req.user.id, date: today, type: 'checkin' },
      config.jwtSecret,
      { expiresIn: JWT_EXPIRES_IN_QR }
    );
    res.json({ qr_token: token, date: today, expires_in: JWT_EXPIRES_IN_QR });
  })
);

router.post(
  '/seasons',
  validateBody(body.createSeason),
  wrap(async (req, res) => {
    const { name, description, start_date, end_date } = req.body;
    const id = uuidv4();
    await query(
      `INSERT INTO seasons(id, club_id, name, description, start_date, end_date)
       VALUES($1, $2, $3, $4, $5, $6)`,
      [id, req.user.id, name, description || '', start_date, end_date]
    );
    res.json({ season_id: id });
  })
);

router.get(
  '/seasons',
  wrap(async (req, res) => {
    res.json(
      await query(
        'SELECT * FROM seasons WHERE club_id=$1 ORDER BY start_date DESC',
        [req.user.id]
      )
    );
  })
);

router.patch(
  '/seasons/:id',
  validateBody(body.patchSeason),
  wrap(async (req, res) => {
    const { active } = req.body;
    await query(
      'UPDATE seasons SET active=$1 WHERE id=$2 AND club_id=$3',
      [active, req.params.id, req.user.id]
    );
    res.json({ ok: true });
  })
);

router.post(
  '/send-alerts',
  wrap(async (req, res) => {
    const result = await sendInactivityAlerts(req.user.id);
    res.json(result);
  })
);

module.exports = router;
