// Express app assembly: security middleware (helmet, CORS), JSON parsing,
// request logging, routes, and the central error handler. Kept separate from
// index.mjs (the process entrypoint) so the app can be imported by tests.

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.mjs';
import { httpLogger } from './middleware/requestContext.mjs';
import { buildRoutes } from './routes/index.mjs';
import { notFoundHandler, errorHandler } from './middleware/error.mjs';

export function createApp() {
  const app = express();

  // Behind a proxy (Fly/Render) — trust X-Forwarded-* for correct client IPs
  // (rate limiting keys on req.ip).
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      origin: env.ALLOWED_ORIGIN === '*' ? true : env.ALLOWED_ORIGIN.split(',').map((s) => s.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '256kb' }));
  app.use(httpLogger);

  app.use(buildRoutes());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
