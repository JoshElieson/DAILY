# 03 · Screens & Flows

Annotated wireframes for every screen in the request. Drawn in monospace at an
approximate mobile aspect (~390×844). Callouts `①②③` are explained below each
frame, with the components and tokens used. Fidelity is **layout & intent** —
hand to design for high-fidelity comps.

Legend: `[ ]` button · `( )` pill/chip · `◌`/`●` checkbox · `›` chevron ·
`▭` image/illustration · `▁▁` input field · `⟨⟩` toggle.

---

## A. Onboarding

Four calm screens. Goal: communicate the *feeling* and earn one permission
(notifications), with the least friction. Progress shown as dots. Every screen
is skippable except the value-setting moment, which has a sensible default.

### A1 · Welcome

```
┌─────────────────────────────────────────┐
│                                          │
│                                          │
│                  ☀                       │ ①
│                                          │
│                                          │
│            Welcome to Daily              │ ②
│                                          │
│     A calmer way to remember what        │
│        matters — one day at a time.      │ ③
│                                          │
│                                          │
│                                          │
│                                          │
│              ● ○ ○ ○                     │ ④
│                                          │
│         [      Get started      ]        │ ⑤
│                                          │
│              I already have an account   │ ⑥
└─────────────────────────────────────────┘
```

① Logomark — animated sunrise, gentle fade+rise on launch (`motion-slow`).
② `display-xl` **serif**, `--color-text`.
③ `body-l`, `--color-text-secondary`, centered, ~60ch.
④ Progress dots — active `--color-accent`, inactive `--color-border-strong`.
⑤ Primary Button, large, full-width, `space-5` margins.
⑥ Ghost text link, `--color-accent`.
Background: `--color-bg` with a faint top-to-bottom clay→sand gradient wash.

### A2 · The promise (calm framing)

```
┌─────────────────────────────────────────┐
│  ‹ Back                          Skip    │ ①
│                                          │
│            ▭▭▭▭▭▭▭▭▭▭▭                   │ ②
│            ▭ illustration ▭              │
│            ▭▭▭▭▭▭▭▭▭▭▭                   │
│                                          │
│      Gentle nudges, not alarms           │ ③
│                                          │
│     Daily reminds you softly and lets    │
│     you reflect — no stress, no pressure, │
│     no red badges shouting at you.       │ ④
│                                          │
│                                          │
│              ○ ● ○ ○                     │
│                                          │
│         [      Continue      ]           │
└─────────────────────────────────────────┘
```

① App-bar ghost actions; "Skip" jumps to permission step.
② Two-tone editorial illustration (clay/sage on sand), `radius-2xl`.
③ `display-l` **serif**.
④ `body-l` secondary. Carousel of 2–3 such value screens, swipeable; dots track
position. Keep copy reflective and reassuring.

### A3 · Set your first intention (interactive)

```
┌─────────────────────────────────────────┐
│  ‹ Back                          Skip    │
│                                          │
│     What's one thing you'd like          │ ①
│       to return to each day?             │
│                                          │
│  ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁       │ ②
│  e.g. Take a mindful pause                │
│                                          │
│  Try one of these:                       │ ③
│  ( Drink water ) ( Stretch ) ( Read )    │
│  ( Journal )  ( Walk outside )           │
│                                          │
│   ◷  Remind me at   [ 8:00 AM ▾ ]        │ ④
│                                          │
│                                          │
│              ○ ○ ● ○                     │
│         [   Set my intention   ]         │
└─────────────────────────────────────────┘
```

① `display-l` **serif** — a question, makes onboarding feel personal.
② Text field, autofocus, placeholder muted. Optional — can skip.
③ Suggestion chips that fill the field on tap (reduce blank-page friction).
④ Inline time chip → opens time picker sheet; defaults to 8:00 AM.
This seeds the Home screen so it's never empty — a warm first-run.

### A4 · Permission (notifications)

```
┌─────────────────────────────────────────┐
│                                          │
│                  🔔                      │ ①
│                                          │
│        Let Daily gently remind you       │ ②
│                                          │
│     We'll only notify you at the times   │
│     you choose. No spam, ever. You can   │
│     change this anytime in Settings.     │ ③
│                                          │
│   ┌─────────────────────────────────┐    │ ④
│   │ Preview                          │    │
│   │ Daily · now                      │    │
│   │ Morning pages                    │    │
│   │ Write three pages, longhand      │    │
│   └─────────────────────────────────┘    │
│                                          │
│         [   Enable reminders   ]         │ ⑤
│            Maybe later                    │ ⑥
└─────────────────────────────────────────┘
```

① Soft icon, not the system alert yet.
② `display-l` **serif**.
③ `body-l` secondary — set expectations before the OS prompt (raises opt-in).
④ A live **notification preview** card so they see exactly what they'll get.
⑤ Primary → triggers the real OS permission dialog.
⑥ Ghost "Maybe later" — respectful, no dark pattern. Then → Home.

