// Subscriptions & credits (BACKEND-SCHEMA-API.md §10.7).
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok } from '../lib/http.mjs';
import { validateBody } from '../middleware/validate.mjs';
import { requireAuth } from '../middleware/auth.mjs';
import { getSubscriptionState, syncFromClient } from '../services/subscription.service.mjs';
import { getBalance, listLedger, ensureDailyGrant } from '../services/credit.service.mjs';

export const subscriptionsRouter = Router();
subscriptionsRouter.use(requireAuth);

subscriptionsRouter.get(
  '/subscription',
  asyncHandler(async (req, res) => ok(res, await getSubscriptionState(req.user.id))),
);

subscriptionsRouter.post(
  '/subscriptions/sync',
  validateBody(z.object({ customer_info: z.record(z.any()).optional() }).passthrough()),
  asyncHandler(async (req, res) =>
    ok(res, await syncFromClient(req.user.id, req.body.customer_info ?? req.body)),
  ),
);

subscriptionsRouter.get(
  '/credits',
  asyncHandler(async (req, res) => {
    await ensureDailyGrant(req.user.id, req.user.timezone);
    const [balance, ledger] = await Promise.all([getBalance(req.user.id), listLedger(req.user.id)]);
    ok(res, { balance, ledger });
  }),
);
