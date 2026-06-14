// Admin/ops endpoints (BACKEND-SCHEMA-API.md §10.10). Guarded by requireAdmin.
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok } from '../lib/http.mjs';
import { validateQuery } from '../middleware/validate.mjs';
import { requireAuth, requireAdmin } from '../middleware/auth.mjs';
import { metricsForDay, rollupDay } from '../services/analytics.service.mjs';
import { todayInTz } from '../lib/time.mjs';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get(
  '/admin/metrics',
  validateQuery(z.object({ day: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const day = req.validatedQuery.day || todayInTz('UTC');
    ok(res, { day, metrics: await metricsForDay(day) });
  }),
);

// Trigger a rollup recompute on demand (also runs nightly via the worker).
adminRouter.post(
  '/admin/metrics/rollup',
  validateQuery(z.object({ day: z.string().optional() })),
  asyncHandler(async (req, res) => ok(res, await rollupDay(req.validatedQuery.day || undefined))),
);
