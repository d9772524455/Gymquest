// Entrypoint: run pending migrations, then start the HTTP listener.

const config = require('./config');
const logger = require('./logger');
const { pool } = require('./db/pool');
const { runMigrations } = require('./db/migrate');
const app = require('./app');

async function start() {
  await runMigrations(pool);
  app.listen(config.port, () => {
    logger.info(
      { event: 'server_started', port: config.port, isProd: config.isProd },
      `Gym Quest API listening on :${config.port}`
    );
  });
}

start().catch((err) => {
  logger.fatal({ err: err.message, stack: err.stack }, 'Failed to start');
  process.exit(1);
});
