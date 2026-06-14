// JWT access/refresh token issuance & verification.
//
// Access tokens are short-lived JWTs verified statelessly on every request.
// Refresh tokens are opaque random strings; only their SHA-256 hash is stored
// (auth_sessions.refresh_hash) so a DB leak can't mint sessions. Refresh
// rotates on every use.

import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.mjs';
import { authSessionsRepo } from '../repositories/index.mjs';
import { unauthorized } from '../lib/errors.mjs';

const ACCESS_OPTS = {
  issuer: env.JWT_ISSUER,
  audience: env.JWT_AUDIENCE,
};

export function signAccessToken(user) {
  const payload = {
    sub: user.id,
    anon: user.is_anonymous,
    adm: user.is_admin === true,
    scope: user.is_anonymous ? 'anonymous' : 'user',
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    ...ACCESS_OPTS,
    expiresIn: env.JWT_ACCESS_TTL,
  });
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, ACCESS_OPTS);
  } catch (err) {
    throw unauthorized(
      err.name === 'TokenExpiredError' ? 'Access token expired' : 'Invalid access token',
    );
  }
}

export function hashRefresh(token) {
  return createHash('sha256').update(token).digest('hex');
}

/** Mint a refresh token, persist its hash, return the plaintext (shown once). */
export async function issueRefreshToken(userId, deviceId = null) {
  const token = randomBytes(32).toString('base64url');
  const expires_at = new Date(Date.now() + env.JWT_REFRESH_TTL * 1000);
  const session = await authSessionsRepo.create({
    user_id: userId,
    device_id: deviceId,
    refresh_hash: hashRefresh(token),
    expires_at,
  });
  return { token, session };
}

/** Validate a presented refresh token; returns its session or throws. */
export async function loadRefreshSession(token) {
  const session = await authSessionsRepo.findByHash(hashRefresh(token));
  if (!session) throw unauthorized('Invalid refresh token');
  if (session.revoked_at) throw unauthorized('Refresh token revoked');
  if (new Date(session.expires_at) < new Date()) throw unauthorized('Refresh token expired');
  return session;
}

/** Rotate a refresh token: revoke the old session, issue a fresh one. */
export async function rotateRefreshToken(oldSession) {
  const token = randomBytes(32).toString('base64url');
  const expires_at = new Date(Date.now() + env.JWT_REFRESH_TTL * 1000);
  await authSessionsRepo.rotate(oldSession.id, {
    user_id: oldSession.user_id,
    device_id: oldSession.device_id,
    refresh_hash: hashRefresh(token),
    expires_at,
  });
  return { token };
}

/** Build the standard token bundle returned to clients. */
export async function issueTokenBundle(user, deviceId = null) {
  const access = signAccessToken(user);
  const { token: refresh } = await issueRefreshToken(user.id, deviceId);
  return {
    access_token: access,
    refresh_token: refresh,
    token_type: 'Bearer',
    expires_in: env.JWT_ACCESS_TTL,
  };
}
