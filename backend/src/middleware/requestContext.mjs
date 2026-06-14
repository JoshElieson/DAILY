// Request-scoped context: assigns a request id, wires pino-http for per-request
// logging, and (on real Postgres) sets `app.user_id` so Row-Level Security
// policies (production-extras.sql) scope every query to the authenticated user.

import pinoHttp from 'pino-http';
import { randomUUID } from 'node:crypto';
import { logger } from '../config/logger.mjs';

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const id = req.headers['x-request-id'] || randomUUID();
    res.setHeader('x-request-id', id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  // Avoid logging noisy health checks at info level.
  autoLogging: { ignore: (req) => req.url === '/healthz' },
});
