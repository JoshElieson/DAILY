// Generation orchestration: turns a (prompt, date, variant) request into a
// persisted content_entry by way of a generation_job and a Claude call. The
// synchronous MVP `/generate` is subsumed here — results are persisted, cost &
// tokens tracked, and the work runs idempotently so retries never double-charge.

import {
  promptsRepo,
  contentRepo,
  generationJobsRepo,
  entitlementsRepo,
} from '../repositories/index.mjs';
import { generateContent, resolveModel } from '../integrations/anthropic.mjs';
import { todayInTz } from '../lib/time.mjs';
import { childLogger } from '../config/logger.mjs';
import { notFound, conflict } from '../lib/errors.mjs';

const log = childLogger('generation.service');

const idempotencyKey = (promptId, forDate, variant) => `${promptId}:${forDate}:${variant}`;

/**
 * Enqueue a generation job for a prompt+date+variant (idempotent).
 * Returns the existing job if one already exists for the key.
 */
export async function enqueueGeneration({ promptId, userId, forDate, variant = 0 }) {
  const prompt = await promptsRepo.findOwned(promptId, userId);
  if (!prompt) throw notFound('Prompt not found');

  const date = forDate || todayInTz('UTC');
  const key = idempotencyKey(promptId, date, variant);

  const existing = await generationJobsRepo.findByIdempotencyKey(key);
  if (existing) return existing;

  // If the content already exists (primary), short-circuit with a ready job-like record.
  if (variant === 0) {
    const have = await contentRepo.findPrimary(promptId, date);
    if (have && have.status === 'ready') {
      return generationJobsRepo.create({
        prompt_id: promptId,
        user_id: userId,
        for_date: date,
        variant,
        idempotency_key: key,
        status: 'ready',
        result_content_id: have.id,
        completed_at: new Date(),
      });
    }
  }

  const job = await generationJobsRepo.create({
    prompt_id: promptId,
    user_id: userId,
    for_date: date,
    variant,
    idempotency_key: key,
    status: 'queued',
  });
  log.info({ jobId: job.id, promptId, date, variant }, 'generation job enqueued');
  return job;
}

/**
 * Execute a single generation job end-to-end: call Claude, persist the
 * content_entry, and link the job. Used by the generation worker and by the
 * synchronous generate-now path.
 * @returns {Promise<{ job, content }>}
 */
export async function runGenerationJob(job) {
  const prompt = await promptsRepo.findById(job.prompt_id);
  if (!prompt) {
    await generationJobsRepo.update(job.id, {
      status: 'failed',
      error: 'prompt missing',
      completed_at: new Date(),
    });
    throw notFound('Prompt not found');
  }

  const isPlus = await entitlementsRepo.hasDailyPlus(job.user_id);
  const model = resolveModel(prompt.model_pref, { isPlus });

  let result;
  try {
    result = await generateContent({
      type: prompt.type,
      intent: prompt.intent,
      date: job.for_date,
      tz: prompt.timezone ?? 'UTC',
      model,
    });
  } catch (err) {
    await generationJobsRepo.update(job.id, {
      status: 'failed',
      error: String(err.message ?? err).slice(0, 500),
      completed_at: new Date(),
    });
    throw err;
  }

  const status = result.refusal ? 'refusal' : 'ready';
  const content = await contentRepo.create({
    prompt_id: prompt.id,
    user_id: job.user_id,
    for_date: job.for_date,
    variant: job.variant,
    title: result.content.title ?? null,
    body: result.content.body,
    tone: result.content.tone ?? null,
    structured: result.content.structured ?? null,
    model: result.meta.model,
    status,
    input_tokens: result.meta.input_tokens,
    output_tokens: result.meta.output_tokens,
    cost_micros: result.meta.cost_micros,
    gen_latency_ms: result.meta.latency_ms,
    regenerated_from: job.regenerated_from ?? null,
  });

  await generationJobsRepo.update(job.id, {
    status,
    result_content_id: content.id,
    completed_at: new Date(),
  });

  log.info(
    { jobId: job.id, contentId: content.id, model: result.meta.model, cost_micros: result.meta.cost_micros, status },
    'generation complete',
  );
  return { job, content };
}

/**
 * Synchronous "generate today now" — enqueue + run inline. Used at prompt
 * creation so the first card is ready immediately (the MVP behavior).
 */
export async function generateNow({ promptId, userId, forDate, variant = 0, regeneratedFrom }) {
  const job = await enqueueGeneration({ promptId, userId, forDate, variant });
  if (job.status === 'ready' && job.result_content_id) {
    const content = await contentRepo.findById(job.result_content_id);
    return { job, content };
  }
  const claimed = await generationJobsRepo.update(job.id, {
    status: 'running',
    started_at: new Date(),
    attempts: (job.attempts ?? 0) + 1,
  });
  // regenerated_from is a content_entries column, not a job column — pass it as
  // an in-memory hint to runGenerationJob, which stamps it onto the content row.
  return runGenerationJob({ ...claimed, regenerated_from: regeneratedFrom ?? null });
}

/** Regenerate a day's content as a new variant ("give me another"). */
export async function regenerate({ contentId, userId }) {
  const source = await contentRepo.findOwned(contentId, userId);
  if (!source) throw notFound('Content not found');
  const nextVariant = (await contentRepo.maxVariant(source.prompt_id, source.for_date)) + 1;
  if (nextVariant < 1) throw conflict('Nothing to regenerate');
  return generateNow({
    promptId: source.prompt_id,
    userId,
    forDate: source.for_date,
    variant: nextVariant,
    regeneratedFrom: source.id,
  });
}
