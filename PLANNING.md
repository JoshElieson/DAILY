# Daily — Technical & Product Plan

> Status: **planning only** (no app code yet). Greenfield repo at `C:\Users\Josh\desktop\DAILY`.
> Author: senior mobile architect pass, 2026-06-13.
> Stack is chosen to match the patterns already in your other desktop projects (DuoBrain, forge) so this feels like *your* codebase, not a new one.

---

## 0. One-line summary

**Daily** turns a short user request ("help me journal", "give me a 2-minute stoic reflection", "nudge me to drink water") into recurring, Claude-generated daily content delivered as scheduled local notifications — with the Claude API key safely behind a thin backend proxy.

---

## 1. Product Outline

### Core idea
A personal "daily content engine." The user describes what they want help with; the app sends that intent to Claude, gets back high-quality content, and schedules it to appear each day at a chosen time. One app, many content *types* (reminders, reflections, micro-stories, motivation, journaling prompts, habit nudges).

### Target user
- People who want a lightweight daily ritual without building it themselves (journalers, habit-builders, self-improvement crowd).
- Age ~18–45, iOS-first, comfortable with subscription apps like Stoic, Finch, I Am, Calm.
- The wedge: **personalization via natural language** instead of a fixed library of canned affirmations.

### Main use cases
1. **Daily reflection / journaling prompt** — "Give me a thoughtful journaling prompt each morning."
2. **Motivational message** — "Send me one short, non-cheesy motivational line at 7am."
3. **Habit nudge** — "Remind me to stretch, but make it feel different each day."
4. **Micro-story / serialized content** — "Tell me a 1-paragraph sci-fi story each night."
5. **Learning drip** — "Teach me one Spanish phrase a day with an example."

### MVP feature list (ship this)
- [ ] Onboarding (3 screens: value prop → pick a starter template → set time).
- [ ] Create a **Daily Item**: free-text intent + content type + time + frequency.
- [ ] Claude generates today's content (via backend proxy).
- [ ] Local scheduled notification fires at the chosen time.
- [ ] Tapping the notification opens the item and shows the generated content.
- [ ] Home list of all daily items + today's content.
- [ ] Edit / pause / delete an item.
- [ ] Local persistence (works offline once content is generated).

### Nice-to-have (post-MVP)
- Streaks & history calendar.
- Multiple times per day / custom cadences (weekdays only, etc.).
- "Regenerate" / "give me another" button.
- Themes & fonts (you already lean into strong visual identity — see forge/pe-web).
- Share-as-image for a daily card.
- Cloud sync + multi-device (requires real accounts + DB).
- Widget (iOS WidgetKit) showing today's content.
- Tone controls (warmer / drier / funnier).

### Monetization
- **Freemium**: 1–2 active daily items free; unlimited + regenerate + history behind **Daily Plus** (~$3.99/mo or $29.99/yr via RevenueCat + StoreKit).
- Rationale: generation cost is real (Claude tokens); a sub both funds it and matches category norms.
- Keep a generous free tier so the App Store listing converts.

### App Store positioning
- Name: **Daily — your AI daily ritual**.
- One-liner: *"Tell Daily what you need. Get it every day, written just for you."*
- Differentiator vs. Stoic/I Am/Finch: **you write the prompt**, content is generated fresh, not a fixed deck of quotes.
- Category: Health & Fitness or Lifestyle.

---

## 2. User Flows

### Onboarding
```
Launch
 └─ Cover screen (value prop, "Get started")
     └─ Pick a starter template (Reflection / Motivation / Habit / Story / Custom)
         └─ Enter/confirm intent text (pre-filled from template)
             └─ Pick time + frequency (default: daily, 8:00am)
                 └─ Request notification permission (OS prompt)
                     └─ Generate first item → Home
```
No account required for MVP. A device-scoped anonymous ID is created silently.

### Creating a daily item
```
Home → "+"
 └─ Choose content type (chips)
     └─ Free-text: "What do you want help with?"
         └─ Time + frequency
             └─ Save
                 └─ Backend proxy → Claude → content cached locally
                     └─ Local notification scheduled
```

### Choosing reminder frequency/time
- Time picker (native).
- Frequency MVP options: **Daily** (only) → post-MVP: Weekdays, Custom days, Multiple/day.
- On save, (re)schedule the local notification via `expo-notifications`.

### Receiving a notification
- At the scheduled local time, the OS fires the notification with a teaser ("Your daily reflection is ready ✨").
- Content for *today* is pre-generated the night before (or at creation) and stored locally, so the tap is instant and works offline.
- A lightweight **content refresh** runs on app foreground / via a daily background fetch to top up the next day.

