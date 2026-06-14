// Expo push delivery. Real mode posts to Expo's push service; mock mode (no
// EXPO_ACCESS_TOKEN) returns synthetic tickets/receipts so the notification
// worker's send → ticket → receipt flow is fully exercisable offline.
//
// The MVP fires LOCAL notifications on-device (NOTIFICATIONS.md) — server push
// is the Phase-4 augment. This module is the seam for that augment.

import { env } from '../config/env.mjs';
import { childLogger } from '../config/logger.mjs';
import { uuidv7 } from '../lib/uuid.mjs';

const log = childLogger('expo-push');
const EXPO_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

/**
 * Send a batch of push messages.
 * @param {Array<{to, title, body, data}>} messages
 * @returns {Promise<Array<{status, id?, message?}>>} one ticket per message
 */
export async function sendPush(messages) {
  if (!messages.length) return [];

  if (env.flags.usingMockExpoPush) {
    log.debug({ count: messages.length }, 'EXPO_ACCESS_TOKEN unset — mock push send');
    return messages.map(() => ({ status: 'ok', id: `mock-ticket-${uuidv7()}` }));
  }

  try {
    const res = await fetch(EXPO_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(messages),
    });
    const json = await res.json();
    return json.data ?? [];
  } catch (err) {
    log.error({ err }, 'expo push send failed');
    return messages.map(() => ({ status: 'error', message: String(err.message ?? err) }));
  }
}

/** Poll receipts for delivered tickets. Mock returns 'ok' for all. */
export async function getReceipts(ticketIds) {
  if (!ticketIds.length) return {};
  if (env.flags.usingMockExpoPush) {
    return Object.fromEntries(ticketIds.map((id) => [id, { status: 'ok' }]));
  }
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ ids: ticketIds }),
    });
    const json = await res.json();
    return json.data ?? {};
  } catch (err) {
    log.error({ err }, 'expo receipt poll failed');
    return {};
  }
}
