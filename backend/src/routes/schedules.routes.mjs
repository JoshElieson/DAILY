// Top-level schedule mutation (BACKEND-SCHEMA-API.md §10.4).
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok } from '../lib/http.mjs';
import { validateBody } from '../middleware/validate.mjs';
import { requireAuth } from '../middleware/auth.mjs';
import { updateSchedule, deleteSchedule } from '../services/schedule.service.mjs';

export const schedulesRouter = Router();
schedulesRouter.use(requireAuth);

schedulesRouter.patch(
  '/schedules/:id',
  validateBody(
    z.object({
      frequency: z.enum(['daily', 'weekdays', 'weekends', 'weekly', 'custom_days', 'multiple_daily']).optional(),
      time_of_day: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
      timezone: z.string().optional(),
      days_of_week: z.number().int().min(0).max(127).optional(),
      start_date: z.string().nullable().optional(),
      end_date: z.string().nullable().optional(),
      enabled: z.boolean().optional(),
    }),
  ),
  asyncHandler(async (req, res) => ok(res, await updateSchedule(req.params.id, req.user.id, req.body))),
);

schedulesRouter.delete(
  '/schedules/:id',
  asyncHandler(async (req, res) => ok(res, await deleteSchedule(req.params.id, req.user.id))),
);
