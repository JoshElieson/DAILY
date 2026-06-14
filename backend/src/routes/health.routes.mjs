// Liveness/readiness. Extends forge's /healthz with subsystem status
// (BACKEND-SCHEMA-API.md §10.10).
import { Router } from 'express';
import { pingDb } from '../db/pool.mjs';
import { env, capabilitySummary } from '../config/env.mjs';
import { asyncHandler } from '../lib/http.mjs';

export const healthRouter = Router();

healthRouter.get(
  '/healthz',
  asyncHandler(async (_req, res) => {
    const db = await pingDb();
    const body = {
      status: db ? 'ok' : 'degraded',
      uptime_s: Math.round(process.uptime()),
      subsystems: {
        db: db ? 'up' : 'down',
        anthropic: env.flags.usingMockAnthropic ? 'mock' : 'configured',
        expo_push: env.flags.usingMockExpoPush ? 'mock' : 'configured',
        queue: env.WORKERS_ENABLED ? 'enabled' : 'disabled',
      },
      capabilities: capabilitySummary(),
    };
    res.status(db ? 200 : 503).json(body);
  }),
);