### Viewing Claude-generated content
```
Notification tap (deep link daily://item/:id)  OR  Home → item
 └─ Item detail: today's content, date, "Regenerate" (Plus), history
```

### Editing / deleting a daily item
```
Item detail → "Edit"
 └─ Change intent / type / time / frequency
     └─ Save → re-schedule notification, optionally re-generate
Item detail → "Pause"  (keep data, cancel notifications)
Item detail → "Delete" (confirm → remove item, cached content, notifications)
```

---

## 3. Technical Architecture

### 3.1 Recommended frontend structure (mirrors DuoBrain exactly)
Expo + React Native + **expo-router** + TypeScript. Router root at `src/app`, `@/*` → `src/*` path alias, `typedRoutes` on.

```
daily/                          # the Expo app (this repo root, or apps/mobile if monorepo later)
  app.json                      # expo config: name "Daily", scheme "daily", expo-router root ./src/app
  babel.config.js               # babel-preset-expo + module-resolver @ -> ./src + expo-router/babel
  tsconfig.json                 # extends expo/tsconfig.base, strict, paths @/* -> src/*
  src/
    app/                        # expo-router routes (file = screen)
      _layout.tsx               # Stack + providers (QueryClient, theme, notifications init)
      index.tsx                 # entry → redirect to onboarding or home
      onboarding.tsx
      home.tsx                  # list of daily items + today's content
      create.tsx                # create/edit a daily item
      item/[id].tsx             # item detail (today's content + history)
      +html.tsx +not-found.tsx
    components/                 # reuse DuoBrain's component vocabulary
      Screen.tsx ScreenContainer.tsx
      Card.tsx PrimaryButton.tsx SecondaryButton.tsx
      SectionHeader.tsx EmptyState.tsx LoadingState.tsx
      ContentCard.tsx           # renders a generated daily card
      TypeChips.tsx TimePicker.tsx
      index.ts
    features/
      items/                    # daily-item domain
        types.ts                # DailyItem, ContentEntry, ContentType
        useItems.ts             # CRUD over local store
        itemStore.ts            # SQLite/MMKV access
      generation/
        claudeClient.ts         # talks to OUR backend proxy (never Anthropic directly)
        prompts.ts              # system prompt + per-type instructions
      notifications/
        scheduler.ts            # expo-notifications schedule/cancel + deep links
        backgroundRefresh.ts    # expo-background-fetch top-up
    lib/
      env.ts                    # reads EXPO_PUBLIC_* config
      theme.ts                  # colors, spacing, typography
      http.ts                   # fetch wrapper w/ client token + retries
    data/                       # mock data for clickable Phase-1 build
```

Styling: start with DuoBrain's approach — **`StyleSheet` + a small component library + a `theme.ts`**. Don't add NativeWind unless you want Tailwind classes in RN; it's optional and not required for a polished MVP. (Keep it simple — your DuoBrain app already proves this pattern ships.)

State/data: **TanStack Query** for async (generation, refresh) + a thin local store. No Redux.

### 3.2 Backend / API structure (mirrors forge's `backend/`)
A tiny **Express (ESM `.mjs`) proxy** whose only job is to hold the Anthropic key and forward requests. This is the same shape as `PROMPT ENG v2.0/backend/server.mjs` (helmet + express-rate-limit + dotenv + a client token gate), and it deploys with the same `Dockerfile` / `fly.toml` / `render.yaml` you already have there.

```
backend/
  server.mjs            # express + helmet + rate-limit + CORS + client-token gate
  routes/generate.mjs   # POST /generate -> calls Anthropic Messages API
  lib/anthropic.mjs     # builds the request, system prompt, structured output
  package.json          # { type: "module", deps: @anthropic-ai/sdk, express, helmet, express-rate-limit, dotenv }
  .env.example
  Dockerfile fly.toml render.yaml
```

