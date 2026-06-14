// Apple / Google identity-token verification.
//
// Real verification fetches the provider JWKS and validates the identity token's
// signature, issuer, audience, and expiry. Until APPLE_CLIENT_ID /
// GOOGLE_CLIENT_ID are configured we run in MOCK mode: the token is decoded
// without signature verification so the auth flow is fully exercisable offline.
// Mock mode never runs when NODE_ENV=production (env validation requires the
// client ids there if you wire these up).

import { env } from '../config/env.mjs';
import { childLogger } from '../config/logger.mjs';
import { badRequest, unauthorized } from '../lib/errors.mjs';

const log = childLogger('identity-providers');

/** Decode a JWT payload without verifying (used only in mock mode). */
function decodeUnsafe(token) {
  try {
    const [, payload] = token.split('.');
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * Verify an Apple identity token.
 * @returns {Promise<{ subject: string, email: string|null }>}
 */
export async function verifyApple(identityToken) {
  if (!identityToken) throw badRequest('identity_token is required');

  if (env.flags.usingMockApple) {
    log.warn('APPLE_CLIENT_ID unset — verifying Apple token in MOCK mode (no signature check)');
    const payload = decodeUnsafe(identityToken) ?? {
      sub: `apple-mock-${hash(identityToken)}`,
      email: null,
    };
    return { subject: payload.sub, email: payload.email ?? null };
  }

  // Real path (configured): validate against Apple's JWKS.
  // Implementation outline — left as a single seam so swapping in jose/jwks is a
  // localized change, not a refactor:
  //   const { payload } = await jwtVerify(identityToken, appleJWKS, {
  //     issuer: 'https://appleid.apple.com', audience: env.APPLE_CLIENT_ID });
  //   return { subject: payload.sub, email: payload.email ?? null };
  throw unauthorized('Apple verification not yet wired for production');
}

/**
 * Verify a Google identity token.
 * @returns {Promise<{ subject: string, email: string|null }>}
 */
export async function verifyGoogle(identityToken) {
  if (!identityToken) throw badRequest('identity_token is required');

  if (env.flags.usingMockGoogle) {
    log.warn('GOOGLE_CLIENT_ID unset — verifying Google token in MOCK mode (no signature check)');
    const payload = decodeUnsafe(identityToken) ?? {
      sub: `google-mock-${hash(identityToken)}`,
      email: null,
    };
    return { subject: payload.sub, email: payload.email ?? null };
  }

  throw unauthorized('Google verification not yet wired for production');
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
