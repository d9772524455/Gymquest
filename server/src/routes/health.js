const express = require('express');
const { queryOne } = require('../db/pool');
const { wrap } = require('../middleware/errorHandler');

const router = express.Router();
const START_TIME = Date.now();
const VERSION = '2.0.0';
const NAME = 'Gym Quest API';

router.get(
  '/',
  wrap(async (_req, res) => {
    const dbRow = await queryOne('SELECT 1 AS ok').catch(() => null);
    res.json({
      status: dbRow ? 'ok' : 'db_error',
      name: NAME,
      version: VERSION,
      db: dbRow ? 'connected' : 'error',
      uptime_s: Math.floor((Date.now() - START_TIME) / 1000),
      node: process.version,
      started_at: new Date(START_TIME).toISOString(),
    });
  })
);

module.exports = router;
