// PostgreSQL connection pool + query helpers. Centralizes pg configuration.

const { Pool } = require('pg');
const config = require('../config');
const logger = require('../logger');

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.dbSsl,
  max: 20,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  logger.error({ event: 'pg_pool_error', err: err.message }, 'Unexpected pg pool error');
});

/**
 * Run a parameterized query and return all rows.
 * @param {string} text
 * @param {Array<*>} [params]
 * @returns {Promise<Array<Record<string, *>>>}
 */
async function query(text, params) {
  const res = await pool.query(text, params);
  return res.rows;
}

/**
 * Run a parameterized query and return the first row or null.
 * @param {string} text
 * @param {Array<*>} [params]
 * @returns {Promise<Record<string, *>|null>}
 */
async function queryOne(text, params) {
  const rows = await query(text, params);
  return rows[0] || null;
}

module.exports = { pool, query, queryOne };
