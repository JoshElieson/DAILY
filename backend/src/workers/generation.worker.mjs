// Generation worker (BACKEND-SCHEMA-API.md §11 worker 1).
// Two responsibilities per tick:
//   1. Pre-generation: for schedules due within the lead window, enqueue
//      generation of today..today+lead so a notification never fires without
//      ready content (NOTIFICATIONS.md "deep content buffer").
//   2. Drain: claim queued generation_jobs and run them through Claude.

import { schedulesRepo } from '../repositories/index.mjs';
import { generationJobsRepo } from '../repositories/index.mjs';
import { enqueueGeneration, runGenerationJob } from '../services/generation.service.mjs';
import { formatYmdInTz } from '../lib/time.mjs';
import { env } from '../config/env.mjs';
import { childLogger } from '../config/logger.mjs';

const log = childLogger('generation.worker');

async function pregenerateForDueSchedules() {
  const leadMs = env.GENERATION_LEAD_DAYS * 86400000;
  const horizon = new Date(Date.now() + leadMs).toISOString();
  const due = await schedulesRepo.due(horizon, 100);

  for (const schedule of due) {
    const tz = schedule.timezone || 'UTC';
    // Ensure content exists for today..today+lead-1.
    for (let d = 0; d < env.GENERATION_LEAD_DAYS; d++) {
      const date = formatYmdInTz(new Date(Date.now() + d * 86400000), tz);
      try {
        await enqueueGeneration({
          promptId: schedule.prompt_id,
          userId: schedule.user_id,
          forDate: date,
          variant: 0,
        });
      } catch (err) {
        log.warn({ err, scheduleId: schedule.id, date }, 'pre-gen enqueue failed');
      }
    }
  }
  return due.length;
}

async function drainQueue(max = 20) {
  let processed = 0;
  for (let i = 0; i < max; i++) {
    const job = await generationJobsRepo.claimNext();
    if (!job) break;
    try {
      await runGenerationJob(job);
    } catch (err) {
      log.error({ err, jobId: job.id }, 'generation job failed');
    }
    processed++;
  }
  return processed;
}

export async function generationTick() {
  const scheduled = await pregenerateForDueSchedules();
  const processed = await drainQueue();
  if (scheduled || processed) log.debug({ scheduled, processed }, 'generation tick');
  return { scheduled, processed };
}
