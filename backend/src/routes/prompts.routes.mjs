// Prompts, templates, schedules, content & generation under a prompt
// (BACKEND-SCHEMA-API.md §10.3–10.5).
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok } from '../lib/http.mjs';
import { validateBody, validateQuery } from '../middleware/validate.mjs';
import { requireAuth } from '../middleware/auth.mjs';
import { generateLimiter } from '../middleware/rateLimit.mjs';
import * as prompts from '../services/prompt.service.mjs';
import * as schedules from '../services/schedule.service.mjs';
import * as content from '../services/content.service.mjs';
import { enqueueGeneration, generateNow } from '../services/generation.service.mjs';
import { templatesRepo, generationJobsRepo } from '../repositories/index.mjs';
import { track } from '../services/analytics.service.mjs';
import { notFound } from '../lib/errors.mjs';

export const promptsRouter = Router();

const CONTENT_TYPE = z.enum(['reflection', 'motivation', 'habit', 'story', 'journal', 'learning', 'custom']);
const HHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM');
const FREQ = z.enum(['daily', 'weekdays', 'weekends', 'weekly', 'custom_days', 'multiple_daily']);

// ── Templates (no auth needed for the public catalog, but we require identity) ─
promptsRouter.get(
  '/templates',
  requireAuth,
  validateQuery(z.object({ type: CONTENT_TYPE.optional(), sort: z.enum(['popular', 'recent']).optional() })),
  asyncHandler(async (req, res) => ok(res, { data: await templatesRepo.list(req.validatedQuery) })),
);

promptsRouter.get(
  '/templates/:slug',
  requireAuth,
  asyncHandler(async (req, res) => {
    const t = await templatesRepo.findBySlug(req.params.slug);
    if (!t) throw notFound('Template not found');
    ok(res, t);
  }),
);

// All prompt routes require auth.
promptsRouter.use(requireAuth);

promptsRouter.get(
  '/prompts',
  validateQuery(z.object({ status: z.enum(['active', 'paused', 'archived']).optional() })),
  asyncHandler(async (req, res) => ok(res, { data: await prompts.listPrompts(req.user.id, req.validatedQuery) })),
);

const createPromptSchema = z.object({
  type: CONTENT_TYPE,
  intent: z.string().min(1).max(2000),
  title: z.string().max(200).optional(),
  tone: z.string().max(60).optional(),
  model_pref: z.enum(['auto', 'haiku', 'sonnet']).optional(),
  frequency: FREQ.optional(),
  time_of_day: HHMM.optional(),
  timezone: z.string().optional(),
  position: z.number().int().optional(),
});

promptsRouter.post(
  '/prompts',
  validateBody(createPromptSchema),
  asyncHandler(async (req, res) => {
    const result = await prompts.createPrompt(req.user, req.body);
    track('prompt_created', { userId: req.user.id, properties: { type: req.body.type } });
    ok(res, result, 201);
  }),
);

promptsRouter.post(
  '/prompts/from-template/:slug',
  validateBody(createPromptSchema.partial()),
  asyncHandler(async (req, res) => {
    const result = await prompts.createFromTemplate(req.user, req.params.slug, req.body);
    track('prompt_created', { userId: req.user.id, properties: { from_template: req.params.slug } });
    ok(res, result, 201);
  }),
);

promptsRouter.get(
  '/prompts/:id',
  asyncHandler(async (req, res) => {
    const { prompt, schedules: sched } = await prompts.getPrompt(req.params.id, req.user.id);
    const today = await content.history(req.params.id, req.user.id, {}).then((h) => h[0] ?? null);
    ok(res, { prompt, schedules: sched, latest_content: today });
  }),
);

promptsRouter.patch(
  '/prompts/:id',
  validateBody(
    z.object({
      type: CONTENT_TYPE.optional(),
      intent: z.string().min(1).max(2000).optional(),
      title: z.string().max(200).nullable().optional(),
      tone: z.string().max(60).nullable().optional(),
      model_pref: z.enum(['auto', 'haiku', 'sonnet']).optional(),
      position: z.number().int().optional(),
    }),
  ),
  asyncHandler(async (req, res) => ok(res, await prompts.updatePrompt(req.params.id, req.user.id, req.body))),
);

promptsRouter.delete(
  '/prompts/:id',
  asyncHandler(async (req, res) => ok(res, await prompts.deletePrompt(req.params.id, req.user.id))),
);

promptsRouter.post(
  '/prompts/:id/pause',
  asyncHandler(async (req, res) => ok(res, await prompts.setStatus(req.params.id, req.user.id, 'paused'))),
);
promptsRouter.post(
  '/prompts/:id/resume',
  asyncHandler(async (req, res) => ok(res, await prompts.setStatus(req.params.id, req.user.id, 'active'))),
);
promptsRouter.post(
  '/prompts/:id/reorder',
  validateBody(z.object({ position: z.number().int() })),
  asyncHandler(async (req, res) => ok(res, await prompts.reorder(req.params.id, req.user.id, req.body.position))),
);

// ── Schedules under a prompt ──────────────────────────────────────────────────
promptsRouter.get(
  '/prompts/:id/schedules',
  asyncHandler(async (req, res) => ok(res, { data: await schedules.listSchedules(req.params.id, req.user.id) })),
);

promptsRouter.post(
  '/prompts/:id/schedules',
  validateBody(
    z.object({
      frequency: FREQ,
      time_of_day: HHMM,
      timezone: z.string().optional(),
      days_of_week: z.number().int().min(0).max(127).optional(),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
      enabled: z.boolean().optional(),
    }),
  ),
  asyncHandler(async (req, res) => ok(res, await schedules.createSchedule(req.params.id, req.user.id, req.body), 201)),
);

// ── Content & generation under a prompt ──────────────────────────────────────
promptsRouter.get(
  '/prompts/:id/content',
  validateQuery(z.object({ from: z.string().optional(), to: z.string().optional() })),
  asyncHandler(async (req, res) =>
    ok(res, { data: await content.history(req.params.id, req.user.id, req.validatedQuery) }),
  ),
);

promptsRouter.post(
  '/prompts/:id/generate',
  generateLimiter,
  validateBody(z.object({ for_date: z.string().optional(), sync: z.boolean().optional() })),
  asyncHandler(async (req, res) => {
    if (req.body.sync) {
      const result = await generateNow({
        promptId: req.params.id,
        userId: req.user.id,
        forDate: req.body.for_date,
      });
      return ok(res, { job: result.job, content: result.content }, 201);
    }
    const job = await enqueueGeneration({
      promptId: req.params.id,
      userId: req.user.id,
      forDate: req.body.for_date,
    });
    ok(res, { job }, 202);
  }),
);

// ── Generation jobs ──────────────────────────────────────────────────────────
promptsRouter.get(
  '/jobs/:id',
  asyncHandler(async (req, res) => {
    const job = await generationJobsRepo.findOwned(req.params.id, req.user.id);
    if (!job) throw notFound('Job not found');
    ok(res, job);
  }),
);
