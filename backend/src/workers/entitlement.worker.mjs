// Entitlement reconciler (BACKEND-SCHEMA-API.md §11 worker 3).
// Drains unprocessed subscription_events into the user_entitlements gating
// cache. The webhook handler applies events inline on the happy path; this
// worker is the retry/backfill safety net for any that failed there.

import { subscriptionEventsRepo } from '../repositories/index.mjs';
import { applyEvent } from '../services/subscription.service.mjs';
import { normalizeEvent } from '../integrations/revenuecat.mjs';
import { childLogger } from '../config/logger.mjs';

const log = childLogger('entitlement.worker');

export async function entitlementTick() {
  const pending = await subscriptionEventsRepo.unprocessed(100);
  let reconciled = 0;
  for (const event of pending) {
    try {
      const normalized = normalizeEvent(event.raw);
      await applyEvent(normalized);
      await subscriptionEventsRepo.markProcessed(event.id);
      reconciled++;
    } catch (err) {
      log.warn({ err, eventId: event.id }, 'reconcile retry failed');
    }
  }
  if (reconciled) log.debug({ reconciled }, 'entitlement tick');
  return { reconciled };
}
