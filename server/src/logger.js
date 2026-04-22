// Pino logger instance, JSON output in prod, pretty output in dev.
// All server code should import and use this instead of console.*.

const pino = require('pino');

const isProd = process.env.NODE_ENV === 'production';
const level = process.env.LOG_LEVEL || (isProd ? 'info' : 'debug');

const logger = pino({
  level,
  base: {
    service: 'gymquest-api',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isProd
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:mm:ss.l', ignore: 'pid,hostname,service' },
        },
      }),
});

module.exports = logger;