---

## B. Home — "Today"

The heart of the app. Calm, scannable, focused on *today*. Large serif greeting,
one featured intention, then today's reminders grouped by time of day.

```
┌─────────────────────────────────────────┐
│                                  ⚙   ◐   │ ①
│  Good morning, Josh                      │ ②
│  Tuesday, June 13                        │
│                                          │
│  ┌───────────────────────────────────┐  │ ③
│  │  TODAY'S INTENTION                 │  │
│  │  "Move slowly and notice          │  │
│  │   the small things."              │  │
│  │                          ◷ all day │  │
│  └───────────────────────────────────┘  │
│                                          │
│   ◷ 3 of 5 done            ◜◝ ring      │ ④
│  ─────────────────────────────────────   │
│  MORNING                                 │ ⑤
│  ┌───────────────────────────────────┐  │
│  │ ●  Morning pages              9:00 │  │ ⑥ (done, dimmed)
│  ├───────────────────────────────────┤  │
│  │ ◌  Stretch & breathe          9:30 │  │
│  │    Five minutes by the window      │  │
│  └───────────────────────────────────┘  │
│                                          │
│  AFTERNOON                               │
│  ┌───────────────────────────────────┐  │
│  │ ◌  Drink water               14:00 │  │
│  ├───────────────────────────────────┤  │
│  │ ◌  Walk outside              17:30 │  │
│  └───────────────────────────────────┘  │
│                                       ⊕  │ ⑦
│ ┌─────────────────────────────────────┐ │
│ │   ☀        ◷        ✦        ☰       │ │ ⑧
│ │  Today   Upcoming  Reflect  Settings │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

① Top app-bar trailing: Settings gear, theme/profile toggle.
② Large-title greeting, `display-l` **serif**; time-aware ("Good morning/
afternoon/evening"). Subtitle `caption` secondary. Collapses to compact sticky
`heading` on scroll.
③ **Reflective card** — today's intention/quote, serif `title`, soft clay→sand
gradient wash, `radius-xl`. Tappable to edit. One per day.
④ Day progress: completion count (`label`) + **progress ring** (sage). Calm
sense of momentum, not pressure.
⑤ Time-of-day section header, `overline`, secondary.
⑥ **Reminder cards** grouped in a `surface` container with inset dividers;
completed items dimmed with sage leading accent. Swipe = complete/snooze.
⑦ **FAB** (+) → opens Reminder Creation sheet.
⑧ Tab bar. "Today" active (`--color-accent`).

**Empty variant:** if no reminders, replace the list with the Empty State
component (§18) — soft sunrise, "A calm, open day", single CTA.

**Evening variant:** after the last reminder time, the gradient wash shifts
toward **dusk** tones and copy invites reflection ("How did today feel?") with a
link into Reflect — reinforcing the daily rhythm.

---

## C. Reminder Creation Flow

Presented as a **bottom sheet** from the FAB (large detent). Single screen,
progressive disclosure — the common case (title + time) is one glance; advanced
options expand. No multi-step wizard for the basic path.

### C1 · Create sheet (default)

```
┌─────────────────────────────────────────┐
│ ░░░░░░░░░ (scrim over Home) ░░░░░░░░░░░░ │
│ ┌─────────────────────────────────────┐ │
│ │             ▁▁▁ grabber              │ │ ①
│ │  Cancel        New reminder     Save │ │ ②
│ │                                      │ │
│ │  ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁    │ │ ③
│ │  What would you like to remember?    │ │
│ │                                      │ │
│ │  ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁ (note)   │ │ ④
│ │                                      │ │
│ │  ┌─────────────────────────────────┐ │ │
│ │  │ ◷  Time            8:00 AM   ›   │ │ │ ⑤
│ │  ├─────────────────────────────────┤ │ │
│ │  │ ⟳  Repeat          Daily     ›   │ │ │ ⑥
│ │  ├─────────────────────────────────┤ │ │
│ │  │ 🔔  Reminder        On       ⟨●⟩ │ │ │ ⑦
│ │  ├─────────────────────────────────┤ │ │
│ │  │ ◍  Category        Wellbeing ›   │ │ │ ⑧
│ │  └─────────────────────────────────┘ │ │
│ │                                      │ │
│ │       [        Save        ]         │ │ ⑨
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

① Grabber — drag to dismiss.
② Sheet header: ghost "Cancel" left, title `heading` center, "Save" disabled
until a title exists.
③ Title field, autofocus, `body-l`, sunken fill.
④ Optional note, multiline, auto-grow.
⑤ **Time row** → opens time picker (wheel + quick presets Morning/Midday/Evening).
⑥ **Repeat row** → repeat selector (Never/Daily/Weekdays/Weekly/Custom + day
toggles).
⑦ **Reminder toggle** — whether to send a push; on by default, sage when on.
⑧ **Category** → colored category picker (Wellbeing, Work, Personal, Health…),
each with a color dot used as the card accent.
⑨ Primary Save (redundant with header for reachability). Light haptic + toast
"Reminder saved" on success; sheet dismisses with spring.

