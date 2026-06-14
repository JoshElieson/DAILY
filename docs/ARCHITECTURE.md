# Daily — Frontend Architecture & Decisions

> Scope: the **mobile app frontend** (this codebase). Companion to the planning
> docs (`PLANNING.md`, `BACKEND-SCHEMA-API.md`, `NOTIFICATIONS.md`) and the
> `design-system/` specification. Backend code is intentionally **not** included
> here — the app talks to it through a thin client (`claudeClient`) and runs on
> mock data until the proxy is deployed.

This document records the architectural decisions made while implementing the
frontend, and why. It does not change any product requirement or design — it
explains how the spec was realized in code.

> **Binding source of truth:** `docs/master-spec.md` (lead-architect synthesis)
> + `docs/development-roadmap.md`. Where the per-discipline docs disagree, the
> master-spec wins. The frontend was reconciled to its decision log (D1–D12):
> entity = **Daily** (`daily_item`, D2); **completion = `completed_at` on
> `content_entry`** (D3); **`content_type` is the single MVP taxonomy and drives
> the card accent — `category` deferred** (D4); MVP frequency = **daily +
> weekdays** only, no dead controls (D6); onboarding has a **live "Generating"
> step + soft paywall** (D7); **4-tab nav + FAB** (D8); Expo/expo-router/TS (D9);
> create sheet = **content-type chips + one free-text intent** that doubles as
> title and Claude prompt, no note/category (D10); model = `claude-haiku-4-5`
> (D12).

---

## 1. Stack

| Concern | Choice | Rationale |
|---|---|---|
| Framework | **Expo + React Native + expo-router + TypeScript** | Mandated by `PLANNING.md §3.1`; mirrors the DuoBrain project so it feels like Josh's codebase. |
| Routing | **expo-router v4**, router root `src/app`, `typedRoutes` on | Per spec. File = screen. |
| Path alias | `@/*` → `src/*` (babel-module-resolver + tsconfig paths) | Per spec. |
| Async state | **TanStack Query** | Per `PLANNING.md §3.1`. Manages loading/error/refetch + cache invalidation for the local store and generation. |
| Local data | **AsyncStorage**-backed repository behind an async interface | See §3. |
| Styling | `StyleSheet` + a typed `theme` + a small component library | Per spec (no NativeWind). |
| Icons | **lucide-react-native** (rounded, 1.75 stroke) | `design-system/01-foundations.md §7` recommends Lucide. |
| Fonts | **Inter** + **Newsreader** via `@expo-google-fonts/*` | `04-implementation.md §4` — bundle Inter + Newsreader; serif is the reflective voice. |
| Gradients | `expo-linear-gradient` | Reflective card / onboarding washes. |
| Haptics | `expo-haptics` | Completion + press feedback (motion §6.3). |

---

## 2. Token → code pipeline

`design-system/tokens.json` is the source of truth. It is mirrored into typed TS:

- `src/theme/tokens.ts` — ramps, spacing, radius, elevation (as RN shadow
  objects), motion.
- `src/theme/colors.ts` — **semantic** color sets for light + dark ("Ink Dusk").
- `src/theme/typography.ts` — the type scale as RN `TextStyle`s, each pinned to a
  concrete font family/weight.
- `src/theme/ThemeProvider.tsx` — exposes the active `Theme` via `useTheme()` and
  persists the System/Light/Dark preference.

**Rule honored:** components consume **semantic tokens only** (`theme.color.accent`,
never a raw ramp step). This is what makes the theme swap cleanly and is the
single most important constraint from `04-implementation.md §2`.

> A formal Style Dictionary step (JSON → TS) is deferred. The hand-mirrored
> `tokens.ts`/`colors.ts` are kept 1:1 with `tokens.json`; if the token set grows,
> wire up Style Dictionary to generate these files. The semantic-only discipline
> means that swap is mechanical.

---

## 3. Data layer — local-first, swappable persistence

`PLANNING.md §3.4` specifies on-device persistence (expo-sqlite or MMKV) for a
local-first MVP. For the **Phase-1 clickable build** the store
(`src/features/items/itemStore.ts`) is implemented over **AsyncStorage** behind a
small **async repository interface** (`listItems`, `createItem`, `saveContent`,
`setCompletion`, …).

**Why AsyncStorage now, not SQLite:**

- The repository contract is fully async, so a SQLite/MMKV implementation can
  replace it later **without touching the hooks or any screen**.
- Phase 1's goal is a fully clickable app on mock data; AsyncStorage removes a
  native-module dependency from the critical path while preserving the shape.
- The schema (`src/features/items/types.ts`) is a 1:1 typed mirror of the SQLite
  tables in `PLANNING.md §3.4` (`daily_item`, `content_entry`, plus a local
  `completion` record), so it also ports to the cloud Postgres schema by adding
  `user_id` later.

The store **seeds mock data on first launch** so Home is never empty (a warm
first run, per the onboarding intent).

