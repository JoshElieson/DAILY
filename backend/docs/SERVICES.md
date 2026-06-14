# Daily Backend — Services, Repositories, Integrations & Workers

How the layers fit: **routes** validate + authorize and call **services**;
services hold business logic and call **repositories** (the only code that touches
SQL) and **integrations** (external-service seams with real + mock impls);
**workers** drive the system on intervals. `lib/` and `config/` are cross-cutting.

```
HTTP → middleware (auth, validate, rate-limit) → routes → services → repositories → db/pool → Postgres|pg-mem
                                                         ↘ integrations (anthropic, expoPush, revenuecat, identityProviders)
workers (interval) → services → repositories
```

---

## Config & lib

| Module | Responsibility |
|---|---|
| `config/env.mjs` | Validates `process.env` with zod once at boot; exposes a frozen `env` + capability flags (`usingMockDb`, `usingMockAnthropic`, …). Enforces required secrets in production. |
| `config/logger.mjs` | pino root logger + `childLogger(mod)`. Redacts auth headers and raw `intent`. |
| `lib/uuid.mjs` | `uuidv7()` time-ordered IDs; `isUuid()`. |
| `lib/errors.mjs` | `AppError` + factories (`badRequest`, `notFound`, `paymentRequired`, …) → standard envelope. |
| `lib/http.mjs` | `asyncHandler`, `ok`, `paginated`, cursor encode/decode. |
| `lib/time.mjs` | Timezone-aware schedule math: `todayInTz`, `zonedTimeToUtc`, `computeNextRunAt` (the `next_run_at` heartbeat, DST-correct via `Intl`). |

---

## Database

| Module | Responsibility |
|---|---|
| `db/pool.mjs` | `pg.Pool` when `DATABASE_URL` set, else in-memory `pg-mem`. Exposes `query`, `queryOne`, `transaction`, `pingDb`. Single data-access seam. |
| `db/migrate.mjs` | Applies `migrations/*.sql` in order inside a transaction, tracked in `schema_migrations`. Idempotent. Runs at boot and via `npm run migrate`. |
| `db/seed.mjs` | Seeds 6 starter prompt templates (idempotent by slug). Auto-runs on the mock DB. |
| `db/migrations/` | `0001` identity+prompts+schedules, `0002` content+jobs+notifications, `0003` billing+analytics. Portable SQL (text + CHECK, app-generated UUIDs). |
| `db/production-extras.sql` | Partial indexes, RLS policies, partitioning notes — apply manually on real Postgres (not portable to pg-mem). |

---

## Repositories (`repositories/`)

Each exposes plain async functions over parameterized SQL. Tenancy is enforced
here (`findOwned(id, userId)`), so services can't accidentally cross tenants.

| Repo | Tables | Notable methods |
|---|---|---|
| `users.repo` | `users`, `devices` | `createAnonymous`, `claim`, `softDelete`; `devices.upsert`, `pushTargets` |
| `auth.repo` | `auth_identities`, `auth_sessions` | identity lookup/create; session `create/rotate/revoke` |
| `prompts.repo` | `prompts`, `prompt_templates`, `schedules` | `listByUser`, `countActive`, `schedules.due` (worker scan) |
| `content.repo` | `content_entries`, `generation_jobs` | `findPrimary`, `todayForUser`, `history`, `maxVariant`; `jobs.claimNext`, `findByIdempotencyKey` |
| `notifications.repo` | `notifications` | `due`, `existsForSchedule`, `cancelScheduledForPrompt`, `markStatus` |
| `billing.repo` | `subscriptions`, `user_entitlements`, `subscription_events`, `credit_ledger` | `entitlements.hasDailyPlus`, `events.record` (idempotent), `creditLedger.append/balance/grantedOn` |
| `analytics.repo` | `analytics_events`, `analytics_sessions`, `metric_rollups_daily` | `insertEvents`, `upsertRollup`, aggregation queries (DAU, cost, open-rate) |

---

## Services (`services/`)

