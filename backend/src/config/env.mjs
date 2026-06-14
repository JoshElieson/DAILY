// Environment variable validation & typed config.
//
// Validates `process.env` once at boot with zod and exposes a frozen, typed
// `env` object. Fails fast with a readable report if anything required is
// missing or malformed. Secrets that are *required in production* are allowed
// to fall back to deterministic dev defaults outside production so the backend
// boots with zero configuration for local development and tests.

import 'dotenv/config';
import { z } from 'zod';

const bool = (def) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? def : v))
    .pipe(z.enum(['true', 'false']))
    .transform((v) => v === 'true');

const int = (def, { min, max } = {}) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? String(def) : v))
    .pipe(z.coerce.number().int())
    .refine((n) => (min === undefined || n >= min) && (max === undefined || n <= max), {
      message: `must be an integer${min !== undefined ? ` >= ${min}` : ''}${
        max !== undefined ? ` <= ${max}` : ''
      }`,
    });

const str = (def = '') =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined ? def : v));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: int(8080, { min: 1, max: 65535 }),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),
  ALLOWED_ORIGIN: str('*'),

  DATABASE_URL: str(''),
  DB_SSL: bool('false'),
  DB_POOL_MAX: int(10, { min: 1, max: 100 }),

  JWT_ACCESS_SECRET: str(''),
  JWT_REFRESH_SECRET: str(''),
  JWT_ACCESS_TTL: int(900, { min: 60 }),
  JWT_REFRESH_TTL: int(2592000, { min: 3600 }),
  JWT_ISSUER: str('daily-backend'),
  JWT_AUDIENCE: str('daily-app'),

  APPLE_CLIENT_ID: str(''),
  GOOGLE_CLIENT_ID: str(''),

  ANTHROPIC_API_KEY: str(''),
  ANTHROPIC_MODEL: str('claude-haiku-4-5'),
  ANTHROPIC_MODEL_PREMIUM: str('claude-sonnet-4-6'),
  ANTHROPIC_MAX_TOKENS: int(400, { min: 32, max: 4096 }),
  GENERATION_INTENT_MAX_CHARS: int(500, { min: 32, max: 4000 }),

  EXPO_ACCESS_TOKEN: str(''),
  REVENUECAT_WEBHOOK_SECRET: str(''),

  RATE_LIMIT_PER_MIN: int(120, { min: 1 }),
  GENERATE_RATE_LIMIT_PER_MIN: int(20, { min: 1 }),

  WORKERS_ENABLED: bool('true'),
  GENERATION_LEAD_DAYS: int(2, { min: 1, max: 14 }),
  GENERATION_TICK_MS: int(15000, { min: 1000 }),
  NOTIFICATION_TICK_MS: int(15000, { min: 1000 }),
  ROLLUP_TICK_MS: int(3600000, { min: 60000 }),

  FREE_PROMPT_LIMIT: int(2, { min: 0 }),
  FREE_DAILY_REGEN_CREDITS: int(1, { min: 0 }),
});

function applyProductionDefaults(raw) {
  // In non-production, supply deterministic secrets so the app boots with no
  // config. In production these MUST be set explicitly — enforced below.
  const out = { ...raw };
  if (out.NODE_ENV !== 'production') {
    out.JWT_ACCESS_SECRET ||= 'dev-only-access-secret-do-not-use-in-prod';
    out.JWT_REFRESH_SECRET ||= 'dev-only-refresh-secret-do-not-use-in-prod';
  }
  return out;
}

function enforceProductionInvariants(env) {
  if (env.NODE_ENV !== 'production') return [];
  const problems = [];
  if (!env.JWT_ACCESS_SECRET) problems.push('JWT_ACCESS_SECRET is required in production');
  if (!env.JWT_REFRESH_SECRET) problems.push('JWT_REFRESH_SECRET is required in production');
  if (env.JWT_ACCESS_SECRET && env.JWT_ACCESS_SECRET.length < 32)
    problems.push('JWT_ACCESS_SECRET must be >= 32 chars in production');
  if (!env.DATABASE_URL)
    problems.push('DATABASE_URL is required in production (pg-mem mock is dev/test only)');
  if (env.ALLOWED_ORIGIN === '*')
    problems.push('ALLOWED_ORIGIN must not be "*" in production');
  return problems;
}

function loadEnv() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map(
      (i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`,
    );
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
  }

  const env = applyProductionDefaults(parsed.data);
  const prodProblems = enforceProductionInvariants(env);
  if (prodProblems.length) {
    throw new Error(
      `Invalid production environment:\n${prodProblems.map((p) => `  - ${p}`).join('\n')}`,
    );
  }

  // Derived capability flags — the rest of the app reads these instead of
  // re-checking which external services are configured.
  env.flags = Object.freeze({
    usingMockDb: !env.DATABASE_URL,
    usingMockAnthropic: !env.ANTHROPIC_API_KEY,
    usingMockExpoPush: !env.EXPO_ACCESS_TOKEN,
    usingMockRevenueCat: !env.REVENUECAT_WEBHOOK_SECRET,
    usingMockApple: !env.APPLE_CLIENT_ID,
    usingMockGoogle: !env.GOOGLE_CLIENT_ID,
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
  });

  return Object.freeze(env);
}

export const env = loadEnv();

/** Human-readable summary of which subsystems are real vs mocked (logged at boot). */
export function capabilitySummary() {
  const f = env.flags;
  return {
    db: f.usingMockDb ? 'mock (pg-mem)' : 'postgres',
    anthropic: f.usingMockAnthropic ? 'mock' : 'live',
    expoPush: f.usingMockExpoPush ? 'mock' : 'live',
    revenuecat: f.usingMockRevenueCat ? 'mock' : 'live',
    apple: f.usingMockApple ? 'mock' : 'live',
    google: f.usingMockGoogle ? 'mock' : 'live',
    workers: env.WORKERS_ENABLED ? 'enabled' : 'disabled',
  };
}
