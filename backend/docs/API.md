# Daily Backend — API Reference

Base path **`/v1`** (except `/healthz`). JSON in/out. Implements
`BACKEND-SCHEMA-API.md` §10.

## Conventions

- **Auth**: `Authorization: Bearer <access_jwt>`. Every `/v1` endpoint requires *some*
  identity except `/auth/*` and `/webhooks/*`. Anonymous users get a token from
  `/auth/anonymous`.
- **Errors**: one envelope — `{ "error": { "code", "message", "details?" } }`.
  Codes: `bad_request` (400), `unauthorized` (401), `forbidden` (403),
  `not_found` (404), `payment_required` (402), `conflict` (409),
  `validation_error` (422), `rate_limited` (429), `upstream_error` (502),
  `internal` (500).
- **Rate limiting**: per-user (or per-IP) — `RATE_LIMIT_PER_MIN` default 120;
  generation endpoints `GENERATE_RATE_LIMIT_PER_MIN` default 20. `429` + `Retry-After`.
- **Lists** return `{ "data": [...] }`. Timestamps are ISO-8601 UTC. IDs are UUID v7.

---

## Health

### `GET /healthz`
Liveness + subsystem/capability status. No auth. `200` healthy, `503` if DB down.
```json
{ "status": "ok", "uptime_s": 12,
  "subsystems": { "db": "up", "anthropic": "mock", "expo_push": "mock", "queue": "enabled" },
  "capabilities": { "db": "mock (pg-mem)", "anthropic": "mock", ... } }
```

---

## Auth & account (§10.1)

### `POST /v1/auth/anonymous`
Bootstrap an anonymous user (+ optional first device). No auth. → `201`
```json
// request
{ "timezone": "America/Denver", "locale": "en-US",
  "device": { "platform": "ios", "install_id": "uuid", "expo_push_token": "...", "push_enabled": true } }
// response
{ "user": { "id", "is_anonymous": true, "timezone", ... },
  "device": { ... } | null,
  "tokens": { "access_token", "refresh_token", "token_type": "Bearer", "expires_in": 900 } }
```

### `POST /v1/auth/apple` · `POST /v1/auth/google`
Verify a provider identity token and **claim** the caller's current anonymous user
(if a Bearer token is present) or sign in / create. Body: `{ "identity_token", "device?" }`.
→ same `{ user, device, tokens }` shape. Verification is mocked until
`APPLE_CLIENT_ID` / `GOOGLE_CLIENT_ID` are set.

### `POST /v1/auth/refresh`
Rotate a refresh token. Body `{ "refresh_token" }` → `{ access_token, refresh_token, token_type, expires_in }`.

### `POST /v1/auth/logout`
Revoke a refresh session. Body `{ "refresh_token" }` → `{ "ok": true }`.

### `GET /v1/me`
→ `{ "user", "entitlements": [...] }`.

### `PATCH /v1/me`
Body: `{ display_name?, timezone?, locale? }` → `{ "user" }`.

### `DELETE /v1/me`
GDPR/Apple deletion. Soft-deletes now; purge job hard-deletes later. → `{ "ok": true, "status": "scheduled_for_deletion" }`.

---

## Devices & push (§10.2)

| Method | Path | Body | Notes |
|---|---|---|---|
| `GET` | `/v1/devices` | — | `{ data: [...] }` |
| `POST` | `/v1/devices` | `{ platform, install_id, app_version?, os_version?, expo_push_token?, push_enabled? }` | upsert by `install_id` → `201` |
| `PATCH` | `/v1/devices/:id` | `{ expo_push_token?, push_enabled?, app_version?, os_version? }` | |
| `DELETE` | `/v1/devices/:id` | — | `{ ok: true }` |

---

## Templates & prompts (§10.3)

| Method | Path | Body / Query | Notes |
|---|---|---|---|
| `GET` | `/v1/templates` | `?type=&sort=popular\|recent` | starter + community templates |
| `GET` | `/v1/templates/:slug` | — | one template |
| `GET` | `/v1/prompts` | `?status=active\|paused\|archived` | the user's prompts |
| `POST` | `/v1/prompts` | `{ type, intent, title?, tone?, model_pref?, frequency?, time_of_day?, timezone? }` | creates prompt + default schedule + generates today; `402` over the free limit |
| `POST` | `/v1/prompts/from-template/:slug` | partial create body | seed a prompt from a template |
| `GET` | `/v1/prompts/:id` | — | `{ prompt, schedules, latest_content }` |
| `PATCH` | `/v1/prompts/:id` | `{ type?, intent?, title?, tone?, model_pref?, position? }` | |
| `DELETE` | `/v1/prompts/:id` | — | soft-delete + cancel schedules/notifications |
| `POST` | `/v1/prompts/:id/pause` · `/resume` | — | toggle status |
| `POST` | `/v1/prompts/:id/reorder` | `{ position }` | home sort |

