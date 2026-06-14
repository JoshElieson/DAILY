// Mounts all /v1 routers + the unversioned /healthz. Order: health (no auth),
// then the versioned API surface.
import { Router } from 'express';
import { healthRouter } from './health.routes.mjs';
import { authRouter } from './auth.routes.mjs';
import { devicesRouter } from './devices.routes.mjs';
import { promptsRouter } from './prompts.routes.mjs';
import { schedulesRouter } from './schedules.routes.mjs';
import { contentRouter } from './content.routes.mjs';
import { notificationsRouter } from './notifications.routes.mjs';
import { subscriptionsRouter } from './subscriptions.routes.mjs';
import { analyticsRouter } from './analytics.routes.mjs';
import { webhooksRouter } from './webhooks.routes.mjs';
import { adminRouter } from './admin.routes.mjs';
import { defaultLimiter } from '../middleware/rateLimit.mjs';

export function buildRoutes() {
  const root = Router();

  // Liveness — unversioned, no rate limit, no auth.
  root.use('/', healthRouter);

  // Versioned API. Default per-identity rate limit across the surface.
  const v1 = Router();
  v1.use(defaultLimiter);

  // Public routers FIRST. Routers below apply `requireAuth` at the router level;
  // because every router is mounted at '/', that middleware runs for any request
  // that reaches the router — so the unauthenticated webhook + auth bootstrap
  // routes must be matched before those routers are reached.
  v1.use('/', authRouter); // /auth/* public; /me/* guarded per-route
  v1.use('/', webhooksRouter); // S2S, verified by signature, no user auth

  // Authenticated routers.
  v1.use('/', devicesRouter);
  v1.use('/', promptsRouter);
  v1.use('/', schedulesRouter);
  v1.use('/', contentRouter);
  v1.use('/', notificationsRouter);
  v1.use('/', subscriptionsRouter);
  v1.use('/', analyticsRouter);
  v1.use('/', adminRouter);

  root.use('/v1', v1);
  return root;
}
