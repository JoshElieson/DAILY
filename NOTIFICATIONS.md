# Daily — Notification & Scheduling Architecture

> Companion to `PLANNING.md` (§3.5 commits to local notifications). This is the deep-dive that
> backs that decision and defines the seam for adding server push later.
> Author: senior mobile architect pass, 2026-06-13.

---

## 0. The core insight: decouple *when it fires* from *what it shows*

Every naive design conflates two separate problems:

1. **The trigger** — fire something at 8:00am local, every day → a *scheduling* problem.
2. **The payload** — which freshly-generated AI content the user sees → a *content* problem.

Local notifications are excellent at #1 and terrible at #2 (you can't put tomorrow's
not-yet-generated content into a notification you schedule today). The whole architecture falls
out of keeping these two concerns apart:

> **The notification carries a generic teaser + a deep link. The AI content lives in local SQLite,
> generated ahead of time, and is read on tap.** One repeating trigger per item; content buffered
> independently.

This single decision means the entire MVP needs **zero push infrastructure**, and it's *correct*,
not just expedient.

---

## 1. Local vs Server-side — decision matrix

| Dimension | Local (`expo-notifications`) | Server push (APNs/FCM via Expo Push) |
|---|---|---|
| **Infra needed** | None — device schedules itself | Push tokens + DB of schedules + a timezone-aware cron/scheduler + APNs/FCM creds |
| **Backend statefulness** | Proxy stays **stateless** (forge pattern survives intact) | Proxy becomes **stateful** (Postgres, token store, scheduler workers) |
| **Timezone & DST** | OS handles it. A `{hour, minute, repeats}` calendar trigger is **wall-clock** — stays 8am through DST *and* travel, automatically | You store each user's tz, compute next UTC instant, re-handle DST twice a year and on every travel event. Error-prone |
| **Recurring** | `repeats: true` daily is native; weekdays = 5 weekly triggers | Trivial for *any* cadence, but you own the scheduler |
| **Content in the notification body** | ❌ Only what you baked in at schedule time | ✅ Server generates fresh, pushes it in the body |
| **Offline** | ✅ Fires and (with pre-gen) shows content fully offline | ❌ Needs connectivity at send + receive |
| **User editing** | Cancel + reschedule locally, synchronous, offline | PATCH server; offline edits must queue/sync |
| **Reliability** | OS-level trigger is rock-solid; risk is content-readiness + iOS's **64-pending cap** + reschedule-after-reinstall | APNs/FCM best-effort (can coalesce/throttle) + server uptime + cron correctness + token expiry. More failure modes, but you get delivery receipts/retry |
| **Battery** | Negligible — no app wakeup to deliver | Negligible per push (radio wake); comparable. Local slightly better |
| **Scaling** | Free, infinite users, zero delivery cost. Constraint is **per-device** (64 on iOS), not aggregate | Aggregate problem: firing N-million tz-correct pushes/day needs bucketed queues + workers + cost that grows with users |
| **Privacy** | Intent never needs to leave the device for *delivery* | Must store schedule + token + tz server-side |
| **Re-engagement / cross-device** | ❌ Impossible | ✅ The whole reason to add it |

**Neither guarantees delivery** — both are best-effort at the OS layer. The honest tradeoff is
*simplicity + offline + free-scaling* (local) vs *content-in-body + re-engagement + cross-device*
(server).

---

## 2. Recommendation: **Local-first, with a clean seam for server-augment later**

### Phase 3 (MVP): 100% local

```
Create/edit item
  └─ scheduler.ts:
       cancel any existing notification ids for this item
       schedule ONE repeating calendar trigger:
         { hour, minute, repeats: true }           # daily — 1 of the 64 budget
         body: "Your daily reflection is ready ✨"  # generic teaser, NO AI content
         data: { itemId }                           # → deep link daily://item/:id
       persist (item_id → notification_id) in the `notification` table
  └─ generate.ts:
       generate TODAY now; buffer the next ~7 days into content_entry (SQLite)
On app foreground:  top up the content buffer (cheap, Haiku, generated once & reused)
On notification tap: deep-link to item/[id]; read content_entry for today (instant, offline)
```

**Why this is right for Daily specifically:**
- Keeps the backend the **stateless forge-style proxy** already planned — no Postgres, no token
  store, no scheduler. The proxy never even knows a notification exists.
- Wall-clock timezone behavior is **free and correct**, including DST and travel — the single
  biggest source of server-push bugs, eliminated.
- Scales to unlimited users at **$0 delivery cost** while you're a solo dev.

### The two constraints you must engineer around

**1. iOS's 64-pending-notification hard cap.** Per app, OS-enforced. The design respects it because
each active item uses **exactly one** repeating trigger (daily) — so up to 64 active items.
Weekdays-only = 5 triggers/item; "custom days" multiplies fast. Guardrails:
- Use **repeating** triggers, never N one-shots. Never pre-schedule "the next 30 days" as 30
  notifications.
- The freemium cap (1–2 free items) keeps you far under budget; gate power-cadences in Daily Plus
  and meter total triggers.
- **Reschedule-all on every app launch** — covers reinstall (iOS clears scheduled notifications),
  permission re-grant, and OS housekeeping.

