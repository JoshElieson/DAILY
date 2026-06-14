// Schedule lifecycle: create/update/delete cadences and keep `next_run_at`
// (the scheduler heartbeat, BACKEND-SCHEMA-API.md §4) correct. Editing a
// schedule cancels future notifications for its prompt — the workers recreate
// them on the next tick (NOTIFICATIONS.md §5 reschedule semantics).

import { schedulesRepo, promptsRepo, notificationsRepo } from '../repositories/index.mjs';
import { computeNextRunAt } from '../lib/time.mjs';
import { notFound, badRequest } from '../lib/errors.mjs';
import { childLogger } from '../config/logger.mjs';

const log = childLogger('schedule.service');

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function validate({ time_of_day, frequency, days_of_week }) {
  if (time_of_day !== undefined && !HHMM.test(time_of_day))
    throw badRequest('time_of_day must be HH:MM (24h)');
  if (
    (frequency === 'custom_days' || frequency === 'weekly') &&
    days_of_week !== undefined &&
    (days_of_week < 0 || days_of_week > 127)
  )
    throw badRequest('days_of_week must be a 7-bit mask (0..127)');
}

function withNextRun(schedule) {
  const next = schedule.enabled ? computeNextRunAt(schedule) : null;
  return { ...schedule, next_run_at: next };
}

export async function listSchedules(promptId, userId) {
  const prompt = await promptsRepo.findOwned(promptId, userId);
  if (!prompt) throw notFound('Prompt not found');
  return schedulesRepo.listByPrompt(promptId);
}

export async function createSchedule(promptId, userId, input) {
  const prompt = await promptsRepo.findOwned(promptId, userId);
  if (!prompt) throw notFound('Prompt not found');
  validate(input);

  const draft = {
    prompt_id: promptId,
    user_id: userId,
    frequency: input.frequency ?? 'daily',
    time_of_day: input.time_of_day ?? '08:00',
    timezone: input.timezone ?? prompt.timezone ?? 'UTC',
    days_of_week: input.days_of_week ?? 127,
    start_date: input.start_date ?? null,
    end_date: input.end_date ?? null,
    enabled: input.enabled ?? true,
  };
  const created = await schedulesRepo.create(withNextRun(draft));
  log.info({ scheduleId: created.id, promptId, next_run_at: created.next_run_at }, 'schedule created');
  return created;
}

export async function updateSchedule(scheduleId, userId, patch) {
  const existing = await schedulesRepo.findOwned(scheduleId, userId);
  if (!existing) throw notFound('Schedule not found');
  validate(patch);

  const merged = { ...existing, ...patch };
  const updated = await schedulesRepo.update(scheduleId, {
    ...patch,
    next_run_at: merged.enabled === false ? null : computeNextRunAt(merged),
  });
  // Time/cadence changed → drop pending notifications; workers recreate them.
  await notificationsRepo.cancelScheduledForPrompt(existing.prompt_id);
  log.info({ scheduleId, next_run_at: updated.next_run_at }, 'schedule updated');
  return updated;
}

export async function deleteSchedule(scheduleId, userId) {
  const existing = await schedulesRepo.findOwned(scheduleId, userId);
  if (!existing) throw notFound('Schedule not found');
  await schedulesRepo.remove(scheduleId);
  await notificationsRepo.cancelScheduledForPrompt(existing.prompt_id);
  return { ok: true };
}

/** Recompute next_run_at after a fire (called by the scheduler worker). */
export async function advanceSchedule(schedule) {
  const next = computeNextRunAt(schedule, new Date());
  return schedulesRepo.update(schedule.id, { next_run_at: next });
}
