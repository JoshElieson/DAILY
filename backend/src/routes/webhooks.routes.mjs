// Store webhooks (BACKEND-SCHEMA-API.md §10.7). Server-to-server, no user auth —
// verified by provider signature/secret. Events are recorded idempotently and
// applied to entitlements immediately (the reconciler worker also drains any
// that fail here).
import { Router } from 'express';
import { asyncHandler, ok } from '../lib/http.mjs';
import { verifyWebhook } from '../integrations/revenuecat.mjs';
import { recordWebhookEvent, applyEvent } from '../services/subscription.service.mjs';
import { subscriptionEventsRepo } from '../repositories/index.mjs';
import { childLogger } from '../config/logger.mjs';

const log = childLogger('webhooks');
export const webhooksRouter = Router();

webhooksRouter.post(
  '/webhooks/revenuecat',
  asyncHandler(async (req, res) => {
    verifyWebhook(req);
    const { event, duplicate, normalized } = await recordWebhookEvent(req.body);
    if (duplicate) return ok(res, { ok: true, duplicate: true });
    try {
      await applyEvent(normalized);
      await subscriptionEventsRepo.markProcessed(event.id);
    } catch (err) {
      // Leave unprocessed for the reconciler worker to retry.
      log.warn({ err, eventId: event.id }, 'inline reconcile failed; deferring to worker');
    }
    ok(res, { ok: true });
  }),
);

// App Store Server Notifications v2 / Play RTDN land here in production. For
// now they share the same idempotent record-then-reconcile path; signature
// verification is stubbed (mock) until store credentials are configured.
for (const path of ['/webhooks/app-store', '/webhooks/play-rtdn']) {
  webhooksRouter.post(
    path,
    asyncHandler(async (req, res) => {
      const { duplicate } = await recordWebhookEvent(req.body);
      ok(res, { ok: true, duplicate });
    }),
  );
}
