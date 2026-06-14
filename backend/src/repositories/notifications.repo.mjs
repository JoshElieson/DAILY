// notifications data access (Notification cluster).
import { insertRow, updateById, findById, query, queryOne } from './_helpers.mjs';

export const notificationsRepo = {
  findById: (id) => findById('notifications', id),

  findOwned: (id, userId) =>
    queryOne('SELECT * FROM notifications WHERE id = $1 AND user_id = $2', [id, userId]),

  listByUser: (userId, { limit = 50 } = {}) =>
    query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit],
    ).then((r) => r.rows),

  create: (row) => insertRow('notifications', row),

  update: (id, patch) => updateById('notifications', id, patch),

  /** Scheduled notifications whose fire time has arrived (worker scan). */
  due: (beforeIso, limit = 200) =>
    query(
      `SELECT * FROM notifications
       WHERE status = 'scheduled' AND scheduled_for <= $1
       ORDER BY scheduled_for ASC LIMIT $2`,
      [beforeIso, limit],
    ).then((r) => r.rows),

  /** Cancel future scheduled rows for a prompt (on edit/pause/delete). */
  cancelScheduledForPrompt: (promptId) =>
    query(
      `UPDATE notifications SET status = 'canceled', updated_at = now()
       WHERE prompt_id = $1 AND status = 'scheduled'`,
      [promptId],
    ),

  /** Idempotency: has a notification already been created for this fire? */
  existsForSchedule: (scheduleId, scheduledForIso) =>
    queryOne(
      'SELECT id FROM notifications WHERE schedule_id = $1 AND scheduled_for = $2',
      [scheduleId, scheduledForIso],
    ),

  markStatus: (id, status, extra = {}) =>
    updateById('notifications', id, { status, ...extra }),
};