| Service | Responsibility |
|---|---|
| `tokens.service` | JWT access tokens; refresh tokens (random, SHA-256 hashed, rotated). `issueTokenBundle`, `loadRefreshSession`, `rotateRefreshToken`. |
| `auth.service` | `bootstrapAnonymous`, `signInWithProvider` (Apple/Google claim), `refresh`, `logout`. Anonymous-first; provider sign-in claims the existing anon user. |
| `device.service` | Register/upsert/update/remove devices + push tokens. |
| `prompt.service` | Create (free-tier gating via entitlements + `FREE_PROMPT_LIMIT`), edit, pause/resume, delete, reorder, template-seeded create. Creating a prompt also creates its default schedule and generates today's content. |
| `schedule.service` | Create/update/delete cadences; keeps `next_run_at` correct; cancels pending notifications on change. Validates `HH:MM` + day mask. |
| `prompts.catalog` | Server-side Claude system prompt (prompt-cached), per-type instructions, structured-output JSON schema, `buildUserPrompt`. |
| `generation.service` | Orchestration: `enqueueGeneration` (idempotent job), `runGenerationJob` (Claude → persist `content_entry` + cost/tokens), `generateNow` (sync), `regenerate` (new variant). |
| `content.service` | Read paths (`todayForUser`, `getContent`, `history`) + `regenerate` gating (Plus free, else spends a credit). |
| `credit.service` | Regeneration-credit ledger: `ensureDailyGrant`, `spendRegenCredit` (402 when empty), `getBalance`. |
| `subscription.service` | Entitlement mirror: `getSubscriptionState`, `recordWebhookEvent` (idempotent), `applyEvent` (→ `user_entitlements`), `syncFromClient`. |
| `notification.service` | `ensureScheduled` (idempotent), `deliver` (push via Expo or mark sent for local-only), `recordEvents` (engagement funnel), teaser copy per type. |
| `analytics.service` | `ingest` (batch), `track` (server-side, never throws), `rollupDay` (aggregates events + joins live tables into `metric_rollups_daily`). |

---

## Integrations (`integrations/`)

Each has a **real** path (when its env is configured) and a **mock** path (offline).

| Module | Real | Mock |
|---|---|---|
| `anthropic.mjs` | `@anthropic-ai/sdk` Messages API: prompt-cached system prompt, `output_config.format` structured output, refusal handling, cost/token accounting. `resolveModel(model_pref, isPlus)` → `claude-haiku-4-5` / `claude-sonnet-4-6`. | Deterministic per-type generator seeded by `(type, intent, date)`; synthetic token/cost numbers. |
| `expoPush.mjs` | Expo push send + receipts. | Synthetic tickets/receipts. |
| `revenuecat.mjs` | Bearer-secret webhook verification + event normalization. | Accepts any payload. |
| `identityProviders.mjs` | Apple/Google identity-token verification (JWKS seam). | Decodes token unverified. |

---

## Middleware (`middleware/`)

| Module | Responsibility |
|---|---|
| `auth.mjs` | `requireAuth` (verify access JWT, load user, set `req.auth/req.user`), `optionalAuth`, `requireRegistered`, `requireAdmin`. Short-circuits if already resolved. |
| `validate.mjs` | `validateBody`/`validateQuery` (zod) → `422` with structured details. |
| `error.mjs` | `notFoundHandler` + central `errorHandler` → standard envelope; hides 500 messages; logs by severity. |
| `rateLimit.mjs` | `defaultLimiter` + tighter `generateLimiter`, keyed by user id or IP. |
| `requestContext.mjs` | pino-http request logging + request id. |

---

## Workers (`workers/`)

Started by `workers/index.mjs` on guarded intervals (overlap-protected). In
production these would be separate processes / a real queue.

| Worker | Tick | Does |
|---|---|---|
| `generation.worker` | `GENERATION_TICK_MS` | Pre-generates today..today+`GENERATION_LEAD_DAYS` for due schedules (deep content buffer), then drains queued `generation_jobs` through Claude. |
| `notification.worker` | `NOTIFICATION_TICK_MS` | Materializes notifications for schedules whose `next_run_at` arrived (idempotent) + advances `next_run_at`; delivers due scheduled notifications (push or local). |
| `entitlement.worker` | `NOTIFICATION_TICK_MS` | Drains unprocessed `subscription_events` into `user_entitlements` (retry/backfill for webhook failures). |
| `rollup.worker` | `ROLLUP_TICK_MS` | Recomputes `metric_rollups_daily` for today (nightly in prod). |

`workers/index.mjs` also exports `ticks` so tests/`scripts/smoke.mjs` can drive a
single tick deterministically.

---

## Request lifecycle (example: `POST /v1/prompts`)

1. `defaultLimiter` → `requireAuth` (JWT → `req.user`) → `validateBody` (zod).
2. `prompt.service.createPrompt`: free-tier check (`entitlements.hasDailyPlus` + count),
   insert prompt, `schedule.service.createSchedule` (computes `next_run_at`),
   `generation.service.generateNow` → `anthropic.generateContent` → persist `content_entry`.
3. `analytics.track('prompt_created')` (fire-and-forget).
4. Response `201 { prompt, content }`. Errors flow through `errorHandler`.
