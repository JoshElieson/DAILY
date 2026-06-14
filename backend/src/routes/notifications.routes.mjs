// Notifications history + client telemetry (BACKEND-SCHEMA-API.md §10.6).
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok } from '../lib/http.mjs';
import { validateBody, validateQuery } from '../middleware/validate.mjs';
import { requireAuth } from '../middleware/auth.mjs';
import { listForUser, recordEvents } from '../services/notification.service.mjs';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get(
  '/notifications',
  validateQuery(z.object({ limit: z.coerce.number().int().min(1).max(200).optional() })),
  asyncHandler(async (req, res) =>
    ok(res, { data: await listForUser(req.user.id, { limit: req.validatedQuery.limit }) }),
  ),
);

notificationsRouter.post(
  '/notifications/events',
  validateBody(
    z.object({
      events: z
        .array(
          z.object({
            id: z.string().min(1),
            type: z.enum(['delivered', 'opened', 'dismissed']),
            at: z.string().optional(),
          }),
        )
        .min(1),
    }),
  ),
  asyncHandler(async (req, res) => ok(res, await recordEvents(req.user.id, req.body.events))),
);
