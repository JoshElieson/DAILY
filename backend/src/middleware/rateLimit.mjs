// Rate limiting (forge pattern). A default per-identity limiter for all /v1
// routes plus a tighter limiter for generation endpoints to bound token spend.
// Keyed by authenticated user id when present, else client IP.

import rateLimit from 'express-rate-limit';
import { env } from '../config/env.mjs';

const keyGenerator = (req) => req.auth?.userId || req.ip;

const handler = (_req, res) => {
  res.status(429).json({
    error: { code: 'rate_limited', message: 'Too many requests. Slow down.' },
  });
};

export const defaultLimiter = rateLimit({
  windowMs: 60_000,
  max: env.RATE_LIMIT_PER_MIN,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler,
});

export const generateLimiter = rateLimit({
  windowMs: 60_000,
  max: env.GENERATE_RATE_LIMIT_PER_MIN,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler,
});