**2. Content readiness ≠ notification firing.** The notification *always* fires (local + generic
teaser). The risk is tapping it and finding no content because `expo-background-fetch` is
best-effort (iOS may run it once a day, or not). Mitigations, in order of importance:
- **Buffer 7+ days of content** at creation, not just "tomorrow." This is SQLite rows, **not**
  notification slots — it does *not* touch the 64 budget. Content is generated once and reused, so a
  deep buffer is cheap with Haiku.
- **Top up on every foreground** (most reliable signal you get).
- **Lazy generate on tap** if a day was somehow missed (needs network; the buffer makes this rare).

That content/notification decoupling is the load-bearing idea: **deep content buffer + a single
repeating trigger.**

---

## 3. When server push earns its place (Phase 4+)

Add it only when one of these becomes a real product goal — not before:

- **Fresh AI content on the lock screen** (the notification body *is* the content) — the biggest UX
  upgrade local can't do.
- **Re-engagement** ("you haven't journaled in 3 days").
- **Cross-device / multi-device.**

What it costs you when you do: device push token storage, per-item schedule + tz persisted
server-side, and a **timezone-aware scheduler** (bucket users by send-minute → queue → workers;
recompute on DST + travel). Use **Expo Push (EAS)** rather than raw APNs/FCM to stay native to the
Expo stack. The proxy graduates from stateless to stateful (the same Postgres migration anticipated
in `PLANNING.md` §3.4).

**Even then, keep local as the reliable wall-clock fallback** and use push purely for the value-add
(content-in-body, re-engagement). Local stays the offline + timezone-correct backbone; push is a
layer on top, not a replacement.

### The seam to build now so this is painless later
- `scheduler.ts` exposes `schedule(item)` / `cancel(item)` / `rescheduleAll()` — a provider
  interface. A future `PushScheduler` implements the same surface; screens never change.
- Store the `(item_id → notification handle)` mapping in the `notification` table **with a
  `transport` column** (`'local' | 'push'`) from day one — costs nothing now, makes the hybrid
  migration a data change, not a rewrite.
- Already capture `tz` in the `/generate` payload (`PLANNING.md` §3.3) — so the server *already*
  knows each user's timezone when you need it for push.

---

## 4. Timezone handling — explicit rules

- **MVP / local:** rely on wall-clock calendar triggers. "8:00am" means 8:00am wherever the device
  currently is. Do **not** convert to UTC, do **not** store offsets. The OS owns DST and travel.
  This is the *intended* behavior for a daily ritual ("my morning is my morning").
- **Edge case to decide later:** "always 8am in my *home* timezone even when traveling" is a
  different product choice and is *harder* under both models. Don't build it unless users ask — and
  if they do, it's actually easier with server push (you control the instant) than local.
- **Server phase:** persist IANA tz string (`America/Denver`, never a raw offset), recompute
  next-fire on DST boundaries and on app-reported tz changes.

---

## 5. Firing / editing lifecycle (local, MVP)

| Action | Notification side | Content side |
|---|---|---|
| Create item | Schedule 1 repeating trigger; save id | Generate today + buffer 7 days |
| Edit time/cadence | Cancel old id(s) → schedule new → save | No change (content is date-keyed, not time-keyed) |
| Pause | Cancel id(s), keep rows | Keep buffered content |
| Resume | Reschedule | Top up buffer if stale |
| Delete | Cancel id(s) | Delete `content_entry` rows |
| App launch | `rescheduleAll()` (reinstall/permission/OS safety net) | Top up buffer |
| Permission denied | No notifications; in-app "today" view still works | Unaffected |

---

## 6. Android-specific notes

- **Exact alarms:** Android 12+ gates exact-time alarms behind `SCHEDULE_EXACT_ALARM` /
  `USE_EXACT_ALARM`. `expo-notifications` calendar triggers are fine for a daily ritual where
  ±a-few-minutes is acceptable; only request exact-alarm permission if minute-precision is a
  product requirement.
- **Doze / battery optimization:** OEMs (Samsung, Xiaomi, etc.) aggressively kill background work.
  This affects *content pre-generation* (background fetch), **not** the notification trigger itself.
  The deep content buffer + foreground top-up is the mitigation — never depend on background fetch
  firing on Android.
- **Notification channels:** create a single "Daily reminders" channel (importance HIGH) so users
  can manage it in system settings; required on Android 8+.

---

## 7. Module map (additions to `PLANNING.md` §3.1)

```
src/features/notifications/
  scheduler.ts          # schedule/cancel/rescheduleAll over expo-notifications (provider interface)
  backgroundRefresh.ts  # expo-background-fetch top-up (best-effort, never the sole path)
  deeplinks.ts          # daily://item/:id → expo-router
  channels.ts           # Android notification channel setup
```

The `notification` table (`PLANNING.md` §3.4) gains a `transport TEXT NOT NULL DEFAULT 'local'`
column now, so the eventual push migration is data, not a rewrite.

---

## 8. TL;DR

**Local-first** (`expo-notifications` wall-clock calendar triggers, one repeating trigger per item,
AI content buffered separately in SQLite and read on tap): stateless backend, free
timezone/DST/travel correctness, infinite per-user scaling, zero delivery cost. Engineer around the
**iOS 64-slot cap** (repeating triggers + reschedule-on-launch) and **content readiness** (deep
buffer + foreground top-up, decoupled from notification slots). Keep a `transport` column + scheduler
interface as the seam to layer **Expo Push** on top later for content-on-lockscreen, re-engagement,
and cross-device — without rewriting the app.
