# Daily — App Store Launch Plan

> Status: launch strategy (app is pre-build; see `PLANNING.md` for architecture, `design-system/` for visuals).
> Author: launch/ASO pass, 2026-06-13.
> Companion to: `PLANNING.md` (what we build) and `design-system/` (how it looks/feels).

---

## 0. The one decision this plan makes first

Two source docs describe slightly different products:

- **`PLANNING.md`** → an **AI daily-content engine**: you describe what you want in plain language, Claude writes fresh content each day, delivered as a notification. The wedge is *natural-language personalization*.
- **`design-system/`** → a **calm reminders & intentions app**: gentle time-of-day nudges, reflection, no red badges. The wedge is *tone/feeling*.

**The launch positions Daily as: a calm, AI-personalized daily ritual.** AI personalization is the *market wedge* (research confirms the AI-journaling/AI-daily-content niche is still under-served — few entrenched competitors hold those keywords). The warm/calm "paper" brand is the *wrapper* that differentiates Daily from cold, gamified, or clinical competitors. Every asset below leads with one and is backed by the other.

> If you must ship narrower for v1: lead with the **AI-personalized reflection/journaling** angle. It's the defensible, low-competition keyword territory. "Reminders" is a red ocean (Apple Reminders is free and pre-installed); "AI daily reflection written for you" is open water.

---

## 1. Positioning

### Core positioning statement
> **For** self-improvement-minded people 18–45 who want a daily ritual without building it themselves,
> **Daily** is an AI daily-companion app
> **that** turns a sentence ("a 2-minute stoic reflection each morning") into fresh, personalized content delivered as a calm daily nudge —
> **unlike** Stoic, I Am, or Finch, which serve a fixed library of canned prompts and affirmations,
> **Daily writes something new for you every day, in the tone you ask for.**

### Taglines (test these as Custom Product Page headlines)
- Primary: **"Tell Daily what you need. Get it every day, written just for you."**
- Brand/calm: **"A calmer way to remember what matters — one day at a time."**
- Feature-forward: **"Your AI daily ritual."**

### Positioning pillars (every screenshot/page maps to one)
1. **Personal** — you write the prompt; content is generated, not picked from a deck.
2. **Fresh** — never the same canned quote twice; varies day to day.
3. **Calm** — gentle nudges, not alarms; no red badges, no guilt, no streak-shaming.
4. **Effortless** — one sentence in onboarding and you have a ritual; works offline once generated.

### Why this wins against each competitor
| Competitor | Their model | Daily's counter |
|---|---|---|
| **Stoic** | Fixed guided routines + paid AI add-on (token-metered, $24.99 packs) | AI is the *default*, not a $13/mo upsell; broader than stoicism |
| **I Am** | Static affirmation library + rotating widget | Content is *yours*, generated to your exact intent and tone |
| **Finch** | Gamified self-care pet (great retention, but childlike/cutesy) | Same non-punishing daily loop, but a grown-up, reflective aesthetic |
| **Headspace / Calm** | Premium meditation/sleep libraries (~$70/yr) | A fraction of the price; a *ritual* not a content library to consume |
| **Reflectly / Day One** | AI-guided / encrypted journaling | Daily *initiates* — it brings you the prompt, you don't open a blank page |

### App Store category
- **Primary: Health & Fitness.** Highest-converting category (median trial→paid ~37.7%) and where the wellness/journaling audience browses. Strong annual-price anchors live here (~$70/yr Headspace/Calm) that make $29.99 look generous.
- **Secondary: Lifestyle.** Backup if H&F review friction around "mental health" claims arises (keep medical-adjacent language out — see §9).

---

## 2. Pricing & subscription strategy

### Recommended structure
| Plan | Price | Notes |
|---|---|---|
| **Free** | $0 | 1–2 active daily items, today's content, basic themes. Generous on purpose — fuels ratings velocity & ASO. |
| **Daily Plus — Yearly** | **$29.99/yr** | Default/preselected. "7 days free, then $29.99/yr." "BEST VALUE · Save 37%". |
| **Daily Plus — Monthly** | **$3.99/mo** | Secondary option. |
| *(Phase 2, optional)* **Lifetime** | **$79.99** | Add after launch once you see annual conversion; sits at category mode ($74.99–99.99) and captures commitment-averse-to-subscriptions buyers. |

