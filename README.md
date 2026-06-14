# Daily — mobile app

> Tell Daily what you need. Get it every day, written just for you.

The Expo (React Native + TypeScript) frontend for **Daily**, an AI daily-content
app. Every screen and flow is implemented and navigable. The app starts **empty
— no seeded/default Dailies**: everything you see is something you created, and
creations are persisted on-device. Generated content runs on a local mock by
default (swap in the cloud backend with `EXPO_PUBLIC_USE_MOCKS=false`), while
**local notifications, streaks, reflections, and the paywall gating are fully
wired on the client**.

## Run it

```bash
npm install
npm start          # then press i / a, or scan the QR with Expo Go
# npm run ios | npm run android | npm run web
npm run typecheck  # tsc --noEmit
```

Copy `.env.example` → `.env` to configure later phases. By default the app runs
fully on mocks (`EXPO_PUBLIC_USE_MOCKS=true`).

## What's implemented

- **Onboarding** (master-spec D7) — Welcome → Promise → set first intention →
  **live first generation** → **real notification permission** → **soft paywall**
  → Home. The intention becomes your first real Daily; skip it and Home starts
  empty. No seeded/default Dailies.
- **Authentication** — sign in / sign up (email + Apple), mocked & persisted.
- **Today (Home)** — greeting, today's reflection (or the day's prompt), day
  progress, today's content cards by time of day; loading / empty / error
  states; FAB.
- **Upcoming** tab — all Dailies by status/time.
- **Reflect** tab — **real streaks** (computed from completion history), day
  progress, a **writeable reflection** (persisted per day), recent reflections
  (full history is a Premium benefit).
- **Local notifications** (`expo-notifications`) — one repeating trigger per
  active Daily (daily / 5× weekdays), permission flow, tap → deep link to the
  Daily, reschedule-all on launch, schedule/cancel on create/edit/pause/delete.
  All native calls are web-guarded.
- **Daily content** — `item/[id]`: today's generated content, regenerate
  (Plus-gated), mark-done, pause/edit, history.
- **Create / edit a Daily** — modal sheet: content-type chips + one free-text
  intent (title + Claude prompt) + time + repeat (Daily/Weekdays) + reminder
  toggle (D10); **free-tier cap** (3 active Dailies) → paywall.
- **Settings**, **Premium** upsell, **Profile** — real Rate (StoreReview),
  support (mailto), privacy/terms (Linking) actions; one-time ratings prompt
  after a positive moment.

Verified: `npm run typecheck` is clean and `npx expo export --platform web`
bundles all 19 routes (2882 modules) with static rendering.

## Structure

```
src/
  app/         expo-router screens (file = route)
  components/  reusable UI library (Button, Card, ReminderCard, Sheet, …)
  features/    items · generation · auth · settings (domain + state)
  lib/         haptics, dates, env, http, fonts, a11y helpers
  theme/       tokens → semantic theme + typography + ThemeProvider
```

Architecture decisions and rationale: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.
Design system: [`design-system/`](design-system/). Product plan: [`PLANNING.md`](PLANNING.md).

## Notes

- `assets/*.png` are placeholders — replace with real 1024² icon/splash before a
  store build.
- Requires TypeScript ≥ 5.4 (TanStack Query v5 uses `NoInfer`); pinned to 5.6.
