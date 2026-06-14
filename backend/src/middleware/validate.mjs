// Zod-based request validation. Produces a 422 with structured details on
// failure (the standard validationError envelope) and replaces req.body/query
// with the parsed, typed value on success.

import { validationError } from '../lib/errors.mjs';

function run(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    throw validationError(details);
  }
  return result.data;
}

export const validateBody = (schema) => (req, _res, next) => {
  try {
    req.body = run(schema, req.body ?? {});
    next();
  } catch (err) {
    next(err);
  }
};

export const validateQuery = (schema) => (req, _res, next) => {
  try {
    req.validatedQuery = run(schema, req.query ?? {});
    next();
  } catch (err) {
    next(err);
  }
};
