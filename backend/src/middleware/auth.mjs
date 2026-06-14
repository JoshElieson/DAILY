// Authentication middleware. Verifies the Bearer access token, loads the user,
// and attaches { req.auth, req.user }. Every /v1 endpoint requires *some*
// identity (anonymous users get a token too), so `requireAuth` is the default.

import { verifyAccessToken } from '../services/tokens.service.mjs';
import { usersRepo } from '../repositories/index.mjs';
import { asyncHandler } from '../lib/http.mjs';
import { unauthorized, forbidden } from '../lib/errors.mjs';

function extractBearer(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

export const requireAuth = asyncHandler(async (req, _res, next) => {
  // Routers are mounted at '/', so a request can pass through several
  // router-level requireAuth guards before its route matches. Resolve once.
  if (req.auth) return next();

  const token = extractBearer(req);
  if (!token) throw unauthorized('Missing Bearer token');

  const claims = verifyAccessToken(token);
  const user = await usersRepo.findById(claims.sub);
  if (!user || user.status === 'deleted') throw unauthorized('Account unavailable');

  req.auth = { userId: user.id, scope: claims.scope, isAnonymous: claims.anon, isAdmin: claims.adm };
  req.user = user;
  // Expose the tenant id for request-scoped RLS (set on real Postgres).
  req.tenantId = user.id;
  next();
});

/** Optional auth — attaches identity if a valid token is present, else continues. */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = extractBearer(req);
  if (!token) return next();
  try {
    const claims = verifyAccessToken(token);
    const user = await usersRepo.findById(claims.sub);
    if (user && user.status !== 'deleted') {
      req.auth = { userId: user.id, scope: claims.scope, isAnonymous: claims.anon, isAdmin: claims.adm };
      req.user = user;
      req.tenantId = user.id;
    }
  } catch {
    /* ignore — anonymous public access */
  }
  next();
});

/** Require a non-anonymous (claimed) account. */
export const requireRegistered = (req, _res, next) => {
  if (!req.auth) return next(unauthorized());
  if (req.auth.isAnonymous) return next(forbidden('Sign in to use this feature'));
  next();
};

/** Admin-only guard for /v1/admin/*. */
export const requireAdmin = (req, _res, next) => {
  if (!req.auth) return next(unauthorized());
  if (!req.auth.isAdmin) return next(forbidden('Admin access required'));
  next();
};
