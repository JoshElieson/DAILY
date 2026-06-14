// Prompt lifecycle: create (with free-tier gating), edit, pause/resume, delete,
// reorder, and template-seeded creation. Creating a prompt also creates its
// default daily schedule and kicks off generation of today's content.

import {
  promptsRepo,
  templatesRepo,
  schedulesRepo,
  notificationsRepo,
  entitlementsRepo,
} from '../repositories/index.mjs';
import { createSchedule } from './schedule.service.mjs';
import { generateNow } from './generation.service.mjs';
import { todayInTz } from '../lib/time.mjs';
import { env } from '../config/env.mjs';
import { notFound, paymentRequired, badRequest } from '../lib/errors.mjs';
import { childLogger } from '../config/logger.mjs';

const log = childLogger('prompt.service');

const CONTENT_TYPES = ['reflection', 'motivation', 'habit', 'story', 'journal', 'learning', 'custom'];

async function enforceFreeTierLimit(user) {
  const isPlus = await entitlementsRepo.hasDailyPlus(user.id);
  if (isPlus) return;
  const count = await promptsRepo.countActive(user.id);
  if (count >= env.FREE_PROMPT_LIMIT) {
    throw paymentRequired(
      `Free plan is limited to ${env.FREE_PROMPT_LIMIT} active prompts. Upgrade to Daily Plus for unlimited.`,
      { limit: env.FREE_PROMPT_LIMIT, current: count },
    );
  }
}

export async function listPrompts(userId, { status } = {}) {
  const prompts = await promptsRepo.listByUser(userId, { status });
  // Attach each prompt's primary (earliest-of-day) schedule so clients can
  // render the reminder time/cadence without an N+1 fetch.
  const schedules = await schedulesRepo.listByPromptIds(prompts.map((p) => p.id));
  const primaryByPrompt = new Map();
  for (const s of schedules) {
    if (!primaryByPrompt.has(s.prompt_id)) primaryByPrompt.set(s.prompt_id, s);
  }
  return prompts.map((p) => {
    const s = primaryByPrompt.get(p.id) ?? null;
    return {
      ...p,
      schedule: s
        ? { id: s.id, time_of_day: s.time_of_day, frequency: s.frequency, timezone: s.timezone, enabled: s.enabled }
        : null,
    };
  });
}

export async function getPrompt(promptId, userId) {
  const prompt = await promptsRepo.findOwned(promptId, userId);
  if (!prompt) throw notFound('Prompt not found');
  const schedules = await schedulesRepo.listByPrompt(promptId);
  return { prompt, schedules };
}

/** Create a prompt + default schedule, then generate today's content inline. */
export async function createPrompt(user, input) {
  if (!CONTENT_TYPES.includes(input.type)) throw badRequest(`Invalid type: ${input.type}`);
  if (!input.intent || !String(input.intent).trim()) throw badRequest('intent is required');
  await enforceFreeTierLimit(user);

  const prompt = await promptsRepo.create({
    user_id: user.id,
    template_id: input.template_id ?? null,
    type: input.type,
    intent: String(input.intent).slice(0, env.GENERATION_INTENT_MAX_CHARS),
    title: input.title ?? null,
    tone: input.tone ?? null,
    status: 'active',
    model_pref: input.model_pref ?? 'auto',
    position: input.position ?? 0,
  });

  // Default daily schedule (mirrors PLANNING §0 default 08:00 daily).
  await createSchedule(prompt.id, user.id, {
    frequency: input.frequency ?? 'daily',
    time_of_day: input.time_of_day ?? '08:00',
    timezone: input.timezone ?? user.timezone ?? 'UTC',
  });

  // Generate today's content now so the first card is instantly available.
  let content = null;
  try {
    const result = await generateNow({
      promptId: prompt.id,
      userId: user.id,
      // Generate for the user's local "today" so it matches GET /content/today.
      forDate: todayInTz(input.timezone ?? user.timezone ?? 'UTC'),
    });
    content = result.content;
  } catch (err) {
    log.warn({ err, promptId: prompt.id }, 'initial generation failed; will retry via worker');
  }

  log.info({ promptId: prompt.id, userId: user.id }, 'prompt created');
  return { prompt, content };
}

export async function createFromTemplate(user, slug, overrides = {}) {
  const template = await templatesRepo.findBySlug(slug);
  if (!template) throw notFound('Template not found');
  await templatesRepo.incrementUsage(template.id);
  return createPrompt(user, {
    type: overrides.type ?? template.type,
    intent: overrides.intent ?? template.intent_seed ?? template.title,
    title: overrides.title ?? template.title,
    template_id: template.id,
    ...overrides,
  });
}

export async function updatePrompt(promptId, userId, patch) {
  const prompt = await promptsRepo.findOwned(promptId, userId);
  if (!prompt) throw notFound('Prompt not found');
  if (patch.type && !CONTENT_TYPES.includes(patch.type)) throw badRequest(`Invalid type: ${patch.type}`);

  const allowed = {};
  for (const k of ['type', 'intent', 'title', 'tone', 'model_pref', 'position']) {
    if (patch[k] !== undefined) allowed[k] = patch[k];
  }
  if (allowed.intent) allowed.intent = String(allowed.intent).slice(0, env.GENERATION_INTENT_MAX_CHARS);
  return promptsRepo.update(promptId, allowed);
}

export async function deletePrompt(promptId, userId) {
  const prompt = await promptsRepo.findOwned(promptId, userId);
  if (!prompt) throw notFound('Prompt not found');
  await promptsRepo.softDelete(promptId);
  await schedulesRepo.setEnabledForPrompt(promptId, false);
  await notificationsRepo.cancelScheduledForPrompt(promptId);
  log.info({ promptId }, 'prompt soft-deleted');
  return { ok: true };
}

export async function setStatus(promptId, userId, status) {
  const prompt = await promptsRepo.findOwned(promptId, userId);
  if (!prompt) throw notFound('Prompt not found');
  await promptsRepo.setStatus(promptId, status);
  const enabled = status === 'active';
  await schedulesRepo.setEnabledForPrompt(promptId, enabled);
  if (!enabled) await notificationsRepo.cancelScheduledForPrompt(promptId);
  return promptsRepo.findById(promptId);
}

export async function reorder(promptId, userId, position) {
  const prompt = await promptsRepo.findOwned(promptId, userId);
  if (!prompt) throw notFound('Prompt not found');
  return promptsRepo.update(promptId, { position });
}