`POST /v1/prompts` response: `{ "prompt": {...}, "content": { "body", "title?", "tone?" } | null }`.

---

## Schedules (§10.4)

| Method | Path | Body | Notes |
|---|---|---|---|
| `GET` | `/v1/prompts/:id/schedules` | — | `{ data: [...] }` |
| `POST` | `/v1/prompts/:id/schedules` | `{ frequency, time_of_day, timezone?, days_of_week?, start_date?, end_date?, enabled? }` | adds a cadence → `201` |
| `PATCH` | `/v1/schedules/:id` | any of the above | recomputes `next_run_at`, cancels pending notifications |
| `DELETE` | `/v1/schedules/:id` | — | |

`frequency`: `daily\|weekdays\|weekends\|weekly\|custom_days\|multiple_daily`.
`time_of_day`: `HH:MM` (24h, wall-clock in `timezone`). `days_of_week`: 7-bit mask Mon..Sun.

---

## Content & generation (§10.5)

| Method | Path | Body / Query | Notes |
|---|---|---|---|
| `GET` | `/v1/content/today` | — | home payload: `{ date, entries: [...] }` |
| `GET` | `/v1/prompts/:id/content` | `?from=&to=` | history (variant 0) |
| `GET` | `/v1/content/:id` | — | one entry (deep-link target) |
| `POST` | `/v1/prompts/:id/generate` | `{ for_date?, sync? }` | `sync:true` → `201 { job, content }`; else enqueue → `202 { job }` |
| `POST` | `/v1/content/:id/regenerate` | — | Plus free; else spends a credit (`402` if none) → `201 { job, content }` |
| `DELETE` | `/v1/content/:id` | — | soft-delete a day's content |
| `GET` | `/v1/jobs/:id` | — | poll async generation status |

A content entry: `{ id, prompt_id, for_date, variant, title, body, tone, structured, model, status, cost_micros, ... }`.
`status`: `ready\|refusal\|failed\|queued\|running`.

---

## Notifications (§10.6)

| Method | Path | Body / Query | Notes |
|---|---|---|---|
| `GET` | `/v1/notifications` | `?limit=` | history |
| `POST` | `/v1/notifications/events` | `{ events: [{ id, type: delivered\|opened\|dismissed, at? }] }` | client engagement telemetry |

---

## Subscriptions & credits (§10.7)

| Method | Path | Body | Notes |
|---|---|---|---|
| `GET` | `/v1/subscription` | — | `{ subscriptions, entitlements, daily_plus }` (gating source) |
| `POST` | `/v1/subscriptions/sync` | `{ customer_info }` | reconcile from RevenueCat customer info |
| `GET` | `/v1/credits` | — | `{ balance, ledger }` (grants today's free credits) |

### Webhooks (server-to-server, signature-verified, no user auth)
| Method | Path | Notes |
|---|---|---|
| `POST` | `/v1/webhooks/revenuecat` | records event idempotently + reconciles entitlements |
| `POST` | `/v1/webhooks/app-store` | App Store Server Notifications v2 (records; verification stubbed) |
| `POST` | `/v1/webhooks/play-rtdn` | Play RTDN (records; verification stubbed) |

---

## Analytics (§10.8)

| Method | Path | Body | Notes |
|---|---|---|---|
| `POST` | `/v1/analytics/events` | `{ device_id?, events: [{ event_name, properties?, platform?, ts? }] }` | batch ingest (≤500) |

---

## Ops / admin (§10.10) — `requireAdmin`

| Method | Path | Query | Notes |
|---|---|---|---|
| `GET` | `/v1/admin/metrics` | `?day=YYYY-MM-DD` | `metric_rollups_daily` |
| `POST` | `/v1/admin/metrics/rollup` | `?day=` | recompute a day's rollup |

---

## Not yet implemented (schema present, endpoints deferred to P5)

The **social** cluster (profiles, shares, follows, reactions, comments, reports —
`BACKEND-SCHEMA-API.md` §9 / §10.9) is intentionally out of scope for this build,
per the spec's build order. The tables are documented but not migrated.
