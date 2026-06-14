// Auth & account routes (BACKEND-SCHEMA-API.md §10.1).
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ok } from '../lib/http.mjs';
import { validateBody } from '../middleware/validate.mjs';
import { requireAuth } from '../middleware/auth.mjs';
import {
  bootstrapAnonymous,
  signInWithProvider,
  refresh,
  logout,
  publicUser,
} from '../services/auth.service.mjs';
import { usersRepo } from '../repositories/index.mjs';
import { entitlementsRepo } from '../repositories/index.mjs';

export const authRouter = Router();

const deviceSchema = z
  .object({
    platform: z.enum(['ios', 'android', 'web']),
    install_id: z.string().min(1),
    app_version: z.string().optional(),
    os_version: z.string().optional(),
    expo_push_token: z.string().optional(),
    push_enabled: z.boolean().optional(),
  })
  .optional();

authRouter.post(
  '/auth/anonymous',
  validateBody(
    z.object({
      timezone: z.string().optional(),
      locale: z.string().optional(),
      device: deviceSchema,
    }),
  ),
  asyncHandler(async (req, res) => {
    const result = await bootstrapAnonymous(req.body);
    ok(res, result, 201);
  }),
);

const providerSchema = z.object({
  identity_token: z.string().min(1),
  device: deviceSchema,
});

function providerRoute(provider) {
  return asyncHandler(async (req, res) => {
    // Optionally claim the caller's current anonymous user if a token is present.
    let currentUserId = null;
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      try {
        const { verifyAccessToken } = await import('../services/tokens.service.mjs');
        currentUserId = verifyAccessToken(auth.slice(7)).sub;
      } catch {
        /* ignore — treat as fresh sign-in */
      }
    }
    const result = await signInWithProvider(provider, {
      identityToken: req.body.identity_token,
      currentUserId,
      device: req.body.device,
    });
    ok(res, result);
  });
}

authRouter.post('/auth/apple', validateBody(providerSchema), providerRoute('apple'));
authRouter.post('/auth/google', validateBody(providerSchema), providerRoute('google'));

authRouter.post(
  '/auth/refresh',
  validateBody(z.object({ refresh_token: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    ok(res, await refresh(req.body.refresh_token));
  }),
);

authRouter.post(
  '/auth/logout',
  validateBody(z.object({ refresh_token: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    ok(res, await logout(req.body.refresh_token));
  }),
);

// ── /me ──────────────────────────────────────────────────────────────────────
authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const entitlements = await entitlementsRepo.listByUser(req.user.id);
    ok(res, { user: publicUser(req.user), entitlements });
  }),
);

authRouter.patch(
  '/me',
  requireAuth,
  validateBody(
    z.object({
      display_name: z.string().max(120).optional(),
      timezone: z.string().optional(),
      locale: z.string().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const updated = await usersRepo.update(req.user.id, req.body);
    ok(res, { user: publicUser(updated) });
  }),
);

authRouter.delete(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    // GDPR/Apple deletion: soft-delete now; a purge job hard-deletes later.
    await usersRepo.softDelete(req.user.id);
    ok(res, { ok: true, status: 'scheduled_for_deletion' });
  }),
);
