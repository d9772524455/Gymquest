// JWT verification middleware. Returns 401/403 via direct json.

const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Require a valid JWT with optionally-specified role claim.
 * @param {string} [role]
 * @returns {import('express').RequestHandler}
 */
function auth(role) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.replace(/^Bearer\s+/, '');
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      if (role && decoded.role !== role) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      req.user = decoded;
      next();
    } catch {
      return res.status(401).json({ error: 'Bad token' });
    }
  };
}

module.exports = { auth };
