// Centralized async error handling.
// wrap(fn) lets routes throw — errors go to next() and land in errorHandler.
// errorHandler must be registered LAST (after all routes) — Express only
// invokes error middleware registered AFTER the failing handler in the stack.
// This fixes audit bug S8 (previous code registered the handler BEFORE
// routes so it never triggered for route errors).

const config = require('../config');
const logger = require('../logger');

/**
 * Wrap an async route handler so thrown errors go to next().
 * @template {import('express').RequestHandler} H
 * @param {H} fn
 * @returns {import('express').RequestHandler}
 */
function wrap(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

/**
 * Express error-handling middleware (4-arity).
 * @param {any} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  logger.error(
    { err: err.message, stack: err.stack, path: req.path, method: req.method },
    'request handler error'
  );
  const status = err.status || err.statusCode || 500;
  const message = config.isProd && status >= 500 ? 'Server error' : err.message;
  res.status(status).json({ error: message });
}

/**
 * Error class carrying an HTTP status. Throw from any route/service and
 * the handler returns { error: message } with the right status.
 * Example: throw new HttpError(404, 'Club not found');
 */
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = { wrap, errorHandler, HttpError };
