// Subscriptions & entitlements (BACKEND-SCHEMA-API.md §7). The store
// (App Store/Play via RevenueCat) is the source of truth; the DB MIRRORS
// entitlement state for fast gating. Webhook events are recorded idempotently
// and drained by the entitlement reconciler into the user_entitlements cache.

import {
  subscriptionsRepo,
  entitlementsRepo,
  subscriptionEventsRepo,
  usersRepo,
} from '../repositories/index.mjs';
import { normalizeEvent } from '../integrations/revenuecat.mjs';
import { childLogger } from '../config/logger.mjs';

const log = childLogger('subscription.service');

/** Current subscription + entitlements for the gating UI (GET /v1/subscription). */
export async function getSubscriptionState(userId) {
  const [subscriptions, entitlements] = await Promise.all([
    subscriptionsRepo.listByUser(userId),
    entitlementsRepo.listByUser(userId),
  ]);
  const dailyPlus = await entitlementsRepo.hasDailyPlus(userId);
  return { subscriptions, entitlements, daily_plus: dailyPlus };
}

/**
 * Record a webhook event idempotently. Returns { duplicate } so the route can
 * 200 fast on retries without reprocessing. Reconciliation happens in the
 * worker (or inline for low volume).
 */
export async function recordWebhookEvent(body) {
  const ev = normalizeEvent(body);
  const { event, duplicate } = await subscriptionEventsRepo.record({
    user_id: null, // resolved during reconciliation via app_user_id
    provider: ev.provider,
    event_type: ev.event_type,
    store_event_id: ev.store_event_id,
    raw: ev.raw,
    event_at: ev.event_at_ms ? new Date(Number(ev.event_at_ms)) : null,
  });
  return { event, duplicate, normalized: ev };
}

/**
 * Apply one normalized event to subscriptions + entitlements. Idempotent at the
 * entitlement-cache level (single upsert per user+key).
 */
export async function applyEvent(normalized) {
  const userId = await resolveUserId(normalized.app_user_id);
  if (!userId) {
    log.warn({ appUserId: normalized.app_user_id }, 'webhook event has no matching user');
    return null;
  }

  const status = normalized.revokesEntitlement
    ? 'expired'
    : normalized.is_trial
      ? 'trialing'
      : 'active';

  const subscription = await subscriptionsRepo.upsertByOriginalTxn(userId, {
    provider: normalized.provider,
    product_id: normalized.product_id ?? 'daily_plus',
    rc_app_user_id: normalized.app_user_id,
    original_transaction_id: normalized.original_transaction_id,
    latest_transaction_id: normalized.latest_transaction_id,
    status,
    is_trial: normalized.is_trial,
    environment: normalized.environment,
    current_period_end: normalized.expiration_ms ? new Date(Number(normalized.expiration_ms)) : null,
  });

  const active = normalized.grantsEntitlement && !normalized.revokesEntitlement;
  await entitlementsRepo.upsert(userId, {
    key: 'daily_plus',
    active,
    expires_at: normalized.expiration_ms ? new Date(Number(normalized.expiration_ms)) : null,
    source_subscription_id: subscription.id,
  });

  log.info({ userId, event: normalized.event_type, active }, 'entitlement reconciled');
  return { userId, subscription, active };
}

/**
 * Client-driven reconcile (POST /v1/subscriptions/sync): the app posts its
 * RevenueCat customer info; we mirror entitlement state directly.
 */
export async function syncFromClient(userId, customerInfo) {
  const entitlements = customerInfo?.entitlements?.active ?? {};
  const hasPlus = Boolean(entitlements.daily_plus);
  const expires = entitlements.daily_plus?.expires_date_ms ?? null;

  await entitlementsRepo.upsert(userId, {
    key: 'daily_plus',
    active: hasPlus,
    expires_at: expires ? new Date(Number(expires)) : null,
  });
  return getSubscriptionState(userId);
}

async function resolveUserId(appUserId) {
  if (!appUserId) return null;
  // RevenueCat app_user_id is set to our user UUID at purchase time.
  const user = await usersRepo.findById(appUserId);
  return user?.id ?? null;
}
