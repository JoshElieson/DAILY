// Typed application errors. Every error surfaced to a client flows through
// `AppError` so the central error handler (middleware/error.mjs) can emit the
// standard envelope: { error: { code, message, details } } with the right HTTP
// status. Factory helpers cover the common cases.

export class AppError extends Error {
  /**
   * @param {string} code   stable machine code, e.g. 'not_found'
   * @param {string} message human-readable
   * @param {object} [opts]
   * @param {number} [opts.status] HTTP status (default 500)
   * @param {object} [opts.details] structured detail payload
   * @param {boolean} [opts.expose] include message to client (default true for <500)
   * @param {Error} [opts.cause]
   */
  constructor(code, message, { status = 500, details, expose, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.expose = expose ?? status < 500;
  }

  toEnvelope() {
    return {
      error: {
        code: this.code,
        message: this.expose ? this.message : 'Internal server error',
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}

export const badRequest = (message, details) =>
  new AppError('bad_request', message, { status: 400, details });

export const unauthorized = (message = 'Authentication required', details) =>
  new AppError('unauthorized', message, { status: 401, details });

export const forbidden = (message = 'Forbidden', details) =>
  new AppError('forbidden', message, { status: 403, details });

export const notFound = (message = 'Not found', details) =>
  new AppError('not_found', message, { status: 404, details });

export const conflict = (message, details) =>
  new AppError('conflict', message, { status: 409, details });

/** 402 — used for free-tier limits (prompt cap, out of regen credits). */
export const paymentRequired = (message, details) =>
  new AppError('payment_required', message, { status: 402, details });

export const tooManyRequests = (message = 'Rate limit exceeded', details) =>
  new AppError('rate_limited', message, { status: 429, details });

export const validationError = (details) =>
  new AppError('validation_error', 'Request validation failed', { status: 422, details });

export const upstreamError = (message = 'Upstream service error', details) =>
  new AppError('upstream_error', message, { status: 502, details });

export const internal = (message = 'Internal server error', cause) =>
  new AppError('internal', message, { status: 500, expose: false, cause });
