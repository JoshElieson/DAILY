// Notification tracking & delivery (BACKEND-SCHEMA-API.md §6, NOTIFICATIONS.md).
//
// The notification carries a generic teaser + a deep link; the AI content lives
// in content_entries and is read on tap (the load-bearing decoupling). This
// service creates scheduled rows, sends push for ready content, records the
// engagement funnel (sent → delivered → opened → dismissed), and exposes the
// client telemetry endpoint.

import {
  notificationsRepo,
  contentRepo,
  devicesRepo,
  promptsRepo,
} from '../repositories/index.mjs';
import { sendPush } from '../integrations/expoPush.mjs';
import { iso } from '../lib/time.mjs';
import { notFound } from '../lib/errors.mjs';
import { childLogger } from '../config/logger.mjs';

const log = childLogger('notification.service');

const TEASERS = {
  reflection: 'Your daily reflection is ready ✨',
  motivation: 'A little motivation for today 💪',
  habit: 'Your daily nudge is here',
  story: "Today's micro-story is ready 📖",
  journal: 'A journaling prompt awaits ✍️',
  learning: "Today's lesson is ready 🧠",
  custom: 'Your daily is ready',
};

export const teaserFor = (type) => TEASERS[type] ?? TEASERS.custom;

export async function listForUser(userId, { limit } = {}) {
  return notificationsRepo.listByUser(userId, { limit });
}

/**
 * Create a scheduled notification for a (schedule, fire-time). Idempotent on
 * (schedule_id, scheduled_for) so a re-scanned schedule never double-creates.
 */
export async function ensureScheduled({ schedule, prompt, scheduledFor, contentEntryId = null, channel = 'push' }) {
  const scheduledForIso = iso(scheduledFor);
  const existing = await notificationsRepo.existsForSchedule(schedule.id, scheduledForIso);
  if (existing) return null;

  return notificationsRepo.create({
    user_id: schedule.user_id,
    prompt_id: prompt.id,
    schedule_id: schedule.id,
    content_entry_id: contentEntryId,
    channel,
    status: 'scheduled',
    scheduled_for: scheduledForIso,
  });
}

/**
 * Deliver a scheduled notification: attach ready content, send push to the
 * user's push-enabled devices, and advance status. Returns the updated row.
 */
export async function deliver(notification) {
  const prompt = await promptsRepo.findById(notification.prompt_id);
  if (!prompt) {
    return notificationsRepo.markStatus(notification.id, 'canceled', { error: 'prompt missing' });
  }

  // Attach today's content if not already linked.
  let contentEntryId = notification.content_entry_id;
  if (!contentEntryId) {
    const forDate = new Date(notification.scheduled_for).toISOString().slice(0, 10);
    const content = await contentRepo.findPrimary(prompt.id, forDate);
    contentEntryId = content?.id ?? null;
  }

  const devices = await devicesRepo.pushTargets(notification.user_id);
  if (!devices.length) {
    // No push targets — local-only user. Mark sent (the local OS fired it).
    return notificationsRepo.markStatus(notification.id, 'sent', {
      content_entry_id: contentEntryId,
      sent_at: new Date(),
      channel: 'local',
    });
  }

  const messages = devices.map((d) => ({
    to: d.expo_push_token,
    title: teaserFor(prompt.type),
    body: teaserFor(prompt.type),
    data: { promptId: prompt.id, contentId: contentEntryId, deeplink: `daily://item/${prompt.id}` },
  }));

  const tickets = await sendPush(messages);
  const firstOk = tickets.find((t) => t.status === 'ok');
  const failed = tickets.every((t) => t.status !== 'ok');

  const updated = await notificationsRepo.markStatus(
    notification.id,
    failed ? 'failed' : 'sent',
    {
      content_entry_id: contentEntryId,
      provider_message_id: firstOk?.id ?? null,
      sent_at: new Date(),
      error: failed ? tickets[0]?.message ?? 'push failed' : null,
    },
  );
  log.info({ notificationId: notification.id, devices: devices.length, failed }, 'notification delivered');
  return updated;
}

/**
 * Record client-reported engagement events (delivered/opened/dismissed).
 * `events` = [{ id, type, at }]. The funnel timestamps power retention metrics.
 */
export async function recordEvents(userId, events) {
  const results = [];
  for (const e of events) {
    const notif = await notificationsRepo.findOwned(e.id, userId);
    if (!notif) continue;
    const patch = {};
    const at = e.at ? new Date(e.at) : new Date();
    if (e.type === 'delivered') {
      patch.status = 'delivered';
      patch.delivered_at = at;
    } else if (e.type === 'opened') {
      patch.status = 'opened';
      patch.opened_at = at;
    } else if (e.type === 'dismissed') {
      patch.status = 'dismissed';
      patch.dismissed_at = at;
    } else {
      continue;
    }
    results.push(await notificationsRepo.update(e.id, patch));
  }
  return { updated: results.length };
}

export async function getNotification(id, userId) {
  const n = await notificationsRepo.findOwned(id, userId);
  if (!n) throw notFound('Notification not found');
  return n;
}