### C2 · Time picker (pushed within sheet)

```
┌─────────────────────────────────────────┐
│  ‹ Time                                  │
│                                          │
│  ( Morning )( Midday )( Evening )( Custom)│ ① presets
│                                          │
│            ┌───────────────┐             │
│              07   58   AM                │
│            ╎ 08   59   PM ╎  ← selection │ ②
│              09   00       band tint     │
│            └───────────────┘             │
│                                          │
│         [        Confirm        ]        │
└─────────────────────────────────────────┘
```

① Quick presets as chips — one tap covers most cases.
② Wheel picker, centered band tinted `--color-accent-tint`, large digits.

### C3 · Repeat selector

```
┌─────────────────────────────────────────┐
│  ‹ Repeat                                │
│  ┌───────┬───────┬────────┬──────────┐   │
│  │ Never │ Daily │Weekdays│  Custom  │   │ segmented
│  └───────┴───────┴────────┴──────────┘   │
│                                          │
│  On these days                           │
│   (S) (M) (T) (W) (T) (F) (S)            │ ← day toggles
│                                          │
│  Ends                                    │
│   Never · On date · After n times        │
│                                          │
│         [        Done        ]           │
└─────────────────────────────────────────┘
```

**Edit flow** reuses C1 with values prefilled, title "Edit reminder", plus a
"Delete reminder" destructive ghost row at the bottom (confirm dialog).

---

## D. Settings

Grouped list, calm and legible. Profile header, then grouped `surface`
containers. Premium entry point lives near the top.

```
┌─────────────────────────────────────────┐
│  ‹                Settings               │ ①
│                                          │
│   ( JE )  Josh Elieson                   │ ②
│          joshelieson5@gmail.com      ›   │
│                                          │
│  ┌───────────────────────────────────┐  │ ③
│  │  ✦  Daily Premium                  │  │
│  │     Unlock themes, stats & more  › │  │
│  └───────────────────────────────────┘  │
│                                          │
│  GENERAL                                 │ ④
│  ┌───────────────────────────────────┐  │
│  │ 🔔  Notifications              ›   │  │
│  │ ◐  Appearance        System    ›   │  │
│  │ ◷  Default time      8:00 AM   ›   │  │
│  │ 🗓  Week starts on    Monday   ›   │  │
│  └───────────────────────────────────┘  │
│                                          │
│  REFLECTION                              │
│  ┌───────────────────────────────────┐  │
│  │ ✦  Daily reflection prompt    ⟨●⟩  │  │
│  │ 🔥  Show streaks              ⟨●⟩  │  │
│  └───────────────────────────────────┘  │
│                                          │
│  ABOUT                                   │
│  ┌───────────────────────────────────┐  │
│  │ ☆  Rate Daily                 ›   │  │
│  │ ✉  Contact support            ›   │  │
│  │ 🛡  Privacy policy             ›   │  │
│  │     Version 1.0.0                  │  │
│  └───────────────────────────────────┘  │
│                                          │
│            Sign out                      │ ⑤
└─────────────────────────────────────────┘
```

① Compact app bar, back chevron, centered title `heading`.
② Profile row — avatar (initials in clay tint circle), name `subheading`,
email `caption` secondary, chevron to account.
③ **Premium card** — distinct treatment: subtle clay→sage gradient, `radius-lg`,
sparkle glyph. Always visible until subscribed; afterwards shows "Premium ·
active" with a sage check.
④ Grouped list rows (§5) with overline section headers. Toggles for boolean
prefs; chevrons + value text for navigable.
⑤ Destructive ghost "Sign out", centered, `--color-error`.

**Appearance sub-screen:** segmented *System / Light / Dark* + a "Theme" gallery
for Premium (e.g. *Paper, Dusk, Sage, Midnight*) shown locked with a lock badge
for free users → routes to upsell.

---

## E. Premium Upsell

Presented as a **bottom sheet** (large detent) from any locked feature or the
Settings card. Warm, benefit-led, honest. Single clear price choice.