Endpoints:
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/healthz` | liveness + `{ anthropic: configured }` (copy from forge) |
| `POST` | `/generate` | `{ type, intent, date, tz }` → `{ content, meta }` |

The mobile app **never** sees `ANTHROPIC_API_KEY`. It authenticates to the backend with a `BACKEND_CLIENT_TOKEN` (same env name as forge) sent as `Authorization: Bearer`.

> Use the **official `@anthropic-ai/sdk`** in the backend (Node), not raw fetch — matches the claude-api guidance and gives you typed errors/retries.

### 3.3 Claude API integration flow
```
App: user saves item
  → http.ts POST {backendUrl}/generate  (Bearer client token)
      body: { type, intent, date: "2026-06-14", tz: "America/Denver" }
  → backend validates + rate-limits
  → backend calls Anthropic Messages API
      model: claude-haiku-4-5  (see §4 for rationale)
      system: <cached system prompt>            (prompt caching → cheap repeats)
      output_config.format: <json_schema>       (structured, parseable output)
  → backend returns { content: {...}, meta: { model, tokens } }
  → app stores ContentEntry locally + schedules notification
```

### 3.4 Database schema proposal
**MVP is local-first** (no server DB needed — the backend is a stateless proxy). Store on device with **expo-sqlite** (or MMKV for simplicity). Schema is written so it ports cleanly to Postgres if/when you add cloud sync.

```sql
-- daily_items: one row per recurring thing the user created
daily_item (
  id            TEXT PRIMARY KEY,      -- uuid
  type          TEXT NOT NULL,         -- 'reflection'|'motivation'|'habit'|'story'|'journal'|'learning'|'custom'
  intent        TEXT NOT NULL,         -- the user's free-text request
  time_of_day   TEXT NOT NULL,         -- 'HH:MM' local
  frequency     TEXT NOT NULL,         -- 'daily' (MVP); later 'weekdays'|'custom'
  status        TEXT NOT NULL,         -- 'active'|'paused'
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
)

-- content_entry: generated content, one per (item, date)
content_entry (
  id            TEXT PRIMARY KEY,
  item_id       TEXT NOT NULL REFERENCES daily_item(id),
  for_date      TEXT NOT NULL,         -- 'YYYY-MM-DD'
  title         TEXT,
  body          TEXT NOT NULL,
  model         TEXT,                  -- e.g. 'claude-haiku-4-5'
  created_at    TEXT NOT NULL,
  UNIQUE(item_id, for_date)
)

-- notification: maps an item/date to a scheduled OS notification id (for cancel/reschedule)
notification (
  id            TEXT PRIMARY KEY,      -- expo notification id
  item_id       TEXT NOT NULL REFERENCES daily_item(id),
  for_date      TEXT,
  scheduled_for TEXT NOT NULL
)
```
Future cloud version: add `user(id, ...)`, put `user_id` FKs on the above, host in Postgres; the backend gains real CRUD endpoints. **Not needed for MVP.**

### 3.5 Notification / reminder system
- **`expo-notifications`** with **locally scheduled** notifications — no push server required for MVP. This is the single biggest "keep it simple & shippable" decision.
- Pre-generate **today + tomorrow** so the tap is instant and offline-safe.
- **`expo-background-fetch`** (or generate-on-foreground) to top up the next day's content so notifications always have content ready.
- Deep link: notification carries `daily://item/:id`; expo-router handles it.
- Reschedule on edit; cancel on pause/delete.

### 3.6 Authentication approach
- **MVP: no login.** Generate a device-scoped anonymous ID (stored in SecureStore). The app authenticates to the backend with the shared `BACKEND_CLIENT_TOKEN` (forge pattern). This is enough to ship and protect the key.
- **Phase 4 / cloud sync:** add real auth (Sign in with Apple is the lowest-friction + App Store-friendly choice; you already have a Google flow in DuoBrain if you prefer). Issue per-user tokens then.

### 3.7 Environment variables
**Backend** (`backend/.env`, never committed — mirrors forge):
```
PORT=8080
ALLOWED_ORIGIN=*
BACKEND_CLIENT_TOKEN=<shared secret the app sends as Bearer>
ANTHROPIC_API_KEY=<server-only, NEVER shipped to the client>
ANTHROPIC_MODEL=claude-haiku-4-5
RATE_LIMIT_PER_MIN=60
```
**App** (`.env` via `EXPO_PUBLIC_*`, safe to ship — these are *not* secret):
```
EXPO_PUBLIC_BACKEND_URL=https://daily-backend.fly.dev
EXPO_PUBLIC_BACKEND_CLIENT_TOKEN=<same shared token>
```
> Note: `EXPO_PUBLIC_*` values are embedded in the client bundle and are **not secret**. The client token only gates casual abuse of your proxy; the *real* secret (`ANTHROPIC_API_KEY`) lives only on the backend. For stronger protection post-MVP, move to per-device tokens minted by the backend at first launch.