`useItems.ts` wraps the store in TanStack Query hooks and a `useToday()`
selector that joins active items with today's content + completion — the exact
view-model Home needs.

---

## 4. Generation client (Claude integration boundary)

`src/features/generation/claudeClient.ts` is the **only** thing that would talk to
the backend proxy. It honors the hard constraint from `PLANNING.md §3.2/§3.8`:
the app never sees `ANTHROPIC_API_KEY`; it would authenticate to the proxy with
the shared client token (`src/lib/http.ts`, Bearer).

- `env.useMocks` (default in Phase 1, and whenever no backend URL is set) makes
  the client return crafted mock content with a realistic delay, so
  loading/empty/error states are exercised end-to-end.
- When a backend is configured, `generateRemote` POSTs `{ type, intent, date, tz }`
  to `/generate` and maps the structured response into a `ContentEntry`, applying
  input hygiene (intent trimmed to 500 chars) and a calm fallback body on empty
  results — matching the contract in `PLANNING.md §4`.

Switching to the real backend is a config change (`.env`), no code change.

---

## 5. Navigation map

```
src/app/
  _layout.tsx            Root Stack + providers + fonts/splash
  index.tsx              Redirect: onboarding (first run) or /(tabs)
  onboarding.tsx         4-step flow (Welcome → Promise → Intention → Permission)
  (auth)/
    sign-in.tsx          Email + Apple (mocked); entry from onboarding/settings
    sign-up.tsx
  (tabs)/
    _layout.tsx          Tab bar: Today · Upcoming · Reflect · Settings
    index.tsx            Home / Today  (FAB → create)
    upcoming.tsx         All reminders by status
    reflect.tsx          Evening prompt, streak, progress, Premium teaser
    settings.tsx         Grouped prefs, premium card, sign out
  item/[id].tsx          Daily content detail (today + history + regenerate)
  create.tsx             Reminder create/edit (modal sheet; ?id= edits)
  premium.tsx            Premium upsell (modal sheet)
  profile.tsx            Account / profile
  +not-found.tsx
```

- **Create** and **Premium** use `presentation: 'modal'` to get native sheet
  behavior (slide-up), matching the design's bottom-sheet treatment for those
  flows (`design-system/03-screens.md §C, §E`).
- Dynamic navigation uses the **object form** (`{ pathname: '/item/[id]', params }`)
  so it stays type-safe under `typedRoutes`.

---

## 6. Authentication

`PLANNING.md §3.6`: **MVP has no real login** — a device-scoped anonymous
identity exists from first launch. The task list, however, asks for
authentication screens, so the frontend models the full shape
(anonymous → signed-in) in `AuthProvider` with **mocked, locally-persisted**
auth. The auth screens are real and wired; dropping in Sign in with Apple +
per-user tokens later is a provider swap behind the same interface. This adds UI
without changing the product requirement (still no mandatory account to use the
app).

---

## 7. Notifications (frontend posture)

Local scheduling via `expo-notifications` is **Phase 3** (`PLANNING.md §5`,
`NOTIFICATIONS.md`) and deliberately not implemented here. The frontend prepares
for it: a notification-priming onboarding screen, a `reminderOn` flag per item, a
notifications master toggle in Settings, and an item deep-link target
(`item/[id]`) for `daily://item/:id`. The "Enable reminders" button currently
records intent and proceeds; it will trigger the real OS prompt in Phase 3.

---

## 8. States, accessibility, motion

Per `design-system/04-implementation.md §9`, every data screen ships **loading,
empty, and error** states (not afterthoughts):

- **Loading:** skeletons at component shape (`LoadingState`, `Skeleton`) — no
  spinners on first list paint.
- **Empty:** the calm `EmptyState` (soft sunrise, serif headline, single CTA) —
  never "you're behind".
- **Error:** `ErrorState` in muted rose-clay with a retry — never scolding.

Accessibility & motion baked into the primitives:

- Touch targets ≥44pt (Button/IconButton/CompletionCheck/day toggles).
- Screen-reader labels on icon buttons and the completion checkbox (announces
  state, not color).
- `useReduceMotion()` gates ambient animation (skeleton shimmer, completion pop),
  replacing movement with static/cross-fade.
- `maxFontSizeMultiplier` caps display scaling (~1.3×) without disabling Dynamic
  Type.
- Errors/success pair icon + text + shape, never color alone.

---

## 9. Known placeholders / follow-ups

- **App assets** (`assets/*.png`) are valid solid-sand placeholders at real
  dimensions (icon/adaptive 1024², splash 1242², favicon 48²) so the bundle and
  `app.json` resolve. Replace with the branded sunrise icon + splash art before a
  store build.
- **Backend** is not deployed — app runs on mocks (`EXPO_PUBLIC_USE_MOCKS=true`).
- **expo-notifications**, **RevenueCat/StoreKit**, **SQLite**, real **Sign in with
  Apple**, and **streak computation** are scheduled for later phases and are
  represented in the UI by their frontend surfaces only (mocked where needed).
- **Style Dictionary** generation step is deferred (see §2).
