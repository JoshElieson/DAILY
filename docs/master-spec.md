# Daily — Master Specification (Single Source of Truth)

> **Status:** Canonical. This document supersedes all per-discipline planning docs where they conflict.
> **Author:** Lead architect synthesis pass, 2026-06-13.
> **Inputs reconciled:** `PLANNING.md`, `BACKEND-SCHEMA-API.md`, `NOTIFICATIONS.md`, `LAUNCH-PLAN.md`, `design-system/{README,01-foundations,02-components,03-screens,04-implementation}.md`.
> **Companion:** `development-roadmap.md` (phases, task list, critical path, parallelization).

When any other document disagrees with this one, **this one wins**. If you change a decision here, update the "Decision log" (§1) and the affected section in the same edit.

---

## Table of contents

1. [Decision log — resolved conflicts](#1-decision-log--resolved-conflicts)
2. [Product requirements](#2-product-requirements)
3. [Domain model & canonical vocabulary](#3-domain-model--canonical-vocabulary)
4. [Database schema](#4-database-schema)
5. [API design](#5-api-design)
6. [Claude integration architecture](#6-claude-integration-architecture)
7. [Notification architecture](#7-notification-architecture)
8. [Authentication architecture](#8-authentication-architecture)
9. [UI architecture](#9-ui-architecture)
10. [App Store requirements](#10-app-store-requirements)
11. [Cross-cutting: security, privacy, config](#11-cross-cutting-security-privacy-config)
12. [Glossary](#12-glossary)

---

## 1. Decision log — resolved conflicts

These are the contradictions found across the planning docs and the binding resolution for each. Each carries a rationale so engineers understand the "why," and an owner-overridable flag where the call is consequential.

| # | Conflict | Sources | **Resolution (binding)** | Rationale |
|---|----------|---------|--------------------------|-----------|
| **D1** | **Product identity.** AI content engine vs. manual calm-reminders app. | PLANNING (AI) vs design-system (manual reminders w/ checkboxes) vs LAUNCH (reconciled). | **Daily is an AI-personalized daily ritual.** The user writes a natural-language *intent*; Claude generates fresh content each day; it is *delivered* as a calm scheduled notification and rendered as a content card. The manual "reminder + check-off + streak" mechanic from design-system is **retained as the engagement/completion layer on top of AI content**, not as a separate manual-reminder product. AI is the wedge; calm is the wrapper. | LAUNCH §0 already adjudicates this; AI personalization is the defensible ASO lane. ⚠️ **Owner-overridable** — if you want a manual-reminders-first v1, say so and §2/§3/§4 change materially. |
| **D2** | **Core entity name.** `daily_item` vs `prompts` vs "reminder". | PLANNING / BACKEND / design-system. | Canonical entity = **Daily** (user-facing noun: "a Daily"). Local table `daily_item`, cloud table `daily_items`. **The BACKEND doc's `prompts` table is renamed `daily_items`** to avoid collision with "prompt" (the Claude prompt). | One name end-to-end prevents the `prompt` (entity) vs `prompt` (LLM input) ambiguity that would bite every engineer. |
| **D3** | **Completion / streak model is missing from the data layer.** | design-system (central: checkbox, mark-done, progress ring, streaks) vs PLANNING/BACKEND (absent). | Add a first-class **completion** concept. Local: `completed_at` on `content_entry`. Cloud: same on `content_entries` + a `daily_streaks` rollup. "Done" = "the user engaged with today's content" (read / marked done / acted on it). Streaks are computed from completions. | Streaks are the documented retention lever (LAUNCH §6). The schema must carry the state the UX already depends on. |
| **D4** | **`content_type` vs `category`.** AI-driving taxonomy vs visual/organizational taxonomy. | PLANNING (`content_type`) vs design-system (Category: Wellbeing/Work/Personal/Health w/ color dot). | Keep **`content_type`** (reflection \| motivation \| habit \| story \| journal \| learning \| custom) as the single MVP taxonomy — it drives both Claude generation **and** the card's color accent. **`category` (the design-system color-dot field) is deferred to post-MVP** as an optional organizational tag. | One axis for MVP. content_type is load-bearing (it shapes the prompt); category is cosmetic and can wait. |
| **D5** | **Content buffer depth.** "today + tomorrow" vs "7+ days". | PLANNING §3.5 / LAUNCH §6 ("today+tomorrow") vs NOTIFICATIONS §2 ("buffer 7+ days"). | **Buffer 7 days ahead** (configurable `CONTENT_BUFFER_DAYS=7`). Generate today synchronously at creation; buffer the next 6 days; top up on every foreground. | NOTIFICATIONS §2 is the deeper analysis and wins: background fetch is best-effort, so a deep buffer is the reliability mechanism. Buffer rows are SQLite, not notification slots — cheap with Haiku. |
| **D6** | **Frequency scope for MVP.** Daily-only vs full cadence set. | PLANNING (Daily only) vs design-system C3 (Never/Daily/Weekdays/Weekly/Custom) vs BACKEND (full enum). | **MVP ships `daily` + `weekdays`.** Defer `weekly`, `custom_days`, `multiple_daily`. UI shows only the two shipped options at v1 (no dead controls). | Weekdays is cheap and the UI already implies it; but custom/multiple multiply the iOS 64-trigger budget (NOTIFICATIONS §2) and add scheduling complexity not worth v1. |
| **D7** | **Onboarding length & shape.** 3 vs 4 vs 4+generate+paywall. | PLANNING (3) vs design-system A (4) vs LAUNCH §5 (4 + live generation + soft paywall). | **Adopt LAUNCH §5:** Welcome → Promise → Set first intention → **Generate first content live** → Notification permission (with preview) → Soft paywall (annual default, 7-day trial) → Home (seeded). | The live-generation "wow" before the paywall is the documented Day-0 conversion + activation lever. |
| **D8** | **Navigation structure.** PLANNING flat routes vs design-system 4-tab. | PLANNING (`onboarding/home/create/item[id]`) vs design-system §C/§B (Today/Upcoming/Reflect/Settings tabs + FAB). | **Adopt the 4-tab structure** (Today · Upcoming · Reflect · Settings) with a FAB-launched create sheet and a content-detail route. PLANNING's routes map onto these tabs (§9.2). | design-system is the UI source of truth; PLANNING's route list was illustrative. |
| **D9** | **App stack.** Expo/RN firmly vs "Expo or Flutter". | PLANNING (Expo/RN, mirror DuoBrain) vs design-system §04 (RN *or* Flutter). | **Expo + React Native + expo-router + TypeScript.** | Matches Josh's existing stacks (DuoBrain, forge); design-system tokens are platform-neutral and map cleanly. No reason to introduce Flutter. |
| **D10** | **Create-sheet content.** Manual "title + note + category + reminder toggle" vs AI "type + free-text intent". | design-system C1 vs PLANNING §2. | **Merged create sheet:** a **content-type chip row** + a single **free-text intent field** (doubles as the card title and the Claude prompt) + **Time** + **Repeat (Daily/Weekdays)** + **Reminder toggle (on by default)**. The design-system "note" and "category" fields are dropped for MVP (intent replaces note; type replaces category). | One field the user fills (intent) drives everything. Avoids asking the user to author content they came to the app to *not* author. |
| **D11** | **Backend statefulness for MVP.** Stateless proxy vs full Postgres cloud. | PLANNING/NOTIFICATIONS (stateless proxy) vs BACKEND (30-table Postgres). | **MVP backend = stateless Express proxy** (forge pattern), one `POST /generate` route, no DB. The full Postgres schema in BACKEND is the **Phase 5 (cloud) target** the local schema is shaped to grow into — not built at MVP. | Ship the local-first MVP first; the cloud is a later, independently shippable phase. |
| **D12** | **Default model.** Reference says Opus 4.8 default; PLANNING picks Haiku. | claude-api default vs PLANNING §4. | **`claude-haiku-4-5` is the workhorse default**; **`claude-sonnet-4-6`** is the Daily Plus "premium quality" toggle. Model lives in one env var (`ANTHROPIC_MODEL`). Never Opus for this workload. | Daily content is short, high-volume, cost/latency-sensitive — Haiku's lane. Unit economics (§6, §10). |

**Aliases to retire (do not use in code):** "prompt" as the entity name (use *Daily / daily_item*), "reminder" as the entity name (use *Daily*; "reminder" only means *the notification*), "item" alone (always *Daily item*).

---

## 2. Product requirements

### 2.1 One-liner
**Daily turns one sentence — "a 2-minute stoic reflection each morning" — into fresh, Claude-generated content delivered every day as a calm notification, written just for you.**

### 2.2 Target user
Self-improvement-minded people 18–45, iOS-first, comfortable with subscription wellness apps (Stoic, Finch, I Am, Calm). Wedge = **natural-language personalization** instead of a fixed deck of canned quotes; brand = **calm/warm** instead of gamified/clinical.

### 2.3 Positioning (binding for all copy)
> For self-improvement-minded people who want a daily ritual without building it themselves, **Daily** is an AI daily-companion that turns a sentence into fresh, personalized content delivered as a calm daily nudge — unlike Stoic/I Am/Finch which serve fixed libraries, **Daily writes something new for you every day, in the tone you ask for.**

Positioning pillars (every screen/asset maps to one): **Personal · Fresh · Calm · Effortless**.

### 2.4 MVP feature list (v1 — ship this)
- [ ] **Onboarding** (D7 flow): Welcome → Promise → Set first intention → **live first generation** → notification permission (with preview) → soft paywall → seeded Home.
- [ ] **Create a Daily**: content-type chip + free-text intent + time + frequency (Daily/Weekdays) + reminder toggle (D10).
- [ ] **Claude generation** via stateless backend proxy; structured output; Haiku default.
- [ ] **Content buffer**: generate today + 6 days ahead; top up on foreground (D5).
- [ ] **Local scheduled notification** (one repeating trigger per Daily) with deep link (D11, §7).
- [ ] **Home "Today"**: serif greeting, today's content cards grouped by time of day, progress ring.
- [ ] **Content detail**: today's content, date, mark-done/complete, history list.
- [ ] **Completion + streaks** (non-punishing) — D3.
- [ ] **Edit / pause / delete** a Daily (reschedule/cancel notifications accordingly).
- [ ] **Settings**: appearance (System/Light/Dark), notifications, default time, premium entry.
- [ ] **Premium paywall** (RevenueCat + StoreKit 2): free tier (1–2 active Dailies) vs Daily Plus.
- [ ] **Local persistence** (SQLite) — works offline once content is generated.
- [ ] **Privacy policy + App Privacy labels + AI-content disclosure**.

### 2.5 Post-MVP (explicitly deferred)
History calendar & insights; regenerate / "give me another" (Plus, metered for free via credits); weekly review; widgets (home + lock-screen rotating today's content); custom/weekly/multiple-per-day cadences; categories (D4); themes & app icons (Plus); share-as-image; evening "wind-down" mode; Sonnet quality toggle; **cloud sync + Sign in with Apple + Postgres backend** (Phase 5); social/sharing (Phase 6); In-App Events.

### 2.6 Monetization (binding)
| Plan | Price | Contents |
|---|---|---|
| **Free** | $0 | 1–2 active Dailies, today's content, basic light/dark theme, completion + streak (basic). |
| **Daily Plus — Yearly** | **$29.99/yr** (default, preselected) | "7 days free, then $29.99/yr", "BEST VALUE · Save 37%". |
| **Daily Plus — Monthly** | **$3.99/mo** | secondary option. |
| **Lifetime** (post-launch) | **$79.99** | added after annual conversion is proven. |

**Behind Daily Plus:** unlimited Dailies & content-types · themes & app icons · reflection history & insights · streak stats & weekly review · gentle evening wind-down mode · regenerate ("give me another") · (later) Sonnet quality toggle · widgets · cloud sync.
**Trial:** 7-day free, annual only, once per user. **Paywall:** soft, dismissible (close ✕), no countdown/scarcity, at end of onboarding (LAUNCH §2).
**Unit-economics guardrail:** free tier caps active Dailies (1–2) + Haiku + `max_tokens` cap + backend rate limit. Claude cost/active-user/month must stay well under ARPU.

### 2.7 Non-goals for v1
No account/login (anonymous device ID only), no cloud sync, no server push, no social/sharing, no manual free-form "to-do reminders" without AI content, no custom cadences, no widgets.

---

## 3. Domain model & canonical vocabulary

### 3.1 Entities
- **Daily** (`daily_item`) — a recurring intent the user created. Fields: `type`, `intent`, `time_of_day`, `frequency`, `status`, timestamps. Produces content and fires one repeating notification.
- **Content entry** (`content_entry`) — one piece of Claude-generated content for one `(Daily, date)`. Carries `title`, `body`, optional `structured` jsonb, `model`, and **`completed_at`** (D3).
- **Notification** (`notification`) — maps a Daily to a scheduled OS notification id (for cancel/reschedule), with a `transport` column (`local` | `push`) future-proofing server push (NOTIFICATIONS §3).
- **Streak** (derived) — computed from `content_entry.completed_at`; persisted as a rollup post-MVP.

### 3.2 Conceptual → physical name map (use everywhere)
| Concept | UI noun | Local table (MVP) | Cloud table (Phase 5) |
|---|---|---|---|
| The recurring intent | "a Daily" | `daily_item` | `daily_items` (⚠ was `prompts` in BACKEND — renamed) |
| Generated content | "today's content" / card | `content_entry` | `content_entries` |
| Scheduled cadence | (implicit in Daily for MVP) | columns on `daily_item` | `schedules` (split out) |
| OS notification handle | "reminder" | `notification` | `notifications` |
| Completion | "done" | `content_entry.completed_at` | `content_entries.completed_at` |

### 3.3 Enumerations (canonical)
```
content_type   : reflection | motivation | habit | story | journal | learning | custom
frequency      : daily | weekdays          # MVP. post-MVP: weekly | custom_days | multiple_daily
daily_status   : active | paused           # post-MVP: archived
gen_status     : ready | failed | refusal  # MVP synchronous. post-MVP: queued | running
transport      : local | push              # MVP local only
```

---

## 4. Database schema

Two tiers. **MVP = local SQLite (§4.1) — build this.** Cloud Postgres (§4.2) is the Phase-5 target; included so the local schema is shaped to grow into it 1:1.

### 4.1 MVP — local SQLite (on device, `expo-sqlite`)

```sql
-- A Daily: one row per recurring intent the user created.
CREATE TABLE daily_item (
  id            TEXT PRIMARY KEY,      -- uuid v4 (client-generated)
  type          TEXT NOT NULL,         -- content_type enum (§3.3)
  intent        TEXT NOT NULL,         -- user free-text, <=500 chars; also the card title source & Claude prompt
  title         TEXT,                  -- optional short label (defaults to a truncation of intent)
  tone          TEXT,                  -- optional: 'warmer'|'drier'|'funnier'|null (post-MVP UI; column now)
  time_of_day   TEXT NOT NULL,         -- 'HH:MM' local wall-clock
  frequency     TEXT NOT NULL,         -- 'daily'|'weekdays'
  status        TEXT NOT NULL,         -- 'active'|'paused'
  reminder_on   INTEGER NOT NULL DEFAULT 1,  -- bool: schedule a notification?
  position      INTEGER NOT NULL DEFAULT 0,   -- manual home sort
  created_at    TEXT NOT NULL,         -- ISO8601 UTC
  updated_at    TEXT NOT NULL
);

-- Generated content: one canonical row per (Daily, date). variant supports future regenerate.
CREATE TABLE content_entry (
  id            TEXT PRIMARY KEY,      -- uuid
  item_id       TEXT NOT NULL REFERENCES daily_item(id) ON DELETE CASCADE,
  for_date      TEXT NOT NULL,         -- 'YYYY-MM-DD' (the Daily's local date)
  variant       INTEGER NOT NULL DEFAULT 0,  -- 0=primary; 1+=regenerations (post-MVP)
  title         TEXT,
  body          TEXT NOT NULL,
  tone          TEXT,
  structured    TEXT,                  -- JSON string for type-specific fields (learning: {phrase,translation,example})
  model         TEXT,                  -- 'claude-haiku-4-5' | 'claude-sonnet-4-6'
  gen_status    TEXT NOT NULL DEFAULT 'ready',  -- 'ready'|'failed'|'refusal'
  completed_at  TEXT,                  -- D3: null until the user marks done / engages
  created_at    TEXT NOT NULL,
  UNIQUE(item_id, for_date, variant)
);

-- Notification handle: lets us cancel/reschedule the OS notification on edit/pause/delete.
CREATE TABLE notification (
  id            TEXT PRIMARY KEY,      -- the expo-notifications identifier
  item_id       TEXT NOT NULL REFERENCES daily_item(id) ON DELETE CASCADE,
  transport     TEXT NOT NULL DEFAULT 'local',  -- 'local'|'push' (NOTIFICATIONS §3 seam)
  scheduled_for TEXT NOT NULL,         -- next fire time (local wall-clock 'HH:MM' descriptor)
  created_at    TEXT NOT NULL
);

CREATE INDEX idx_content_item_date ON content_entry(item_id, for_date DESC);
CREATE INDEX idx_content_completed ON content_entry(completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX idx_notification_item ON notification(item_id);
```

**Migration note:** ship a versioned migration runner from day one (`schema_version` pragma/table) so the cloud-sync migration in Phase 5 is additive, not a rewrite.

**Prefs (MMKV or a `kv` table), not in SQLite necessarily:** `appearance` (system/light/dark), `default_time`, `week_starts_on`, `streaks_enabled`, `evening_reflection_enabled`, `badge_enabled` (default off), `onboarding_complete`, `anon_device_id`, `notification_permission_state`.

### 4.2 Cloud — Postgres 16+ (Phase 5 target; do NOT build at MVP)

The full design lives in `BACKEND-SCHEMA-API.md` and remains valid **with these binding amendments**:

1. **Rename `prompts` → `daily_items`** everywhere (D2). Keep `template_id`, `intent`, `type`, `tone`, `status`, `model_pref`, `position`.
2. **Add `completed_at timestamptz` to `content_entries`** and a `daily_streaks(user_id, current_len, longest_len, last_completed_date, updated_at)` rollup (D3).
3. Keep the cluster set: Identity (`users`, `devices`, `auth_identities`), Core (`daily_items`, `schedules`, `prompt_templates`), Generation (`content_entries`, `generation_jobs`), Notifications (`notifications`), Billing (`subscriptions`, `user_entitlements`, `subscription_events`, `credit_ledger`), Analytics (thin first-party + PostHog), Social (Phase 6).
4. Conventions stand: UUID v7 PKs, snake_case, `timestamptz` UTC, soft-delete on user content, integer cents for money, **Postgres RLS** on every user-owned table, IANA tz + computed `next_run_at`, jsonb `structured` for type-specific fields.
5. **Local→cloud mapping is 1:1 + `user_id`** — the anonymous `users` row already exists from first launch; Sign in with Apple *claims* it (preserves offline-created Dailies). First sync = `POST /v1/devices` then push local rows (last-write-wins per row via `updated_at`).

Cluster build order (each independently shippable): **P5a** accounts+sync → **P5b** server gen + push → **P5c** premium → **P5d** analytics → **P6** social. See roadmap.

---

## 5. API design

### 5.1 MVP — stateless proxy (build this)

Express (ESM `.mjs`), forge pattern: `helmet` + `express-rate-limit` + CORS + `dotenv` + a client-token gate + official `@anthropic-ai/sdk`. **No database.** The app never sees `ANTHROPIC_API_KEY`; it sends `Authorization: Bearer <BACKEND_CLIENT_TOKEN>`.

| Method | Path | Body | Returns | Notes |
|---|---|---|---|---|
| `GET` | `/healthz` | — | `{ ok, anthropic: <bool configured> }` | copy from forge |
| `POST` | `/generate` | `{ type, intent, date, tz, model? }` | `{ content: { title?, body, tone?, structured? }, meta: { model, input_tokens, output_tokens } }` | rate-limited; `intent` trimmed ≤500 chars server-side; `model` only honored if Plus (server can't verify at MVP → accept but default Haiku) |

**Errors** (single envelope): `{ "error": { "code", "message", "details?" } }`. Map Anthropic SDK errors → `502`; rate limit → `429` + `Retry-After`; bad input → `400`; missing/invalid client token → `401`.

**Generation semantics:** synchronous. The app calls `/generate` once per `(Daily, date)` it needs (today at creation + buffer fill). The backend is stateless — it does not know about Dailies, notifications, or buffers; the **app** owns the buffer loop and caches results in SQLite.

### 5.2 Cloud — REST `/v1` (Phase 5; from BACKEND §10, amended)

Adopt BACKEND §10 wholesale with D2 rename applied (`/v1/prompts*` → `/v1/dailies*`). Highlights:
- **Auth:** `/v1/auth/anonymous`, `/v1/auth/apple`, `/v1/auth/refresh`, `/v1/me` (+ `DELETE /v1/me` for Apple-required account deletion, `GET /v1/me/export` for GDPR).
- **Dailies & schedules:** CRUD on `/v1/dailies`, `/pause` `/resume` `/reorder`, `/v1/dailies/:id/schedules`.
- **Content & generation:** `GET /v1/content/today` (home payload), `GET /v1/dailies/:id/content` (history), `POST /v1/dailies/:id/generate` (enqueue async job, `Idempotency-Key`), `POST /v1/content/:id/regenerate` (Plus/credit), `POST /v1/content/:id/complete` (D3 completion sync), `GET /v1/jobs/:id`.
- **Notifications:** `POST /v1/notifications/events` (delivered/opened/dismissed telemetry), `POST /v1/webhooks/expo-receipts`.
- **Subscriptions:** `GET /v1/subscription`, `POST /v1/subscriptions/sync`, webhooks for RevenueCat / App Store Server Notifications v2 / Play RTDN.
- **Ops:** `/healthz` (+ `db`, `queue`), admin metrics/moderation.
- **Conventions:** cursor pagination, `Idempotency-Key` on costly mutations, per-user + per-IP rate limits (tighter on generate), additive `/v1` versioning.

**Workers (cloud only):** generation worker (scan `schedules.next_run_at`), notification worker (Expo push + receipts), entitlement reconciler (drains `subscription_events`), nightly rollup, GDPR purger.

---

## 6. Claude integration architecture

### 6.1 Model policy
- **Default workhorse:** `claude-haiku-4-5` (short, high-volume, cost/latency-sensitive — its lane; ~$1/$5 per 1M tok).
- **Premium quality toggle (Daily Plus):** `claude-sonnet-4-6`.
- **Never Opus** for this workload.
- One env var `ANTHROPIC_MODEL` (default Haiku); per-request `model` override accepted only for entitled users (enforced server-side once cloud auth exists; at MVP the proxy can't verify entitlement, so it defaults Haiku and ignores untrusted upgrades).
- Use the **official `@anthropic-ai/sdk`** (typed errors + retries), not raw fetch.

### 6.2 Request flow (MVP)
```
App saves a Daily  ──► http POST {BACKEND_URL}/generate  (Bearer client token)
                         body { type, intent, date:"2026-06-14", tz:"America/Denver" }
Backend  ──► validate + rate-limit + trim intent(≤500)
         ──► Anthropic Messages API:
               model: ANTHROPIC_MODEL
               system: <cached system prompt>            (prompt caching → ~0.1× input cost)
               max_tokens: ~400                           (tight output, bounded cost)
               output_config.format: <json_schema>        (structured, parseable — NOT prefill)
         ──► parse first text block as JSON
         ──► return { content, meta:{ model, input_tokens, output_tokens } }
App  ──► store content_entry (item_id, for_date) in SQLite + (re)schedule notification
```

### 6.3 System prompt (server-side, prompt-cached behind a `cache_control` breakpoint)
```
You are Daily, a generator of short, high-quality daily content.
You produce ONE piece of content for ONE day based on the user's intent and content type.

Rules:
- Concise and self-contained: readable in under 60 seconds.
- Match the requested TYPE (reflection, motivation, habit nudge, micro-story,
  journaling prompt, learning drip).
- Be specific and fresh; never repeat generic filler. Vary phrasing day to day
  (the date is provided to help you differ).
- Warm but not saccharine. No emoji unless the type clearly calls for it.
- Never give medical, legal, financial, or crisis advice. If the intent implies
  self-harm or crisis, return gentle, non-clinical encouragement plus a note to
  reach out to a professional or hotline.
- Output ONLY the structured fields requested. No preamble.
```

### 6.4 Structured output (no prefill — prefill 400s on current models)
```json
{
  "format": {
    "type": "json_schema",
    "schema": {
      "type": "object",
      "properties": {
        "title":      { "type": "string" },
        "body":       { "type": "string" },
        "tone":       { "type": "string" },
        "structured": { "type": "object" }
      },
      "required": ["body"],
      "additionalProperties": false
    }
  }
}
```
Backend parses the first text block as JSON → returns `{ content }`. `structured` absorbs per-type shape (learning → `{phrase, translation, example}`; story → `{genre}`).

### 6.5 Safety & quality
- **Refusal handling:** if `response.stop_reason === "refusal"` → return a calm fallback body (not an error) and set `gen_status='refusal'`. The system prompt also routes crisis intent to gentle, non-clinical encouragement + a note to reach a professional — reviewers look for this (App Store §10).
- **Cost determinism:** `max_tokens` cap + rate limit + Haiku + free-tier item cap. Watch cost-per-generation weekly.
- **Input hygiene:** trim/limit `intent` to 500 chars server-side before sending; never log raw intent beyond what's needed.

### 6.6 Caching & storage
- **Prompt caching (server):** system-prompt prefix cached across all users/requests.
- **Content storage (client):** each `content_entry` persisted in SQLite keyed by `(item_id, for_date, variant)` — a day's content is generated **once**, reused on re-open / offline / notification tap.
- **Pre-generation buffer (D5):** generate today at creation, buffer 6 more days, top up on foreground. A notification never fires without ready content.
- **Optional later (cloud):** server cache for identical `(type, intent_hash, for_date)` to share generations across users on the same template.

---

## 7. Notification architecture

**Binding model: local-first** (NOTIFICATIONS.md), with a clean seam for server push later.

### 7.1 The load-bearing idea
Decouple **when it fires** (a scheduling problem — local notifications excel) from **what it shows** (a content problem — lives in SQLite). The notification carries a **generic teaser + deep link**; the AI content is read from the local buffer on tap. This is why the MVP needs **zero push infrastructure** and is *correct*, not just expedient.

### 7.2 MVP behavior (100% local, `expo-notifications`)
- **One repeating calendar trigger per active Daily** (`{ hour, minute, repeats: true }` for `daily`; 5 weekly triggers for `weekdays`). Wall-clock — stays correct through DST and travel automatically. **Never** schedule N one-shots.
- **Teaser body**, no AI content: e.g. "Your daily reflection is ready ✨". `data: { itemId }` → deep link `daily://item/:id`.
- **Content buffer:** generate today + 6 days at creation; top up on every foreground; lazy-generate on tap if a day was missed (needs network; buffer makes this rare).
- **Deep link:** `daily://item/:id` → expo-router → content detail → read today's `content_entry` (instant, offline).

### 7.3 Two hard constraints engineered around
1. **iOS 64-pending-notification cap (per app, OS-enforced).** Each active Daily = exactly one repeating trigger (daily) or 5 (weekdays). Free tier (1–2 Dailies) sits far under budget; meter total triggers and gate power-cadences behind Plus. **`rescheduleAll()` on every app launch** (covers reinstall — iOS clears scheduled notifications — permission re-grant, OS housekeeping).
2. **Content readiness ≠ notification firing.** The notification always fires; the risk is tapping into no content because background fetch is best-effort. Mitigations in priority order: **deep 7-day buffer** (SQLite rows, not notification slots) → **foreground top-up** (most reliable signal) → **lazy generate on tap**.

### 7.4 Lifecycle (local, MVP)
| Action | Notification side | Content side |
|---|---|---|
| Create | schedule 1 repeating trigger; save id+transport | generate today + buffer 6 days |
| Edit time/cadence | cancel old id(s) → schedule new → save | no change (content is date-keyed, not time-keyed) |
| Pause | cancel id(s), keep rows | keep buffered content |
| Resume | reschedule | top up if stale |
| Delete | cancel id(s) | cascade-delete `content_entry` |
| App launch | `rescheduleAll()` | top up buffer |
| Permission denied | no notifications; in-app "Today" still works | unaffected |

### 7.5 Android specifics
- Calendar triggers are fine for a daily ritual (±minutes ok); only request `SCHEDULE_EXACT_ALARM`/`USE_EXACT_ALARM` if minute-precision becomes a requirement.
- OEM Doze/battery-optimization kills background work → affects **content pre-gen**, not the trigger. Deep buffer + foreground top-up is the mitigation; never depend on background fetch on Android.
- Create a single **"Daily reminders" channel** (importance HIGH), required on Android 8+.

### 7.6 The seam for server push (Phase 5b — build the seam now, not the feature)
- `scheduler.ts` exposes a **provider interface**: `schedule(daily)` / `cancel(daily)` / `rescheduleAll()`. A future `PushScheduler` implements the same surface; screens never change.
- `notification.transport` column (`local`|`push`) exists from day one (§4.1).
- `tz` is already captured in the `/generate` payload, so the server already knows each user's timezone when push arrives.
- Push earns its place only for: fresh AI content **on the lock screen** (body *is* the content), re-engagement ("you haven't journaled in 3 days"), or cross-device. Even then, local stays the offline + timezone-correct backbone; push is additive. Use **Expo Push (EAS)**, not raw APNs/FCM.

### 7.7 Notification voice (binding copy rules, design-system §F)
Warm, second-person, invitational ("Time for…", "A moment to…", "Return to…"). **Never** "overdue / failed / don't forget / urgent / streak lost". App-icon badge **off by default**. Group multiple due Dailies into one ("3 reminders this morning"). Single soft chime; respect Focus/DND; Premium wind-down suppresses evening pushes. Evening reflection ("How did today feel?") is a distinct opt-in second touchpoint → deep-links into Reflect.

---

## 8. Authentication architecture

### 8.1 MVP — anonymous, device-scoped
- On first launch, generate an **anonymous device ID** (UUID) stored in **SecureStore**. No login, no account screen.
- The app authenticates to the **backend proxy** with the shared `BACKEND_CLIENT_TOKEN` (forge pattern) sent as `Authorization: Bearer`.
- ⚠ **The client token is not a real secret** — it ships in the bundle (`EXPO_PUBLIC_*` is embedded, not secret). It only gates *casual* proxy abuse. The real secret (`ANTHROPIC_API_KEY`) lives **only** on the backend. Acceptable for MVP abuse-gating.
- All Dailies/content/completions live locally; nothing requires an account.

### 8.2 Phase 5 — real accounts (when cloud sync ships)
- **Sign in with Apple** is the primary, lowest-friction, App-Store-friendly choice (Google flow reusable from DuoBrain if wanted).
- **Anonymous-first claiming:** a `users` row exists from first launch (`is_anonymous=true`); Apple sign-in **claims** the existing anonymous user (attaches an `auth_identities` row, flips `is_anonymous`, sets `claimed_at`) — **preserving all offline-created Dailies/content**.
- **Tokens:** JWT access (~15 min) + rotating refresh; store refresh-token *hashes* server-side (`auth_sessions`) for revocation. Anonymous users get a token too (`/v1/auth/anonymous`); scopes widen after claim.
- **Per-device tokens** minted by the backend at first launch replace the shared client token for stronger proxy protection.

### 8.3 Account deletion / privacy (Apple Guideline 5.1.1(v))
`DELETE /v1/me` → soft-delete then purge job; cascade/anonymize across all clusters; `GET /v1/me/export` for GDPR export.

---

## 9. UI architecture

Design-system docs are the binding visual source of truth. Tokens in `design-system/tokens.css` + `tokens.json`. **Components consume semantic tokens only** (`--color-accent`), never raw ramp steps — CI fails the build on raw hex.

### 9.1 Brand & foundations (binding)
- **Warm paper light theme**, **ink-dusk dark theme**. Signature accent **Clay 500 `#C75F3D`**; support accent **Sage 500 `#62804F`** (success/streak/complete); tertiary **Dusk** (evening/info/dark anchor); neutral backbone **Sand**.
- **Type:** reflective **serif** (Newsreader free default; Tiempos/GT Sectra licensed upgrade behind `--font-serif`) used *sparingly* (greetings, quotes, big numerals, prompts); working **sans** (Inter, tabular figures for numbers). Modular scale ≈1.2, base 16px.
- **Errors = desaturated rose-clay, never pure red. Warnings = amber, never red.** Daily never scolds.
- **Spacing** 4px grid; **radius** soft everywhere (sm10/md14/lg20/xl28/2xl36/full); **shadows** soft warm low (Sand 900 @ low alpha); **motion** gentle ease-out, honor Reduce Motion.
- **Accessibility (non-negotiable):** body text AAA (≥7:1), secondary AA; touch targets ≥44×44pt; screen-reader labels on every icon button; meaning never by color alone; full Dynamic Type support (cap display ~1.3×, never disable).

### 9.2 Navigation (D8) — expo-router structure
```
src/app/
  _layout.tsx              # Stack + providers: QueryClient, ThemeProvider, notifications init, deep-link handler
  index.tsx                # entry → redirect to onboarding (if !onboarding_complete) or tabs
  onboarding/              # D7 flow (welcome, promise, intention, generating, permission, paywall)
    _layout.tsx
    index.tsx ...
  (tabs)/
    _layout.tsx            # Tab bar: Today · Upcoming · Reflect · Settings  (+ FAB overlay)
    today.tsx              # Home "Today" (§B): greeting, today's content cards, progress ring
    upcoming.tsx           # scheduled-ahead view of Dailies
    reflect.tsx            # streaks, history, evening reflection (premium-gated stats)
    settings.tsx           # §D grouped settings
  item/[id].tsx            # content detail: today's content, mark-done, history, edit/pause/delete
  create.tsx               # presented as a bottom-sheet modal (FAB) — create/edit a Daily
  +not-found.tsx
```
**Deep link:** scheme `daily`, `daily://item/:id` → `item/[id].tsx`.

### 9.3 Screen specs (binding wireframes in design-system/03-screens.md)
- **Onboarding (§A + D7):** Welcome (serif hero, sunrise) → Promise (calm carousel) → **Set first intention** (free-text + suggestion chips + time picker, default 8:00 AM) → **Generating** (show AI actually writing — the "wow") → Permission (live notification preview card → OS prompt; "Maybe later" ghost) → **Soft paywall** (annual default, 7-day trial, ✕ dismissible) → **seeded Home**.
- **Home "Today" (§B):** serif time-aware greeting + date; today's content cards grouped by time-of-day (Morning/Afternoon/Evening); day **progress ring** (sage, n/m done); FAB (+); tab bar. Empty variant = soft sunrise empty state. Evening variant = dusk-tinted wash + reflection invite.
- **Create sheet (§C + D10):** bottom sheet, large detent. **Content-type chips** → **intent field** (autofocus, "What would you like help with each day?") → **Time** row (wheel + presets Morning/Midday/Evening) → **Repeat** (Daily/Weekdays only at MVP) → **Reminder toggle** (on by default). Save disabled until intent exists; light haptic + "Saved" toast; spring dismiss. Edit reuses with prefilled values + destructive "Delete" row (confirm dialog).
- **Content detail (`item/[id]`):** today's content card (serif title where reflective), date, **mark-done** (sage completion animation — the signature 300ms moment), history list of past `content_entry` rows, edit/pause/delete.
- **Settings (§D):** profile/anon header, **Premium card** (clay→sage gradient, always visible until subscribed), General (Notifications, Appearance System/Light/Dark, Default time, Week starts on), Reflection (reflection prompt toggle, streaks toggle), About (Rate, Support, Privacy policy, Version). Appearance sub-screen: segmented System/Light/Dark + locked premium theme gallery.
- **Premium upsell (§E):** bottom sheet, ✕ dismissible, benefit list (sage checks), 2-plan selector (yearly preselected, BEST VALUE), "7 days free then $29.99/yr", primary CTA, **Restore · Terms · Privacy** (never gate Restore).
- **Notification previews (§F):** lock-screen / expanded-with-actions (Mark done / Snooze / Edit) / banner / evening reflection. Voice rules per §7.7.

### 9.4 Component library (design-system/02-components.md — build as the foundation)
Button (5 variants, pill, 3 sizes) · Icon button · FAB · **Content/Reminder card** (with completion checkbox + animation + swipe actions) · List row · Text field · Toggle · Segmented control · Chip/tag · Time/date picker (wheel + presets) · Repeat selector · Tab bar · Top app bar (collapsing large serif title) · Sheet · Dialog · Toast · **Progress ring & streak badge** · Empty state · Loading skeletons.

### 9.5 Front-end stack (D9)
Expo + React Native + expo-router + TypeScript, mirroring DuoBrain (`@/*`→`src/*`, `typedRoutes`). `StyleSheet` + small component library + `theme.ts` (no NativeWind needed). **TanStack Query** for async (generation, refresh) + a thin local store over SQLite. No Redux. Token pipeline: Style Dictionary `tokens.json` → typed TS theme; theme provider swaps semantic token sets for System/Light/Dark (+ premium theme sets layered on top, entitlement-gated).

---

## 10. App Store requirements

### 10.1 Listing & ASO (LAUNCH §3, binding)
- **Category:** Primary **Health & Fitness** (highest-converting; right audience), fallback **Lifestyle** if review friction on mental-health adjacency.
- **App name (30):** `Daily: AI Journal & Reflect`. **Subtitle (25):** `Reminders written for you`. **Keyword field (100, draft):** `affirmation,gratitude,mood,habit,mindful,intention,morning,evening,motivation,stoic,wisdom,prompt` (no spaces after commas, singular only, never repeat title/subtitle words, no competitor brands).
- **Strategy:** own the AI-personalization long-tail (`ai journaling`, `daily stoic`, `morning/evening reflection`, `daily affirmation widget`). Validate difficulty (<~30) via AppFigures/AppTweak before locking. Avoid `meditation`/`affirmations` (difficulty 100/96).
- **Screenshots:** 6 portrait frames, caption <5 words (OCR-indexed = keywords): (1) Your AI daily ritual (2) Just say what you need (3) Written fresh, every day (4) Gentle nudges, not alarms (5) Reflect & build streaks (6) Themes, history & more. Lean on the warm paper brand. A/B test via Custom Product Pages.
- **Custom Product Pages:** ≥3 themed (AI/personalization · stoic/reflection · habits/reminders), each with own keywords; point ASA at matching CPP.
- **In-App Events** (post-launch discovery): "7-Day Stoic Reset" (evergreen), seasonal resets.
- **Ratings velocity:** `SKStoreReviewController` after a positive moment (5th day's content, 3-day streak) — never on a paywall or error. Generous free tier fuels install→rating velocity.

### 10.2 Subscriptions (binding)
RevenueCat + StoreKit 2. Free (1–2 Dailies) / Daily Plus Yearly $29.99 (default, 7-day trial) / Monthly $3.99 / Lifetime $79.99 (post-launch). Paywall must show price, period, trial terms, and **Restore / Terms / Privacy** links; never gate Restore. RevenueCat remote-config for paywall/price A/B tests.

### 10.3 Review & privacy readiness (LAUNCH §9, binding — gate for submission)
- [ ] **Privacy policy** live (mandatory) — discloses user intent text is sent to a **third-party AI provider (Anthropic)**.
- [ ] **App Privacy "nutrition" labels:** declare **"User Content"** sent to a third party for app functionality. Must be accurate (mismatch → rejection).
- [ ] **AI-content disclosure** stated plainly in onboarding and listing.
- [ ] **No medical/clinical claims** ("treats anxiety/depression" forbidden). Copy = "reflection", "calm", "ritual", "intention". (Why Lifestyle is the fallback category.)
- [ ] **Crisis handling** in the system prompt (§6.5) — reviewers look for it in wellness apps.
- [ ] **Subscription compliance** (§10.2).
- [ ] **Account deletion** path (§8.3) if/when accounts ship (Apple 5.1.1(v)).
- [ ] **Social/UGC moderation** (`reports` + queue) **before** any sharing ships (Apple 1.2) — Phase 6 gate.

### 10.4 Launch sequencing (LAUNCH §7)
Pre-launch (TestFlight 50–200, metadata + 3 CPPs, privacy policy, ASA account, privacy labels) → Soft launch (verify analytics/crash/paywall events) → ASO ramp (weeks 1–4: keyword iteration, screenshot/paywall A/B, ASA on long-tail) → Push (weeks 4–8: first In-App Event, **widget** update, creator outreach, price test) → Scale (month 3+: Lifetime, cloud sync + Sign in with Apple, localization).

### 10.5 Metrics & guardrails
North-star: **weekly retained users who received & opened today's content.** Activation gates: % reaching "first content generated", notification opt-in rate. Retention targets: D1 ≥35% / D7 ≥22% / D30 ≥12%. Monetization: trial→paid (H&F bench ~37.7%). **Unit-economics guardrail:** Claude cost/active-user/month « ARPU (Haiku + max_tokens cap + free-tier item cap + rate limit).

---

## 11. Cross-cutting: security, privacy, config

### 11.1 Hard constraints
- **`ANTHROPIC_API_KEY` is server-only — NEVER on the client.** All Claude calls go through the backend. (Honored by §5–§6.)
- Rate-limit the proxy (`express-rate-limit`) to bound token spend.
- Intent text is personal → store locally, transmit over HTTPS only, don't log raw intent server-side beyond necessity. Cloud: encrypt at rest, RLS, verify webhook signatures.
- No secrets in repo; `.env` git-ignored; `.env.example` only.

### 11.2 Environment variables
**Backend** (`backend/.env`, never committed):
```
PORT=8080
ALLOWED_ORIGIN=*
BACKEND_CLIENT_TOKEN=<shared secret the app sends as Bearer>
ANTHROPIC_API_KEY=<server-only, NEVER shipped to client>
ANTHROPIC_MODEL=claude-haiku-4-5
RATE_LIMIT_PER_MIN=60
CONTENT_MAX_TOKENS=400
INTENT_MAX_CHARS=500
```
**App** (`.env` via `EXPO_PUBLIC_*`, embedded in bundle — NOT secret):
```
EXPO_PUBLIC_BACKEND_URL=https://daily-backend.fly.dev
EXPO_PUBLIC_BACKEND_CLIENT_TOKEN=<same shared token>
CONTENT_BUFFER_DAYS=7
```

### 11.3 Repo layout (binding)
```
DAILY/
  docs/                    # master-spec.md (this), development-roadmap.md, planning inputs
  design-system/           # tokens + visual specs (source of truth for UI)
  app/ (repo root)         # Expo app — scaffold mirroring DuoBrain
    app.json babel.config.js tsconfig.json package.json
    src/app/ ...           # expo-router (§9.2)
    src/components/ src/features/ src/lib/ src/data/
  backend/                 # Express proxy — scaffold mirroring forge/backend (Phase 2)
    server.mjs routes/generate.mjs lib/anthropic.mjs .env.example Dockerfile fly.toml
```
Single-repo (app at root + `backend/` subfolder); split to monorepo later only if needed. Bundle id `com.daily.app`, scheme `daily`.

---

## 12. Glossary
- **Daily** — the recurring intent a user creates (table `daily_item`). Not "prompt", not "reminder".
- **Intent** — the user's free-text request; doubles as card title source and the Claude prompt input.
- **Content entry** — one day's Claude-generated content for one Daily.
- **Reminder** — *only* means the OS notification that fires; never the entity.
- **Buffer** — the 7-day-ahead set of pre-generated `content_entry` rows.
- **Completion** — `completed_at` on a content entry; the engagement marker that drives streaks.
- **Teaser** — the generic notification body (no AI content); content is read on tap from the buffer.
- **Daily Plus** — the premium subscription tier.
</content>
</invoke>
