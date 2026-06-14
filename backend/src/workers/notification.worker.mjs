// Notification worker (BACKEND-SCHEMA-API.md §11 worker 2).
// Per tick:
//   1. Materialize: for schedules whose next_run_at has arrived, create a
//      scheduled notification (idempotent) and advance next_run_at to the next
//      occurrence — never mutate a row that already fired.
//   2. Deliver: send due scheduled notifications (push for push-enabled
//      devices; mark sent for local-only users).

import { schedulesRepo, notificationsRepo, promptsRepo } from '../repositories/index.mjs';
import { ensureScheduled, deliver } from '../services/notification.service.mjs';
import { advanceSchedule } from '../services/schedule.service.mjs';
import { childLogger } from '../config/logger.mjs';

const log = childLogger('notification.worker');

async function materializeDueSchedules() {
  const now = new Date().toISOString();
  const due = await schedulesRepo.due(now, 100);
  let created = 0;

  for (const schedule of due) {
    const prompt = await promptsRepo.findById(schedule.prompt_id);
    if (!prompt) continue;
    try {
      const row = await ensureScheduled({
        schedule,
        prompt,
        scheduledFor: schedule.next_run_at,
      });
      if (row) created++;
    } catch (err) {
      log.warn({ err, scheduleId: schedule.id }, 'failed to materialize notification');
    }
    // Advance to the next occurrence so we don't re-fire this slot.
    await advanceSchedule(schedule);
  }
  return created;
}

async function deliverDue(max = 50) {
  const now = new Date().toISOString();
  const due = await notificationsRepo.due(now, max);
  let delivered = 0;
  for (const notification of due) {
    try {
      await deliver(notification);
      delivered++;
    } catch (err) {
      log.error({ err, notificationId: notification.id }, 'delivery failed');
      await notificationsRepo.markStatus(notification.id, 'failed', {
        error: String(err.message ?? err).slice(0, 300),
      });
    }
  }
  return delivered;
}

export async function notificationTick() {
  const created = await materializeDueSchedules();
  const delivered = await deliverDue();
  if (created || delivered) log.debug({ created, delivered }, 'notification tick');
  return { created, delivered };
}
