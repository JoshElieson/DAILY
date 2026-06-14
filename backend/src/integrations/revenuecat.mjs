// RevenueCat webhook verification + event normalization.
//
// Real mode verifies the Authorization header against REVENUECAT_WEBHOOK_SECRET
// (RevenueCat sends a shared bearer). Mock mode (secret unset) accepts any
// payload so the subscription pipeline is testable offline. Either way the raw
// event is normalized to the shape the entitlement reconciler consumes.

import { env } from '../config/env.mjs';
import { childLogger } from '../config/logger.mjs';
import { unauthorized } from '../lib/errors.mjs';

const log = childLogger('revenuecat');

/** Verify the inbound webhook. Throws unauthorized on a bad signature. */
export function verifyWebhook(req) {
  if (env.flags.usingMockRevenueCat) {
    log.warn('REVENUECAT_WEBHOOK_SECRET unset — accepting webhook in MOCK mode (no verification)');
    return true;
  }
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  if (token !== env.REVENUECAT_WEBHOOK_SECRET) throw unauthorized('Invalid webhook signature');
  return true;
}

const ENTITLED_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
  'NON_RENEWING_PURCHASE',
]);
const REVOKED_EVENTS = new Set(['CANCELLATION', 'EXPIRATION', 'BILLING_ISSUE', 'SUBSCRIPTION_PAUSED']);

/** Normalize a RevenueCat webhook body to our internal event shape. */
export function normalizeEvent(body) {
  const e = body?.event ?? body ?? {};
  const type = e.type ?? 'UNKNOWN';
  return {
    store_event_id: e.id ?? `${type}:${e.original_transaction_id ?? e.app_user_id ?? 'unknown'}:${e.event_timestamp_ms ?? ''}`,
    event_type: type,
    provider: 'revenuecat',
    app_user_id: e.app_user_id ?? e.original_app_user_id ?? null,
    product_id: e.product_id ?? null,
    original_transaction_id: e.original_transaction_id ?? e.transaction_id ?? null,
    latest_transaction_id: e.transaction_id ?? null,
    environment: e.environment === 'SANDBOX' ? 'sandbox' : 'production',
    is_trial: e.period_type === 'TRIAL',
    expiration_ms: e.expiration_at_ms ?? null,
    event_at_ms: e.event_timestamp_ms ?? null,
    grantsEntitlement: ENTITLED_EVENTS.has(type),
    revokesEntitlement: REVOKED_EVENTS.has(type),
    raw: body,
  };
}
