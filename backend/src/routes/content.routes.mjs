// Content read + regenerate (BACKEND-SCHEMA-API.md §10.5).
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok } from '../lib/http.mjs';
import { validateBody } from '../middleware/validate.mjs';
import { requireAuth } from '../middleware/auth.mjs';
import { generateLimiter } from '../middleware/rateLimit.mjs';
import * as content from '../services/content.service.mjs';
import { track } from '../services/analytics.service.mjs';

export const contentRouter = Router();
contentRouter.use(requireAuth);

// Home payload — all of today's content across the user's prompts.
contentRouter.get(
  '/content/today',
  asyncHandler(async (req, res) => ok(res, await content.todayForUser(req.user))),
);

contentRouter.get(
  '/content/:id',
  asyncHandler(async (req, res) => {
    const entry = await content.getContent(req.params.id, req.user.id);
    track('content_viewed', { userId: req.user.id, properties: { content_id: entry.id } });
    ok(res, entry);
  }),
);

contentRouter.delete(
  '/content/:id',
  asyncHandler(async (req, res) => ok(res, await content.softDelete(req.params.id, req.user.id))),
);

contentRouter.post(
  '/content/:id/regenerate',
  generateLimiter,
  validateBody(z.object({}).optional()),
  asyncHandler(async (req, res) => {
    const result = await content.regenerate(req.params.id, req.user);
    track('content_regenerated', { userId: req.user.id });
    ok(res, { job: result.job, content: result.content }, 201);
  }),
);
