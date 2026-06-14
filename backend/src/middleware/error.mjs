// Central error handler + 404 handler. Every error is normalized to the
// standard envelope { error: { code, message, details } }. AppErrors carry
// their own status; unknown errors become a 500 with the message hidden.

import { AppError, internal } from '../lib/errors.mjs';

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: { code: 'not_found', message: `No route for ${req.method} ${req.path}` },
  });
}

// eslint-disable-next-line no-unused-vars -- Express requires the 4-arg signature
export function errorHandler(err, req, res, _next) {
  const appErr = err instanceof AppError ? err : internal(err?.message, err);

  // 429 from express-rate-limit carries a Retry-After; preserve it.
  if (appErr.status === 429 && err.retryAfter) {
    res.setHeader('Retry-After', err.retryAfter);
  }

  if (appErr.status >= 500) {
    req.log?.error({ err, code: appErr.code }, 'request failed');
  } else {
    req.log?.warn({ code: appErr.code, status: appErr.status }, 'request error');
  }

  res.status(appErr.status).json(appErr.toEnvelope());
}
