# Daily — Development Roadmap

> **Status:** Canonical. Companion to `master-spec.md` (the source of truth for *what* to build; this is *in what order, by whom, with what dependencies*).
> **Author:** Lead architect synthesis pass, 2026-06-13.

This roadmap breaks the entire application into implementation phases, gives a prioritized task list with IDs, marks the **critical path**, and calls out what can be built **in parallel**. Task IDs are stable references for issue trackers (`T-###`). Estimates are rough engineer-days for one mid/senior engineer; "size" (S/M/L) is the planning unit.

---

## 0. How to use this document
- **Phases** are independently shippable. Don't start phase N+1 work that depends on N before N's exit criteria are met (the dependency graph in §8 tells you what's safe to pull forward).
- **Critical path** (§7) is the longest dependency chain to a shippable MVP. Protect it; staff it first.
- **Parallel tracks** (§6) can proceed simultaneously with different engineers from day one.
- Every UI task's definition of done = design-system §9 quality bar (semantic tokens only, light+dark, Dynamic Type, ≥44pt targets, screen-reader labels, reduce-motion, calm copy, empty/loading/error states).

---

## 1. Phase overview

| Phase | Name | Goal / exit criteria | Ship? |
|---|---|---|---|
| **P0** | Foundation & scaffold | Expo app boots; tokens→theme pipeline; core components render in both themes; CI guards raw hex. | internal |
| **P1** | Clickable MVP (mock data) | Create/view/edit/delete Dailies, full click-through on **mock** content. No Claude, no notifications. | internal / TestFlight alpha |
| **P2** | Claude integration | Stateless proxy live; real content replaces mocks; cached to SQLite; buffer loop. | internal |
| **P3** | Notifications | Local scheduling, deep links, reschedule-all, foreground top-up; a notification fires and opens ready content offline. | TestFlight beta |
| **P4** | Polish, monetization, store-ready | Streaks/Reflect, paywall (RevenueCat), settings, dark-theme + a11y audit, privacy policy + labels, EAS build → **App Store submit**. | **PUBLIC LAUNCH (v1)** |
| **P5** | Cloud backend (accounts, sync, push, premium server) | Postgres + `/v1` API; anonymous-claim auth; server gen + Expo push; entitlement reconcile; analytics. | v2 |
| **P6** | Social / sharing | Profiles, share-as-image, follow, reactions, comments, **moderation queue** (Apple 1.2 gate). | v3 |

**MVP = P0→P4.** P5/P6 are post-launch and explicitly out of v1 scope (master-spec §2.7).

---

## 2. Prioritized task list

Priority: **P0=blocker for everything**, then by phase. Within a phase, lower `T-###` ≈ earlier. **CP** = on the critical path. `∥track` = parallelizable track (§6).

### Phase 0 — Foundation & scaffold
| ID | Task | Size | Notes | CP |
|---|---|---|---|---|
| T-001 | Scaffold Expo + expo-router + TS app at repo root (mirror DuoBrain: `app.json` scheme `daily`, bundle `com.daily.app`, `babel.config.js` `@/*`→`src/*`, `tsconfig` strict, `typedRoutes`). | M | First commit. | **CP** |
| T-002 | Token pipeline: import `design-system/tokens.json` → Style Dictionary → typed `theme.ts` + `tokens.css`; ThemeProvider (System/Light/Dark) swapping semantic token sets. | M | Blocks all UI. | **CP** |
| T-003 | CI guard: fail build if a component references raw hex / ramp step (semantic tokens only). | S | ∥infra | |
| T-004 | Typography primitives: bundle Inter + Newsreader; `<Display>/<Title>/<Body>/<Label>` text styles; tabular figures; Dynamic Type cap. | S | ∥design | |
| T-005 | Motion primitives: durations/easings from tokens; spring helper; reduce-motion gate. | S | ∥design | |
| T-006 | Core components batch 1: Button, Icon button, Text field, List row, Toggle, Chip. | M | ∥design | **CP** |
| T-007 | Core components batch 2: Card, Sheet, Dialog, Toast, Segmented control, Tab bar, Top app bar, FAB. | M | ∥design | **CP** |
| T-008 | Core components batch 3: Time/date picker (wheel + presets), Repeat selector, Progress ring + Streak badge, Empty state, Loading skeletons. | M | ∥design | |
| T-009 | Local store foundation: `expo-sqlite` open + versioned migration runner (`schema_version`); MMKV/kv prefs. | M | Blocks data work. | **CP** |

### Phase 1 — Clickable MVP (mock data)
| ID | Task | Size | Notes | CP |
|---|---|---|---|---|
| T-101 | Domain types: `DailyItem`, `ContentEntry`, `Notification`, enums (`content_type`, `frequency`, `daily_status`). | S | | **CP** |
| T-102 | SQLite schema (master-spec §4.1) + `itemStore.ts` (CRUD for `daily_item`, `content_entry`, `notification`). | M | | **CP** |
| T-103 | `useItems.ts` / TanStack Query hooks over the store; mock content generator in `src/data/`. | M | | **CP** |
| T-104 | Onboarding flow (D7): Welcome, Promise carousel, Set-intention (chips + time), Generating (mocked), Permission (preview, no real OS call yet), Soft-paywall (static), seeded Home. | L | ∥screens | **CP** |
| T-105 | Home "Today" screen: greeting, today's content cards grouped by time-of-day, progress ring, FAB, empty/evening variants. | L | ∥screens | **CP** |
| T-106 | Create sheet (D10): type chips + intent field + Time + Repeat(Daily/Weekdays) + Reminder toggle; save→store; edit reuse + delete confirm. | L | ∥screens | **CP** |
| T-107 | Content detail `item/[id]`: today's content, **mark-done** completion animation, history list, edit/pause/delete. | M | ∥screens | **CP** |
| T-108 | Upcoming tab: scheduled-ahead list of Dailies. | M | ∥screens | |
| T-109 | Reflect tab (shell): streak badge, history placeholder, evening reflection entry. | M | ∥screens | |
| T-110 | Settings screen: profile/anon header, premium card (static), General/Reflection/About groups, appearance switch wired to ThemeProvider. | M | ∥screens | |
| T-111 | Completion + streak logic (D3): `completed_at` writes, streak computation from completions, progress ring binding. | M | | |
| T-112 | **Exit gate:** full click-through (create→view→edit→complete→delete) on mock data, both themes. | S | demo | **CP** |

### Phase 2 — Claude integration
| ID | Task | Size | Notes | CP |
|---|---|---|---|---|
| T-201 | Backend scaffold: Express ESM proxy from forge template (helmet + express-rate-limit + CORS + dotenv + client-token gate + `@anthropic-ai/sdk`). | M | ∥backend (can start at T-001) | **CP** |
| T-202 | `GET /healthz` (`{ ok, anthropic }`); `.env.example`; Dockerfile/fly.toml/render.yaml. | S | ∥backend | |
| T-203 | `lib/anthropic.mjs`: system prompt (cached), `output_config.format` json_schema, `max_tokens`, model from env, refusal handling, intent trim. | M | ∥backend | **CP** |
| T-204 | `POST /generate` route: validate → rate-limit → Anthropic call → parse → `{ content, meta }`; error envelope. | M | ∥backend | **CP** |
| T-205 | Deploy backend to Fly/Render; smoke test `/healthz` + `/generate`. | S | | **CP** |
| T-206 | App `claudeClient.ts` (calls proxy via `http.ts` with Bearer client token + retries) + `prompts.ts` (per-type instructions). | M | | **CP** |
| T-207 | Wire generation into create flow: replace mock with real `/generate`; persist `content_entry`. | M | | **CP** |
| T-208 | Content buffer loop (D5): generate today + 6 days at creation; top-up on foreground; lazy-on-tap fallback. | M | | **CP** |
| T-209 | Live generation in onboarding (the "wow" — show AI writing for their sentence before paywall). | S | depends T-206 | **CP** |
| T-210 | **Exit gate:** creating a Daily produces real Claude content stored locally; offline re-open works. | S | | **CP** |

### Phase 3 — Notifications
| ID | Task | Size | Notes | CP |
|---|---|---|---|---|
| T-301 | `scheduler.ts` provider interface: `schedule(daily)`/`cancel(daily)`/`rescheduleAll()` over `expo-notifications`; one repeating trigger/Daily (daily; 5 for weekdays). | M | seam for push (§7.6) | **CP** |
| T-302 | Notification permission flow wired to real OS prompt (onboarding A4 + Settings); handle denied state. | M | | **CP** |
| T-303 | Deep links: `daily://item/:id` → expo-router → content detail; cold-start + warm handling. | M | | **CP** |
| T-304 | Persist `notification` rows (id + transport='local'); cancel/reschedule on edit/pause/delete (lifecycle table §7.4). | M | | **CP** |
| T-305 | `rescheduleAll()` on every app launch (reinstall/permission/OS safety net) + iOS 64-cap metering. | S | | **CP** |
| T-306 | Android: "Daily reminders" channel (importance HIGH); exact-alarm decision; doze-resilient buffer reliance. | S | ∥android | |
| T-307 | Teaser copy per type (calm voice §7.7); group multiple due Dailies. | S | ∥copy | |
| T-308 | `backgroundRefresh.ts` (expo-background-fetch top-up — best-effort, never sole path). | M | | |
| T-309 | **Exit gate:** a notification fires at the chosen time and opens ready content offline. | S | on-device test | **CP** |

### Phase 4 — Polish, monetization, store-ready
| ID | Task | Size | Notes | CP |
|---|---|---|---|---|
| T-401 | RevenueCat + StoreKit 2 integration; products (yearly $29.99 / monthly $3.99); 7-day trial annual; restore. | L | ∥monetization | **CP** |
| T-402 | Paywall sheet (design-system §E): 2-plan selector, BEST VALUE, dismissible ✕, Restore/Terms/Privacy; remote-config A/B via RevenueCat. | M | ∥monetization | **CP** |
| T-403 | Free-tier gating: cap 1–2 active Dailies; `402`/upsell when over; premium theme/feature gates. | M | ∥monetization | **CP** |
| T-404 | Reflect tab full: streak stats, history calendar/list, weekly review (Plus-gated stats). | M | ∥polish | |
| T-405 | Evening reflection (opt-in second touchpoint) + wind-down mode (Plus). | M | ∥polish | |
| T-406 | Dark-theme audit every screen; premium theme sets (Paper/Dusk/Sage/Midnight) scaffolding (gated). | M | ∥polish | |
| T-407 | Accessibility audit: AAA/AA contrast, ≥44pt, screen-reader labels, Dynamic Type largest, reduce-motion, focus order. | M | ∥polish | **CP** |
| T-408 | Analytics (PostHog/Amplitude) key events (onboarding_complete, first_content_generated, notif opt-in, paywall_shown, trial_start); Sentry crash reporting. | M | ∥infra | |
| T-409 | Ratings prompt (`SKStoreReviewController`) after positive moment (5th content / 3-day streak). | S | ∥polish | |
| T-410 | **Privacy policy** live + **App Privacy labels** (User Content → Anthropic) + AI-content disclosure copy. | M | ∥store, **submission gate** | **CP** |
| T-411 | App Store assets: icon (sunrise logomark), splash, 6 screenshots, 3 Custom Product Pages, metadata/keywords (§10.1). | L | ∥store | **CP** |
| T-412 | EAS build config; TestFlight; crisis-handling system-prompt verified; sub-compliance (price/period/trial/restore) check. | M | | **CP** |
| T-413 | **Exit gate:** submit to App Store (Health & Fitness; Lifestyle fallback). | S | **LAUNCH** | **CP** |

### Phase 5 — Cloud backend (v2; post-launch, independently shippable sub-phases)
| ID | Task | Size | Sub-phase |
|---|---|---|---|
| T-501 | Postgres schema clusters 1–3 (users/devices/auth_identities, daily_items, schedules, content_entries) — renamed per D2, `completed_at` per D3. | L | P5a |
| T-502 | `/v1` auth (anonymous + Apple claim), `/v1/me`, devices; JWT access+refresh, RLS. | L | P5a |
| T-503 | Client sync engine: push local SQLite rows up (last-write-wins via `updated_at`); keep device as offline cache. | L | P5a |
| T-504 | `generation_jobs` + worker (scan `schedules.next_run_at`, pre-gen today+tomorrow); async `/v1/dailies/:id/generate` + poll. | L | P5b |
| T-505 | `PushScheduler` implementing scheduler interface; Expo Push (EAS); `notifications` table; receipts webhook. | L | P5b |
| T-506 | Premium server: subscriptions/user_entitlements/subscription_events/credit_ledger; RevenueCat + App Store + Play webhooks; entitlement reconciler; regenerate via credits. | L | P5c |
| T-507 | Analytics first-party thin layer + nightly rollups; admin metrics. | M | P5d |

### Phase 6 — Social (v3; **moderation is a hard gate**)
| ID | Task | Size |
|---|---|---|
| T-601 | Profiles opt-in (`profiles`, handle), share-as-image (`shared_contents`, `/s/:slug`). | L |
| T-602 | Follows, reactions, comments; fan-out-on-read feed. | L |
| T-603 | **Reports + moderation queue (Apple Guideline 1.2 — required before sharing ships).** | M |
| T-604 | Publish-a-prompt as community template (reuse `prompt_templates` + visibility). | M |

### Post-launch quick wins (schedule into P4.5 / early P5)
| ID | Task | Notes |
|---|---|---|
| T-701 | **Widget** (home + lock-screen, rotating today's content). | LAUNCH §10 #4 — documented retention + ASO multiplier; high ROI. |
| T-702 | In-App Events ("7-Day Stoic Reset"). | Discovery lever. |
| T-703 | Regenerate / "give me another" (Plus; credit-metered for free). | Uses `variant` column already in schema. |

---

## 3. Phase exit criteria (gates)
- **P0 →** app boots; both themes render core components; CI raw-hex guard active; SQLite migration runner works.
- **P1 →** T-112: full click-through on mock data, both themes.
- **P2 →** T-210: real Claude content generated + cached locally; offline re-open works.
- **P3 →** T-309: notification fires at chosen time, opens ready content offline.
- **P4 →** T-413: App Store submission accepted; privacy policy + labels live; paywall + analytics + crash reporting verified.
- **P5x / P6 →** each sub-phase's API + worker + client wiring live behind a feature flag.

---

## 4. Prioritization rationale (what to cut if time-boxed)
**Must-have for a credible v1:** P0, P1, P2, P3, and within P4: T-401/402/403 (monetization), T-407 (a11y), T-410/411/412/413 (store). 
**First to cut/defer if needed:** T-404/T-405 (Reflect depth, evening/wind-down → ship streak basic only), T-406 premium themes (ship light/dark only), T-308 background-fetch (buffer + foreground top-up is enough), T-701 widget (fast-follow). 
**Never cut:** anything on the critical path, the `ANTHROPIC_API_KEY` server-only constraint, crisis handling in the system prompt, privacy policy + accurate labels.

---

## 5. Team shape & staffing suggestion
- **Eng A (Mobile lead) — owns the critical path:** P0 scaffold/store/components core → P1 data+screens → P2 client generation/buffer → P3 notifications. 
- **Eng B (Backend) — parallel from day 1:** P2 proxy (T-201–205) while A scaffolds; later P5 cloud. 
- **Eng C (UI/polish) — parallel from P0:** components batches (T-006–008), screens (T-104–110), then P4 polish/a11y/themes. 
- **Eng D (Growth/store, part-time) — parallel from P3:** RevenueCat (T-401–403), analytics (T-408), store assets + ASO + privacy (T-410/411).
A solo dev runs the critical path top-to-bottom and pulls parallel tracks inline; the §6 tracks tell you what's safe to interleave.

---

## 6. Parallelizable tracks (can run simultaneously)

These tracks have **no cross-dependencies until their join point** and can be staffed concurrently:

| Track | Tasks | Independent because… | Joins at |
|---|---|---|---|
| **∥backend** | T-201 → T-205 (proxy) | Only needs the `/generate` contract (master-spec §5.1) — no app code. Start at day 1. | T-206 (app calls it) |
| **∥design / components** | T-003, T-004, T-005, T-006, T-007, T-008 | Pure component work against tokens; no data layer. | T-104+ (screens consume them) |
| **∥screens** | T-104–T-110 | Each screen is independent given components (T-006–008) + store (T-102/103). Different engineers per screen. | T-112 click-through |
| **∥monetization** | T-401, T-402, T-403 | RevenueCat is isolated; only needs the entitlement boolean + paywall sheet. Can begin during P3. | T-403 gating into UI |
| **∥store/ASO** | T-410, T-411, plus keyword validation | Copy/assets/legal — no code dependency. Begin during P2/P3. | T-413 submission |
| **∥infra** | T-003 (CI), T-408 (analytics+Sentry) | Tooling, orthogonal to features. | continuous |
| **∥android** | T-306 | Android-specific channel/exact-alarm, parallel to iOS notif work. | T-309 |

**Rule of thumb:** the data layer (T-101/102/103) and the **scheduler interface** (T-301) are shared seams — coordinate their contracts early, then teams diverge.

---

## 7. Critical path (longest dependency chain to v1 launch)

```
T-001 scaffold
  → T-002 token/theme pipeline
    → T-006/T-007 core components
      → T-009 SQLite + migrations
        → T-101 types → T-102 store → T-103 hooks
          → T-104 onboarding + T-105 home + T-106 create + T-107 detail   (screens, parallel but all gate)
            → T-112 P1 click-through gate
              → T-201→T-204 proxy → T-205 deploy            (∥ earlier; must be done by here)
                → T-206 claudeClient → T-207 wire gen → T-208 buffer → T-209 onboarding live-gen
                  → T-210 P2 gate
                    → T-301 scheduler → T-302 permission → T-303 deeplink → T-304 lifecycle → T-305 reschedule-all
                      → T-309 P3 gate
                        → T-401 RevenueCat → T-402 paywall → T-403 gating
                          → T-407 a11y audit
                            → T-410 privacy policy/labels → T-411 store assets → T-412 EAS/TestFlight
                              → T-413 SUBMIT (LAUNCH)
```

**Critical-path watch items (most likely to slip the date):**
1. **T-002 token pipeline** — everything UI waits on it. Do it first, get it right.
2. **T-208 buffer loop** — the reliability heart; subtle (offline, foreground top-up, missed-day lazy gen).
3. **T-301–T-305 notifications** — on-device behavior (iOS 64-cap, reinstall reschedule, deep-link cold start) is where surprises live; test on real hardware early.
4. **T-401 RevenueCat + StoreKit** — store/sandbox setup has external latency (App Store Connect, product approval); start the account/product setup during P3.
5. **T-410/T-411 privacy + store assets** — submission gate; legal review + asset production have lead time; run on ∥store track from P2.

---

## 8. Dependency graph (compact)

```
P0:  T-001 ─┬─ T-002 ─┬─ T-006 ─┐
            │         ├─ T-007 ─┤
            │         └─ T-008 ─┤
            ├─ T-003 (∥)        │
            ├─ T-004/005 (∥)    │
            └─ T-009 ───────────┤
P1:  T-101 ─ T-102 ─ T-103 ─────┴─ T-104..T-110 ─ T-111 ─ T-112
P2:  T-201 ─ T-203 ─ T-204 ─ T-205 (∥ from day 1)
            T-112 + T-205 ─ T-206 ─ T-207 ─ T-208 ─ T-209 ─ T-210
P3:  T-210 ─ T-301 ─ T-302 ─ T-303 ─ T-304 ─ T-305 ─ T-309
            T-306 (∥android), T-307 (∥copy), T-308 (optional)
P4:  T-309 ─ T-401 ─ T-402 ─ T-403 ─ T-407 ─ T-410 ─ T-411 ─ T-412 ─ T-413
            T-404/405/406/408/409 (∥polish), store track ∥ from P2
P5:  T-413 ─ P5a(T-501..503) ─ P5b(T-504/505) ─ P5c(T-506) ─ P5d(T-507)
P6:  P5a ─ T-601 ─ T-602 ─ T-603(gate) ─ T-604
```

---

## 9. Risk register (roadmap-level)
| Risk | Phase | Mitigation |
|---|---|---|
| Background generation unreliable (iOS/Android best-effort) | P2/P3 | Deep 7-day buffer + foreground top-up + lazy-on-tap (never depend on background fetch). |
| iOS 64-notification cap exceeded by power cadences | P3 | One repeating trigger/Daily; free-tier cap; meter triggers; reschedule-all on launch. |
| Token cost surprise | P2/P4 | Haiku + `max_tokens` cap + rate limit + free-tier item cap; watch cost/gen weekly. |
| App Store rejection (privacy/AI/medical claims) | P4 | Accurate App Privacy labels, AI disclosure, no clinical claims, crisis handling, privacy policy — all on ∥store track early. |
| Client token leak / proxy abuse | P2 | Accept for MVP (bundle-embedded gate); plan per-device tokens in P5. |
| Scope creep into cloud/social early | all | Phases are firewalled; P5/P6 explicitly post-launch (master-spec §2.7). |
| Nothing installed (greenfield) | P0 | T-001 is the unblock; mirror DuoBrain config to de-risk setup. |

---

## 10. The exact first coding task
> **"Execute P0 + the start of P1: scaffold the Expo + expo-router + TypeScript app at the repo root mirroring DuoBrain (`app.json` scheme `daily` / bundle `com.daily.app`, `babel.config.js` `@/*`→`src/*`, strict `tsconfig` with `typedRoutes`); stand up the Style-Dictionary token pipeline from `design-system/tokens.json` into a typed `theme.ts` + ThemeProvider (System/Light/Dark); build core components batch 1–2 (Button, Field, List row, Toggle, Chip, Card, Sheet, Tab bar, Top app bar, FAB) against semantic tokens with a CI raw-hex guard; and set up `expo-sqlite` with a versioned migration runner and the `daily_item`/`content_entry`/`notification` tables from master-spec §4.1."** (T-001, T-002, T-006, T-007, T-009.)

In parallel, an available second engineer starts **∥backend** (T-201–T-205): the forge-style stateless proxy with `POST /generate`, ready to plug in at T-206.
</content>
