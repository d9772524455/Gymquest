// Migration runner. Reads sql files from ./migrations/, tracks applied
// migrations in a _migrations table, and skips those already applied.
//
// Bootstrap logic (audit bug S17):
//   If the _migrations table doesn't exist AND the clubs table does exist,
//   we're running against a production DB that was previously initialized
//   via initDB() (pre-migration era). In that case, insert 001_init.sql
//   into _migrations WITHOUT executing its SQL — the schema is already
//   there, running CREATE TABLE IF NOT EXISTS again is technically safe
//   but the "apply" event would be misleading.
//
// Usage:
//   const { pool } = require('./pool');
//   const { runMigrations } = require('./migrate');
//   await runMigrations(pool);
//
// Or via CLI:
//   node server/src/db/migrate.js  (reads DATABASE_URL from env)

const fs = require('fs');
const path = require('path');
const logger = require('../logger');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const BOOTSTRAP_MIGRATION = '001_init.sql';

async function ensureMigrationsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function maybeBootstrapExistingSchema(pool) {
  const clubsCheck = await pool.query("SELECT to_regclass('clubs') AS t");
  const clubsExists = Boolean(clubsCheck.rows[0].t);
  if (!clubsExists) return false;

  const count = await pool.query('SELECT COUNT(*)::int AS c FROM _migrations');
  const isEmpty = count.rows[0].c === 0;
  if (!isEmpty) return false;

  await pool.query('INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT DO NOTHING', [
    BOOTSTRAP_MIGRATION,
  ]);
  logger.info(
    { event: 'migrate_bootstrap', migration: BOOTSTRAP_MIGRATION },
    `Detected existing schema, marking ${BOOTSTRAP_MIGRATION} as applied without execution`
  );
  return true;
}

async function getAppliedMigrations(pool) {
  const res = await pool.query('SELECT name FROM _migrations ORDER BY name');
  return new Set(res.rows.map((r) => r.name));
}

function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    logger.warn(
      { event: 'migrate_no_dir', dir: MIGRATIONS_DIR },
      'Migrations directory missing, nothing to apply'
    );
    return [];
  }
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

async function applyMigration(pool, name) {
  const sqlPath = path.join(MIGRATIONS_DIR, name);
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO _migrations (name) VALUES ($1)', [name]);
    await client.query('COMMIT');
    logger.info({ event: 'migrate_applied', migration: name }, `Applied ${name}`);
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(
      { event: 'migrate_failed', migration: name, err: err.message },
      `Failed applying ${name}`
    );
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Run all pending migrations against the given pool.
 * @param {import('pg').Pool} pool
 */
async function runMigrations(pool) {
  await ensureMigrationsTable(pool);
  await maybeBootstrapExistingSchema(pool);

  const applied = await getAppliedMigrations(pool);
  const all = getMigrationFiles();
  const pending = all.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    logger.info({ event: 'migrate_up_to_date' }, 'Migrations up to date — 0 applied');
    return;
  }

  for (const name of pending) {
    await applyMigration(pool, name);
  }
  logger.info(
    { event: 'migrate_done', applied: pending.length },
    `Migrations: ${pending.length} applied`
  );
}

module.exports = { runMigrations };

// CLI entrypoint
if (require.main === module) {
  (async () => {
    const { pool } = require('./pool');
    try {
      await runMigrations(pool);
      process.exit(0);
    } catch (err) {
      logger.fatal({ event: 'migrate_error', err: err.message, stack: err.stack }, 'Migration failed');
      process.exit(1);
    }
  })();
}