### 3.8 Security / privacy concerns
- **Never expose `ANTHROPIC_API_KEY` on the client.** All Claude calls go through the backend. (Hard constraint — honored by the architecture above.)
- Rate-limit the proxy (`express-rate-limit`, copy forge's config) to bound token spend.
- User intent text may be personal → store locally, transmit over HTTPS only, and write a clear privacy policy (required for App Store). Don't log raw intent server-side beyond what's needed.
- Add basic content safety: the backend checks Claude's `stop_reason` for `refusal` and returns a friendly fallback instead of an error (see §4).
- App Store Privacy Nutrition Label: declare "User Content" sent to a third-party AI provider (Anthropic). Be upfront in onboarding that content is AI-generated.
- No secrets in the repo; `.env` files git-ignored; `.env.example` only.

---

## 4. Claude API Design

> Per the claude-api reference: current default is Opus 4.8. **For Daily I recommend `claude-haiku-4-5`** as the workhorse — daily content is short, high-volume, and latency/cost-sensitive, which is exactly Haiku's lane ($1/$5 per 1M tok vs Opus $5/$25). Offer **Sonnet 4.6** as a "premium quality" toggle for Daily Plus, and keep the model in one backend env var (`ANTHROPIC_MODEL`) so it's a one-line change. This is your call to make — I'm defaulting to Haiku for unit economics, not silently downgrading.

### 4.1 What user input gets sent
Minimal, structured — not the whole device state:
```json
{ "type": "reflection", "intent": "<user free text>", "date": "2026-06-14", "tz": "America/Denver" }
```
The backend turns this into a Messages API call. Do **not** send PII beyond the intent text.

### 4.2 System prompt (lives server-side, prompt-cached)
```
You are Daily, a generator of short, high-quality daily content.
You produce ONE piece of content for ONE day based on the user's intent and content type.

Rules:
- Keep it concise and self-contained: a person reads this in under 60 seconds.
- Match the requested TYPE (reflection, motivation, habit nudge, micro-story, journaling prompt, learning drip).
- Be specific and fresh; never repeat generic filler. Vary phrasing day to day.
- Warm but not saccharine. No emoji unless the type clearly calls for it.
- Never give medical, legal, financial, or crisis advice. If the intent implies
  self-harm or crisis, return gentle, non-clinical encouragement plus a note to
  reach out to a professional or hotline.
- Output ONLY the structured fields requested. No preamble.
```
Put the system prompt behind a `cache_control` breakpoint so repeated daily calls hit the cache (~0.1× input cost).

### 4.3 Structured output (parseable, no prefill)
Use `output_config.format` (NOT assistant prefill — prefill 400s on current models):
```json
{
  "format": {
    "type": "json_schema",
    "schema": {
      "type": "object",
      "properties": {
        "title": { "type": "string" },
        "body":  { "type": "string" },
        "tone":  { "type": "string" }
      },
      "required": ["body"],
      "additionalProperties": false
    }
  }
}
```
Backend parses the first text block as JSON → returns `{ content }` to the app.

### 4.4 Avoiding unsafe / low-quality generations
- **Safety:** check `response.stop_reason === "refusal"` → return a calm fallback message, not an error. The system prompt also handles crisis intent gracefully.
- **Quality:** the system prompt enforces brevity + freshness; include the `date` so each day differs; keep `max_tokens` modest (~400) so output stays tight.
- **Determinism of cost:** `max_tokens` cap + rate limit + Haiku model bound spend.
- **Input hygiene:** trim/limit `intent` length on the backend (e.g. 500 chars) before sending.

### 4.5 Caching / storing generated content
- **Prompt caching** (server): cache the system prompt prefix across all users/requests.
- **Content storage** (client): persist each `content_entry` in SQLite keyed by `(item_id, for_date)` so a day's content is generated **once** and reused for re-opens, offline, and the notification tap.
- **Pre-generation:** generate `today` at item creation, then top up `tomorrow` via background fetch / on foreground, so a notification never fires without ready content.
- Optional later: a small server cache for identical `(type, intent, date)` to cut cost further if many users share templates.

---

## 5. Implementation Roadmap

### Phase 1 — Clickable MVP (no Claude, no notifications yet)
- Scaffold Expo app matching DuoBrain (`app.json`, `babel.config.js`, `tsconfig.json`, `src/app`, component library, `theme.ts`).
- Build the 4 screens (onboarding, home, create, item detail) against **mock data** in `src/data/`.
- Local store CRUD (SQLite/MMKV) with mock content.
- **Exit criteria:** you can create, view, edit, delete items and click through the whole UX; it just shows placeholder content.

### Phase 2 — Functional Claude integration
- Stand up the Express proxy (`backend/`) from the forge template (helmet + rate-limit + client token + `@anthropic-ai/sdk`).
- `POST /generate` with system prompt + structured output; deploy to Fly/Render.
- App `claudeClient.ts` calls the proxy; real content replaces mocks; cache to SQLite.
- **Exit criteria:** creating an item produces real Claude content, stored locally.

### Phase 3 — Reminders / notifications
- `expo-notifications` permissions + local scheduling + deep links.
- Pre-generate today/tomorrow; background-fetch top-up.
- Reschedule/cancel on edit/pause/delete.
- **Exit criteria:** a notification fires at the chosen time and opens ready content offline.

### Phase 4 — Polish, App Store readiness, analytics, privacy
- Visual polish + theme (lean into a distinct identity, à la forge/pe-web).
- RevenueCat + StoreKit paywall (free tier + Daily Plus).
- Sign in with Apple (optional) + cloud sync (optional, adds Postgres).
- Analytics (PostHog/Amplitude), crash reporting (Sentry).
- Privacy policy, App Privacy labels, icons/splash, EAS build + TestFlight → submit.

---

## 6. Repo-Specific Next Steps

### Where this should live
The repo is **empty**, so Daily starts here at `C:\Users\Josh\desktop\DAILY`. Recommended top-level layout:
```
DAILY/
  PLANNING.md          # this file
  app/ (or root)       # the Expo app  ← scaffold mirroring DuoBrain
  backend/             # the Express proxy ← scaffold mirroring forge/backend
```
Two clean options: **(a)** Expo app at the repo root + a `backend/` subfolder (simplest), or **(b)** a light monorepo `apps/mobile` + `apps/backend`. I recommend **(a)** for now — least ceremony, easy to split later.

### First files/components/routes/services to create (in order)
1. `app.json`, `babel.config.js`, `tsconfig.json`, `package.json` — copy DuoBrain's and rename to Daily (`scheme: "daily"`, bundle id `com.daily.app`).
2. `src/app/_layout.tsx` + `src/app/index.tsx` — router + entry redirect.
3. `src/lib/theme.ts` + `src/components/` (port `Screen`, `Card`, `PrimaryButton`, `SectionHeader`, `EmptyState`, `LoadingState` from DuoBrain).
4. `src/features/items/types.ts` + `itemStore.ts` + `useItems.ts` — domain + local store.
5. `src/app/home.tsx`, `create.tsx`, `item/[id].tsx`, `onboarding.tsx` — screens on mock data.
6. *(Phase 2)* `backend/server.mjs` + `routes/generate.mjs` + `.env.example` — copy forge's backend, swap the multi-provider proxy for a single `/generate` route.
7. *(Phase 2)* `src/features/generation/claudeClient.ts` + `prompts.ts`.
8. *(Phase 3)* `src/features/notifications/scheduler.ts`.

### Risks & missing dependencies
- **Nothing is installed** — this is a clean slate; you'll `npx create-expo-app`-equivalent or hand-port DuoBrain's config, then `npm install`.
- **Background generation reliability:** OS background fetch is best-effort. Mitigate by also generating on foreground and pre-generating a day ahead.
- **Notification permissions:** users can deny; handle the denied state (in-app "today" view still works).
- **Cost control:** without the rate limiter + Haiku + `max_tokens` cap, token spend could surprise you — all three are in the plan.
- **App Store review:** AI-generated content + a third-party data flow (Anthropic) require a privacy policy and accurate Privacy labels — budget time in Phase 4.
- **Client token is not a real secret** (it ships in the bundle). Fine for MVP abuse-gating; plan per-device tokens later if the proxy gets popular.

---

## 7. The exact next coding task to ask for

> **"Scaffold the Phase 1 clickable MVP: create the Expo + expo-router + TypeScript app at the repo root mirroring DuoBrain's config (app.json/babel/tsconfig with `@/*`→`src/*` and router root `src/app`), port the core components (`Screen`, `Card`, `PrimaryButton`, `SectionHeader`, `EmptyState`, `LoadingState`) and a `theme.ts`, add the `DailyItem`/`ContentEntry` types and a local SQLite store, and build the four screens (onboarding, home, create, item detail) running on mock data — no Claude and no notifications yet."**

That gives you a fully clickable app you can run on your phone, then we layer in the Claude proxy (Phase 2) and notifications (Phase 3).