### Where this sits vs the market (from research)
- Health & Fitness medians: **monthly $9.99 / annual $39.94**. Affirmation cluster annual mode $29.99–39.99.
- Daily's $3.99/$29.99 is **at/below median — deliberately accessible for a launch-stage app** that needs install volume + rating velocity to win keywords.
- **You have headroom.** Once you have ratings and proof of retention, test annual **$29.99 → $39.99** and monthly **$3.99 → $4.99/$5.99**. Higher price often *increases* trial→paid conversion in this category; don't under-price out of fear.

### Free trial
- **7-day free trial on the annual plan only**, once per user. This is the H&F norm (54% of H&F apps use 5–9 day trials) and converts far better than 3-day trials (~42% vs ~25% in the long-trial data). Stoic uses 7-day for its base tier — match it.
- Already reflected in the design-system paywall ("7 days free, then $29.99/yr").

### Paywall mechanics (the single highest-leverage surface)
- **Onboarding soft paywall** (Stoic's playbook): show the paywall at the *end* of onboarding, after the user has set their first intention and seen value — not on first launch. Most conversions happen Day 0; the paywall quality decides everything.
- **2-plan layout, annual preselected** (60% of apps use 2-plan; annual is the most-featured plan). The design-system paywall already does this correctly.
- **Honest, dismissible** — close ✕, no countdown timers, no fake scarcity (per design-system §E principles). This protects the brand and reduces refunds/review risk. Trade-off accepted: a soft, honest paywall converts lower than a hard paywall (research: ~2.1% vs ~10.7% D35) — we choose brand integrity + a generous free tier to maximize *installs and ratings* at launch, then optimize conversion later.
- **Unit-economics guardrail:** generation costs real Claude tokens. Free tier must cap active items (1–2) and use `claude-haiku-4-5` + `max_tokens` cap + backend rate limit (already in `PLANNING.md §4`). Plus tier unlocks unlimited items + regenerate + (optional) Sonnet "premium quality" toggle.

### What's behind Daily Plus (from design-system §E, mapped to value)
Themes & app icons · reflection history & insights · unlimited daily items & categories · streak stats & weekly review · gentle evening "wind-down" mode · regenerate / "give me another" · (later) Sonnet quality toggle, widgets pack, cloud sync.

### Tooling
RevenueCat + StoreKit 2 (already in `PLANNING.md` Phase 4). RevenueCat gives you remote-config paywall A/B testing without app updates — essential for the price/trial/layout tests above.

---

## 3. App Store Optimization (ASO)

### 3.1 Metadata fields (exact character budgets)
| Field | Limit | Recommended value | Chars |
|---|---|---|---|
| **App name (title)** | 30 | `Daily: AI Journal & Reflect` | 28 |
| **Subtitle** | 30 | `Reminders written for you` | 25 |
| **Keyword field** | 100 | see §3.3 | ≤100 |

Alternate title to A/B test via Custom Product Pages:
- `Daily — AI Reflection Journal` (29)
- `Daily: Reflection & Reminders` (29)

**Rationale:** put the single strongest *winnable* keyword in the name — this carries the most ranking weight (I Am ranks #1 for "affirmations" largely because the word is in its name). "Journal" + "AI" are in our wedge and far more attainable than "meditation"/"affirmations". The name also keeps the brand word "Daily" first.

### 3.2 Keyword-field rules (don't waste a single char)
- Comma-separated, **no spaces after commas** (spaces are wasted characters).
- **Singular only** — Apple matches plurals automatically.
- **Never repeat** words already in the title/subtitle (title + subtitle + keywords are indexed as one pool). So *don't* spend keyword chars on: daily, ai, journal, reflect, reminder.
- No app name, no category names, no "app", **no competitor brand names** (rejection risk — don't put "stoic"/"finch"/"headspace").
- Refresh every 4–6 weeks based on rank data.

### 3.3 Keyword field (100 chars, draft)
```
affirmation,gratitude,mood,habit,mindful,intention,morning,evening,motivation,stoic,wisdom,prompt
```
(96 chars. "stoic" as a generic descriptor/lowercase common noun is fine; it is not a competitor *brand* name in the rejection sense, but if review pushes back, swap for "calm" or "ritual".)

### 3.4 Keyword targeting strategy (zero install base → long-tail first)
**Avoid (too competitive for a new app — sourced difficulty scores):**
`meditation` (difficulty 100), `affirmations` (96), and the saturated cluster: journaling, mindfulness, habit tracker, gratitude, single-word "stoic".

**Target a 50–100 term long-tail cluster** (cumulative long-tail rank beats one head-term gain; long-tail also converts 25–35% vs 2–5% for head terms). Priority clusters:
- **AI angle (the open lane):** `ai journaling`, `ai journal prompts`, `ai daily journal`, `ai reflection`
- **Stoic long-tail:** `daily stoic quotes`, `stoic journal`, `stoic reflection`, `stoicism app`
- **Time-of-day:** `morning reflection`, `evening reflection`, `daily reflection prompt`, `morning routine reminder`
- **Widget modifier (under-targeted):** `daily affirmation widget`, `reflection widget`
- **Misc:** `daily mantra`, `daily wisdom`, `gratitude prompt`, `journaling prompts daily`, `habit reminder`

> **Validate before locking:** only `meditation`/`affirmations` difficulty scores are confirmed. Run the rest through AppFigures or AppTweak "Chance Score" and filter to difficulty <~30 before finalizing the keyword field.

### 3.5 In-App Events (a real discovery lever for a *Daily* app)
Daily's whole concept is time-bound rituals — perfect for In-App Events (discoverable in search, Today/Apps tabs, and your product page; re-engage lapsed users). Ship a rolling calendar:
- **"7-Day Stoic Reset"** (evergreen, recurring)
- **"New Year Reflection"** (seasonal)
- **"30 Days of Morning Pages"**
- Limits: 15 created / 10 published, ≤31 days each, promotable 14 days early.

### 3.6 Custom Product Pages (CPPs)
- As of WWDC 2025, CPPs are **organically searchable** — assign keywords so different searchers see different creative. Limit is now 70 pages.
- Build at minimum 3 themed CPPs, each with its own screenshots + keyword set: **(a) AI/personalization**, **(b) stoic/reflection**, **(c) habits/reminders**. Point Apple Search Ads and any influencer/social traffic at the matching CPP (Headspace saw +37% on ASA via CPPs, +34% organic from localized creative A/B tests).

### 3.7 Ratings velocity (the engine behind keyword rank)
- **New-rating *velocity* beats raw total** (the explicit I Am lesson). A new app with high recent velocity can outrank an incumbent with more lifetime ratings.
- Use `SKStoreReviewController` to prompt **after a positive moment** — e.g., the user opens their 5th day's content or marks a 3-day streak, never on a paywall or error.
- Generous free tier → more installs → more rating opportunities. This is *why* the free tier is generous.

---

## 4. Screenshots (App Store gallery)

**Format:** 6 frames, portrait, 6.9"/6.7" + 6.5" + 5.5" sets. Each frame = one message, caption <5 words. Apple OCR-indexes on-image text, so **caption copy doubles as keywords** — use real terms. First 2–3 frames carry 80% of the decision (visible without scrolling). Lean on the warm "paper" brand (clay/sage, serif headlines) so the gallery looks unlike clinical competitors at a glance.

| # | Headline (on-image) | Visual | Job |
|---|---|---|---|
| 1 | **Your AI daily ritual** | Home "Today" screen, serif greeting, one beautiful intention card | Broad promise + brand feel (frame 1 = the hook) |
| 2 | **Just say what you need** | Create sheet: the free-text intent field with "a 2-minute stoic reflection" typed in | Show the wedge — natural-language personalization |
| 3 | **Written fresh, every day** | A generated ContentCard (e.g. a stoic reflection), dated | Prove "fresh, not canned" |
| 4 | **Gentle nudges, not alarms** | Lock-screen notification preview (calm wording from design-system §F1) | The calm differentiator; "no red badges" |
| 5 | **Reflect & build streaks** | Reflect/streak view with the non-punishing progress ring | Retention proof (and "streak"/"reflect" keywords) |
| 6 | **Themes, history & more** | Premium themes gallery + insights | Soft monetization nudge; depth without nag |

**Production notes**
- Use a **device frame + short caption band** layout (Headspace's "screenshots = landing page" pattern: broad → use case → feature → depth → soft proof).
- Include a **ratings/social-proof** beat once you have reviews (frame 6 caption can become "Loved by early users · 4.8★").
- **Localize + A/B test** creatives from day one via CPPs — biggest documented organic-conversion lever in the category.
- **App Preview video (optional, post-launch):** 15–20s, silent-friendly, showing type-a-sentence → content appears → notification fires.

---

## 5. Onboarding flow

The design-system already specifies a strong 4-screen flow (`03-screens.md §A`). Launch refinements layer in the conversion learnings:

```
A1 Welcome (brand: sunrise, "Welcome to Daily")
 └─ A2 The promise ("Gentle nudges, not alarms" — calm framing carousel)
     └─ A3 Set your first intention  ← DO, don't read (Finch's "start by doing")
         │   free-text field + suggestion chips + time picker (default 8:00 AM)
         └─ [Generate first content NOW — show the AI actually working]   ← ADD
             └─ A4 Notification permission (with live preview card → raises opt-in)
                 └─ Soft paywall (annual default, 7-day trial) ← Stoic's end-of-onboarding placement
                     └─ Home, already seeded with their first ritual
```

**Key principles (from research + design-system):**
1. **Start by doing, not by touring** (Finch hatches a pet before any feature list; Daily sets a real intention and *generates real content* in onboarding). The "wow" is seeing AI write something for *their* sentence — do it before the paywall.
2. **Pre-permission priming** — the design-system A4 preview card sets expectations *before* the OS dialog, which materially raises opt-in. Notifications are the retention lifeline; protect this opt-in.
3. **Paywall after value, soft and dismissible** — never on first launch.
4. **No account required** (device-scoped anonymous ID per `PLANNING.md §3.6`) — lowest friction; Sign in with Apple only when cloud sync ships.
5. **Seed the home screen** so first-run is never empty (warm first impression).

**Onboarding metric to watch:** % who reach "first content generated" and % who grant notifications. These two gates predict D1/D7 more than anything else.

---

## 6. Retention mechanics

Daily's core product *is* a retention loop — fresh daily content is the same mechanism that drives habit-app retention. Make the loop explicit:

### The appointment loop (Finch's model, adapted)
- **Today's content is an "appointment"** waiting for you — the notification is the doorbell, the generated card is the reward. This is Finch's adventure/return mechanic translated to content.
- **Pre-generate today + tomorrow** (`PLANNING.md §3.5`) so the tap is instant and offline — the reward never fails to appear.

### Streaks — non-punishing (Finch + Duolingo)
- Streaks drive the strongest documented retention lift (Duolingo: **+14% D7** from streaks). Ship them.
- But keep them **non-punishing** (the design-system's whole thesis: "no red badges shouting"). The pet/streak "waits" rather than dies. Loss aversion still works without shame — a softer "your streak is paused" beats "YOU LOST YOUR STREAK".
- Streak *stats* and weekly review behind Plus (monetize the engaged).

### Notifications (the calm voice — design-system §F)
- Warm, second-person, invitational copy ("Time for…", "A moment to…"), never "overdue/don't forget/urgent".
- Evening reflection prompt ("How did today feel?") creates a **second daily touchpoint** and reinforces rhythm.
- Group multiple reminders ("3 reminders this morning") instead of noisy stacking.
- Respect Focus/DND; Premium "wind-down" mode suppresses evening pushes. Respect builds long-term opt-in retention.

### Widget (I Am's passive-exposure engine)
- Ship a **home + lock-screen widget that surfaces today's content / rotates it** — repeated exposure *without opening the app*. This is a top retention + ASO lever (the word "widget" is intentionally a keyword). Prioritize for an early post-launch update; it's a documented growth multiplier in this exact category.

### Re-engagement
- **In-App Events** (§3.5) pull lapsed users back from the App Store itself.
- A gentle win-back push after N days inactive ("Your daily moment is still here") — calm, never guilt-based.

### Retention targets (directional benchmarks — validate against your own cohorts)
- Wellness ballpark: **D1 ~30% / D7 ~20% / D30 ~9%**. Strong habit apps hit D30 25%+.
- Finch (blog-estimated, treat as aspirational): D1 54% / D7 37%.
- **Launch goal:** beat the wellness baseline — aim D1 ≥35%, D7 ≥22%, D30 ≥12% by optimizing the notification opt-in rate and the onboarding "first content generated" rate, which are the upstream levers.

---

## 7. Launch sequencing

| Phase | Window | Focus |
|---|---|---|
| **Pre-launch** | T-4 to T-1 wk | TestFlight beta (50–200 users), seed reviews lined up, finalize metadata + 3 CPPs, privacy policy live, Apple Search Ads account ready, App Privacy labels completed |
| **Soft launch** | Week 0 | Ship to App Store quietly; verify analytics (PostHog/Amplitude), crash-free rate (Sentry), paywall + RevenueCat events firing; gather first reviews via post-positive-moment prompt |
| **ASO ramp** | Weeks 1–4 | Watch keyword ranks; iterate keyword field at week 4; A/B test screenshots & paywall via RevenueCat/CPPs; turn on Apple Search Ads on long-tail terms pointing to matching CPPs |
| **Push** | Weeks 4–8 | First In-App Event ("7-Day Stoic Reset"); ship the **widget** update; outreach to journaling/stoicism/productivity newsletters & creators; test price increase (annual → $39.99) on a cohort |
| **Scale** | Month 3+ | Add Lifetime plan; cloud sync + Sign in with Apple; localize top 2–3 markets; expand keyword coverage upward as long-tail installs accrue authority |

---

## 8. Metrics & guardrails

**North-star:** weekly retained users who received & opened today's content.

**Acquisition/ASO:** keyword ranks (target: top-10 on ≥10 long-tail terms by week 8), impression→download (product page conversion), new-rating velocity.
**Activation:** % completing onboarding to "first content generated", notification opt-in rate.
**Monetization:** download→trial, trial→paid (benchmark H&F ~37.7%), download→paid D35 (~2.9%), refund rate.
**Retention:** D1/D7/D30 (§6 targets).
**Unit economics guardrail:** Claude token cost per active user per month must stay well under ARPU. Haiku + `max_tokens` cap + free-tier item limit + backend rate limit (`PLANNING.md §4`) are the controls; watch cost-per-generation weekly.

---

## 9. App Store review & privacy readiness

- **Privacy policy** is mandatory (required for submission) — must disclose that user intent text is sent to a third-party AI provider (Anthropic).
- **App Privacy "nutrition" labels:** declare "User Content" sent to a third party for app functionality. Be accurate — mismatches trigger rejection.
- **AI-content disclosure:** state plainly in onboarding and the listing that content is AI-generated.
- **Avoid medical/clinical claims** — no "treats anxiety/depression". Keep copy to "reflection", "calm", "ritual", "intention". This is also why Lifestyle is the category fallback.
- **Crisis handling:** the system prompt (`PLANNING.md §4.2`) already routes self-harm/crisis intent to gentle, non-clinical encouragement + a note to reach a professional — keep this; reviewers look for it in wellness apps.
- **Subscription compliance:** paywall must show price, period, trial terms, and Restore/Terms/Privacy links (design-system §E ⑦ already includes these). Don't gate the Restore button.

---

## 10. The five things that matter most (if you do nothing else)

1. **Own the AI-personalization long-tail.** "ai journaling", "daily stoic", "morning/evening reflection", "daily affirmation widget" — the niche is under-served. Put the strongest winnable keyword in the name; never chase "meditation"/"affirmations".
2. **Generate real content *during* onboarding, before the paywall.** The "wow" is seeing AI write for *their* sentence. That moment drives both conversion and D1.
3. **Soft paywall at the end of onboarding, annual default, 7-day trial** — and a genuinely generous free tier to win installs + ratings velocity (the engine of keyword rank).
4. **Ship the rotating widget early** — passive daily exposure is a proven retention + discovery multiplier in this exact category.
5. **Keep it calm.** Non-punishing streaks, invitational notifications, honest dismissible paywall. The warm "paper" brand is the one thing competitors can't copy by adding a feature — it's the moat.

---

### Open items to validate before locking
- Long-tail keyword difficulty (run AppFigures/AppTweak; only meditation/affirmations are confirmed).
- Final annual price (launch $29.99; A/B toward $39.99 once ratings exist).
- Stoic lifetime price, Finch retention numbers, current I Am prices — all single-source/A/B-tested in research; directional only.
- Whether to ship reminders + AI together at v1 or lead AI-only (recommend: AI-personalized reflection leads; reminders are the delivery mechanism, not the headline).
