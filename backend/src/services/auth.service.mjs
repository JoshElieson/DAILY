// Authentication orchestration: anonymous bootstrap, Apple/Google claim,
// refresh rotation, logout. Anonymous-first per BACKEND-SCHEMA-API.md §3 — a
// users row exists from first launch; provider sign-in *claims* it rather than
// creating a new user, preserving everything created offline.

import {
  usersRepo,
  devicesRepo,
  authIdentitiesRepo,
} from '../repositories/index.mjs';
import { verifyApple, verifyGoogle } from '../integrations/identityProviders.mjs';
import {
  issueTokenBundle,
  loadRefreshSession,
  rotateRefreshToken,
  signAccessToken,
} from './tokens.service.mjs';
import { authSessionsRepo } from '../repositories/index.mjs';
import { env } from '../config/env.mjs';
import { childLogger } from '../config/logger.mjs';
import { conflict, unauthorized } from '../lib/errors.mjs';

const log = childLogger('auth.service');

/** Bootstrap a brand-new anonymous user + (optional) first device. */
export async function bootstrapAnonymous({ timezone, locale, device } = {}) {
  const user = await usersRepo.createAnonymous({ timezone, locale });
  let registeredDevice = null;
  if (device?.install_id) {
    registeredDevice = await devicesRepo.upsert(user.id, device);
  }
  log.info({ userId: user.id }, 'anonymous user bootstrapped');
  const tokens = await issueTokenBundle(user, registeredDevice?.id ?? null);
  return { user: publicUser(user), device: registeredDevice, tokens };
}

const PROVIDERS = {
  apple: { verify: verifyApple, key: 'apple' },
  google: { verify: verifyGoogle, key: 'google' },
};

/**
 * Sign in with Apple/Google. If the identity already maps to a user, sign that
 * user in. Otherwise *claim* the caller's current anonymous user (if any) or
 * create a fresh registered user.
 */
export async function signInWithProvider(provider, { identityToken, currentUserId, device }) {
  const p = PROVIDERS[provider];
  if (!p) throw unauthorized(`Unsupported provider: ${provider}`);

  const { subject, email } = await p.verify(identityToken);
  const existingIdentity = await authIdentitiesRepo.find(p.key, subject);

  let user;
  if (existingIdentity) {
    // Returning user — sign in. (If they're also anonymous-on-device, we keep
    // the already-registered account as the source of truth.)
    user = await usersRepo.findById(existingIdentity.user_id);
    if (!user || user.status === 'deleted') throw unauthorized('Account unavailable');
  } else {
    // New identity. Claim the current anonymous user if present; else create.
    let base = currentUserId ? await usersRepo.findById(currentUserId) : null;
    if (base && !base.is_anonymous) {
      // The caller is already a different registered user — don't silently merge.
      throw conflict('This device is already signed in to a different account');
    }
    if (!base) base = await usersRepo.createAnonymous({});
    if (email && (await emailTaken(email, base.id))) {
      throw conflict('That email is already associated with another account');
    }
    user = await usersRepo.claim(base.id, { primary_provider: p.key, email });
    await authIdentitiesRepo.create({
      user_id: user.id,
      provider: p.key,
      provider_subject: subject,
      email,
    });
    log.info({ userId: user.id, provider: p.key }, 'anonymous user claimed by provider');
  }

  let registeredDevice = null;
  if (device?.install_id) registeredDevice = await devicesRepo.upsert(user.id, device);

  const tokens = await issueTokenBundle(user, registeredDevice?.id ?? null);
  return { user: publicUser(user), device: registeredDevice, tokens };
}

async function emailTaken(email, exceptUserId) {
  const u = await usersRepo.findByEmail(email);
  return u && u.id !== exceptUserId;
}

/** Rotate a refresh token → new access + refresh. */
export async function refresh(refreshToken) {
  const session = await loadRefreshSession(refreshToken);
  const user = await usersRepo.findById(session.user_id);
  if (!user || user.status === 'deleted') throw unauthorized('Account unavailable');
  const { token: newRefresh } = await rotateRefreshToken(session);
  return {
    access_token: signAccessToken(user),
    refresh_token: newRefresh,
    token_type: 'Bearer',
    expires_in: env.JWT_ACCESS_TTL,
  };
}

/** Revoke a session (logout). Idempotent. */
export async function logout(refreshToken) {
  try {
    const session = await loadRefreshSession(refreshToken);
    await authSessionsRepo.revoke(session.id);
  } catch {
    // Already invalid/expired — logout is a no-op success.
  }
  return { ok: true };
}

/** Whitelist the user fields safe to return to clients. */
export function publicUser(u) {
  return {
    id: u.id,
    handle: u.handle ?? null,
    display_name: u.display_name ?? null,
    email: u.email ?? null,
    is_anonymous: u.is_anonymous,
    primary_provider: u.primary_provider,
    timezone: u.timezone,
    locale: u.locale,
    is_admin: u.is_admin === true,
    created_at: u.created_at,
  };
}
