# Daily — Backend

Production-ready cloud backend for **Daily** (the AI daily-content app). Implements
the architecture in [`../BACKEND-SCHEMA-API.md`](../BACKEND-SCHEMA-API.md) (Postgres +
REST `/v1` + Claude generation + scheduling + notifications + billing + analytics),
the model/integration decisions in [`../PLANNING.md`](../PLANNING.md), and the
scheduling model in [`../NOTIFICATIONS.md`](../NOTIFICATIONS.md).

> There is no `docs/master-spec.md` in this repo — those three documents are the
> spec this backend was built against.

## Highlights

- **Runs with zero external services.** With no `DATABASE_URL` it boots an in-memory
  Postgres (`pg-mem`), auto-migrates, and seeds starter templates. With no
  `ANTHROPIC_API_KEY` it uses a deterministic **mock** Claude generator. Expo push,
  RevenueCat, and Apple/Google sign-in are likewise mocked until configured — so the
  entire pipeline is testable offline (`npm run smoke`).
- **Layered architecture**: routes → services → repositories → SQL. Every external
  service sits behind an `integrations/` seam with a real + mock implementation.
- **Anonymous-first auth** (JWT access + rotating refresh), provider claim (Apple/Google),
  Postgres-backed sessions with server-side revocation.
- **Claude integration** via the official `@anthropic-ai/sdk`: prompt-cached system
  prompt, structured `output_config.format`, refusal handling, per-row cost/token tracking.
  Models: `claude-haiku-4-5` (workhorse) / `claude-sonnet-4-6` (Daily Plus).
- **Background workers**: generation pre-buffer, notification materialize+deliver,
  entitlement reconcile, nightly metric rollups.
- **Production env validation** (zod), structured logging (pino), central error envelope,
  per-identity rate limiting, free-tier gating + a credit ledger.

## Quick start

```bash
cd backend
cp .env.example .env          # optional — sensible dev defaults work as-is
npm install
npm run smoke                 # end-to-end test on pg-mem + mock Claude (no services)
npm run dev                   # start the API + workers on :8080
```

`GET http://localhost:8080/healthz` returns subsystem + capability status.

### Going to production

1. Set `DATABASE_URL` to a real PostgreSQL 16+ instance, `NODE_ENV=production`.
2. Set the required secrets (env validation enforces these in production):
   `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (≥32 chars), a non-`*` `ALLOWED_ORIGIN`.
3. Configure the externals you want live: `ANTHROPIC_API_KEY`, `EXPO_ACCESS_TOKEN`,
   `REVENUECAT_WEBHOOK_SECRET`, `APPLE_CLIENT_ID`, `GOOGLE_CLIENT_ID`. Anything left
   unset stays mocked, and `/healthz` reports which.
4. Run migrations: `npm run migrate`, then `psql "$DATABASE_URL" -f src/db/production-extras.sql`
   to add partial indexes + Row-Level Security (kept out of the auto-migrator so the
   same SQL stays portable to `pg-mem`).
5. `npm start`. Deploys with the same Dockerfile/Fly/Render shape as the `forge` backend.

## Project layout

```
backend/
  src/
    config/        env validation (zod) + logger (pino)
    lib/           uuid v7, typed errors, time/schedule math, http helpers
    db/            pool (pg | pg-mem), migration runner, migrations/, seed, production-extras.sql
    repositories/  data-access layer (parameterized SQL, one module per cluster)
    services/      business logic (auth, prompt, schedule, content, generation, ...)
    integrations/  external seams: anthropic, expoPush, revenuecat, identityProviders
    middleware/    auth, validate (zod), error, rate limit, request context
    routes/        /v1 REST endpoints
    workers/       background jobs (generation, notification, entitlement, rollup)
    server.mjs     Express app assembly
    index.mjs      process entrypoint (validate → migrate → seed → listen → workers)
  scripts/smoke.mjs   end-to-end smoke test
  docs/API.md         every endpoint
  docs/SERVICES.md    every service & worker
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | API + workers with file watch |
| `npm start` | API + workers |
| `npm run migrate` | Apply pending SQL migrations |
| `npm run seed` | Seed starter prompt templates |
| `npm run smoke` | Boot in-process and exercise the full flow on pg-mem + mock Claude |

## Documentation

- **[docs/API.md](docs/API.md)** — every REST endpoint (auth, request/response, status codes).
- **[docs/SERVICES.md](docs/SERVICES.md)** — every service, repository, integration, and worker.

## Security notes

- `ANTHROPIC_API_KEY` is server-only and never returned to clients (hard constraint).
- Refresh tokens are stored as SHA-256 hashes; access tokens are short-lived JWTs.
- Raw user `intent` text is redacted from logs; tenancy is enforced in every repository
  query (`WHERE user_id = …`) and, on real Postgres, by RLS (`production-extras.sql`).
- Webhooks verify a provider secret before mutating entitlements.
