// Analytics ingest (BACKEND-SCHEMA-API.md §10.8).
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok } from '../lib/http.mjs';
import { validateBody } from '../middleware/validate.mjs';
import { requireAuth } from '../middleware/auth.mjs';
import { ingest } from '../services/analytics.service.mjs';

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);

analyticsRouter.post(
  '/analytics/events',
  validateBody(
    z.object({
      device_id: z.string().optional(),
      events: z
        .array(
          z.object({
            event_name: z.string().min(1),
            session_id: z.string().optional(),
            properties: z.record(z.any()).optional(),
            app_version: z.string().optional(),
            platform: z.enum(['ios', 'android', 'web']).optional(),
            ts: z.string().optional(),
          }),
        )
        .max(500),
    }),
  ),
  asyncHandler(async (req, res) => ok(res, await ingest(req.user.id, req.body.device_id, req.body.events))),
);
