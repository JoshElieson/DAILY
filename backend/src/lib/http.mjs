// HTTP helpers shared across routes.

/**
 * Wrap an async route handler so thrown/rejected errors reach Express's error
 * pipeline (and our central error middleware) without try/catch in every route.
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/** Standard success helper. */
export function ok(res, data, status = 200) {
  return res.status(status).json(data);
}

/** Cursor-paginated list envelope: { data, next_cursor }. */
export function paginated(res, data, nextCursor = null) {
  return res.status(200).json({ data, next_cursor: nextCursor });
}

/** Encode/decode opaque pagination cursors (base64url of a JSON payload). */
export const cursor = {
  encode(payload) {
    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  },
  decode(value) {
    if (!value) return null;
    try {
      return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    } catch {
      return null;
    }
  },
};
