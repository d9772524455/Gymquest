// Zod → Express middleware bridge.
// validateBody(schema) parses req.body, replaces it with the parsed result,
// throws HttpError(400) on failure with a flat human message.
// validateQuery(schema) does the same for req.query.

const { HttpError } = require('./errorHandler');

/**
 * Flatten a ZodError into a short human string.
 * Example: "email: invalid; password: too short (min 8)"
 */
function formatZodError(zodError) {
  return zodError.issues
    .map((i) => {
      const path = i.path.length ? i.path.join('.') + ': ' : '';
      return path + i.message;
    })
    .join('; ');
}

/**
 * Express middleware that validates req.body against the given zod schema.
 * On success: replaces req.body with the parsed (coerced + defaulted) value.
 * On failure: throws HttpError(400, <message>).
 */
function validateBody(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new HttpError(400, formatZodError(result.error)));
    }
    req.body = result.data;
    next();
  };
}

/**
 * Express middleware that validates req.query against the given zod schema.
 * On success: copies the parsed values onto req.query keys (does not replace
 * the whole object, because some versions of Express make req.query a frozen
 * getter property).
 */
function validateQuery(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(new HttpError(400, formatZodError(result.error)));
    }
    for (const [key, val] of Object.entries(result.data)) {
      req.query[key] = val;
    }
    next();
  };
}

module.exports = { validateBody, validateQuery };