```
┌─────────────────────────────────────────┐
│ ┌─────────────────────────────────────┐ │
│ │             ▁▁▁ grabber          ✕   │ │ ①
│ │                                      │ │
│ │                ✦                     │ │ ②
│ │         Daily Premium                │ │
│ │   Go deeper with your daily practice │ │
│ │                                      │ │
│ │  ✓  Beautiful themes & app icons     │ │ ③
│ │  ✓  Reflection history & insights    │ │
│ │  ✓  Unlimited reminders & categories │ │
│ │  ✓  Streak stats & weekly review     │ │
│ │  ✓  Gentle "wind-down" evening mode  │ │
│ │                                      │ │
│ │  ┌────────────────┐ ┌─────────────┐  │ │ ④
│ │  │  Yearly        │ │  Monthly    │  │ │
│ │  │  $29.99 / yr   │ │  $3.99 /mo  │  │ │
│ │  │  Save 37% ·    │ │             │  │ │
│ │  │  BEST VALUE  ● │ │           ○ │  │ │
│ │  └────────────────┘ └─────────────┘  │ │
│ │                                      │ │
│ │      7 days free, then $29.99/yr     │ │ ⑤
│ │                                      │ │
│ │       [   Start free trial   ]       │ │ ⑥
│ │                                      │ │
│ │   Restore · Terms · Privacy          │ │ ⑦
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

① Sheet with close ✕ (no dark pattern — easy to dismiss).
② Brand moment: sparkle, `title` **serif** headline, `body-l` secondary.
③ Benefit list — sage checkmarks, `body`, value-led (outcomes, not features).
④ **Plan selector** — two cards, yearly preselected with "BEST VALUE" badge
(`--color-accent-tint`), radio ● on selected (`--color-accent` border). Clear
per-period price, honest savings.
⑤ Trial terms in plain language, `caption` — transparent billing.
⑥ Primary CTA reflects selection ("Start free trial" / "Continue").
⑦ Required legal/restore links, `caption` ghost, `--color-text-secondary`.

**Principles:** one screen, no countdown timers, no fake scarcity, dismissible.
Premium feels like an invitation to go deeper, not a tollgate.

---

## F. Notification Previews

Notifications are the product's voice outside the app — they must feel **calm,
human, and specific**. Quiet wording, never nagging. Below: how they render per
surface.

### F1 · Lock screen (iOS-style)

```
┌─────────────────────────────────────────┐
│                 9:41                     │
│            Tuesday, June 13              │
│                                          │
│  ┌───────────────────────────────────┐  │
│  │ ☀ Daily                       now  │  │ ①
│  │ Morning pages                      │  │ ②
│  │ Write three pages, longhand — a    │  │
│  │ gentle start to the day.           │  │ ③
│  └───────────────────────────────────┘  │
│                                          │
│  ┌───────────────────────────────────┐  │
│  │ ☀ Daily                      8:00  │  │
│  │ Time to stretch & breathe          │  │
│  │ Five minutes by the window.        │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

① App icon (sunrise) + name + timestamp.
② Title = reminder title, friendly framing.
③ Body = the note, or a gentle default line. Tone: invitational ("Time to…",
"A moment for…"), never "OVERDUE" / "Don't forget!".

### F2 · Expanded with actions (long-press)

```
┌───────────────────────────────────────┐
│ ☀ Daily                          8:00  │
│ Time to stretch & breathe              │
│ Five minutes by the window.            │
│ ───────────────────────────────────── │
│   ✓ Mark done      ◷ Snooze 1h         │ ① actions
│   ✎ Edit                               │
└───────────────────────────────────────┘
```

① Quick actions: **Mark done** (sage), **Snooze** (presets: 1h / this evening /
tomorrow), **Edit**. Completing here updates the app + fires the completion
animation next open. No need to enter the app.

### F3 · Banner (in-app / Android heads-up)

```
┌───────────────────────────────────────┐
│ ☀  Daily · Walk outside                │
│    The afternoon light is nice today.  │
│                          ✓      ◷       │
└───────────────────────────────────────┘
```

Compact, single line + secondary. Rounded `radius-lg`, `--color-surface`,
`elevation-3` when shown in-app. Trailing complete/snooze icon buttons.

### F4 · Daily reflection (evening)

```
┌───────────────────────────────────────┐
│ ☀ Daily                         8:30pm │
│ How did today feel?                    │
│ Take a quiet moment to look back on    │
│ your day.                              │
└───────────────────────────────────────┘
```

Distinct evening voice → deep-links into **Reflect**. Uses dusk-tinted accent.
Opt-in, controlled by Settings → "Daily reflection prompt".

### Notification content rules

- **Voice:** warm, second-person, invitational. Verbs like *time for, a moment
  to, return to, notice*. Never *overdue, failed, don't forget, urgent*.
- **No badges screaming counts.** App icon badge is optional and off by default
  (Settings) — supports the "no red pressure" promise.
- **Specific > generic.** Use the reminder's own title/note.
- **Grouping:** multiple due reminders collapse into a Daily group ("3 reminders
  this morning") rather than stacking noisily.
- **Sound:** a single soft chime; respects system Focus/DND and quiet hours
  (Premium "wind-down" mode suppresses evening pushes automatically).
