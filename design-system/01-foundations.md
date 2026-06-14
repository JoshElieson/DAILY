# 01 · Foundations

Color, typography, spacing, radius, elevation, motion, and iconography. These
are the atoms every component and screen is built from. Machine-readable values
live in [`tokens.css`](./tokens.css) and [`tokens.json`](./tokens.json); this
document is the human-readable rationale.

---

## 1. Color

### 1.1 Philosophy

Daily's color is **warm and low-chroma**. Backgrounds are paper, not white.
Accents are muted and earthy — they read as natural materials (clay, sage,
twilight) rather than digital primaries. Saturation is deliberately held back so
nothing competes with content or feels alarming.

### 1.2 Core ramps

Each ramp runs 50 (lightest) → 950 (darkest). The bolded step is the default
"on-light" usage.

**Sand** — warm neutral. The backbone: backgrounds, surfaces, borders, text.

| Step | Hex | Use |
|------|-----|-----|
| 50 | `#FAF7F2` | App canvas (light) |
| 100 | `#F2ECE3` | Raised surface, cards on canvas |
| 200 | `#E7DCCF` | Hairline borders, dividers |
| 300 | `#D6C8B6` | Disabled fills, subtle outlines |
| 400 | `#B6A48C` | Placeholder text, muted icons |
| 500 | `#94806A` | Secondary text |
| 600 | `#6F5D49` | — |
| 700 | `#4E4032` | Body text (light theme) |
| 800 | `#332A20` | Dark surface (raised) |
| 900 | `#211B14` | Primary heading text / dark canvas |
| 950 | `#15110C` | Deepest ink |

**Clay** — primary accent. CTAs, active states, brand moments.

| Step | Hex | Use |
|------|-----|-----|
| 50 | `#FBF1ED` | Tinted accent background |
| 100 | `#F6DDD2` | Selected row tint |
| 200 | `#EDBFAE` | — |
| 300 | `#E29C82` | Accent on dark surfaces |
| 400 | `#D67C5C` | Hover / pressed (light) |
| **500** | `#C75F3D` | **Primary action, brand** |
| 600 | `#AA4B2D` | Pressed primary |
| 700 | `#883A23` | — |
| 800 | `#65301E` | — |
| 900 | `#46241A` | — |

**Sage** — secondary accent. Progress, "done", calm affirmation, growth.

| Step | Hex | Use |
|------|-----|-----|
| 50 | `#EFF3EC` | Success/complete background |
| 100 | `#DCE6D4` | Completed reminder tint |
| 200 | `#C1D2B5` | — |
| 300 | `#A0B891` | Accent on dark |
| 400 | `#7F9A6C` | — |
| **500** | `#62804F` | **Success, streak, complete** |
| 600 | `#4D663E` | Pressed |
| 700 | `#3B4F30` | — |
| 800 | `#2C3B25` | — |
| 900 | `#1F291A` | — |

**Dusk** — tertiary. Evening/night theming, info, dark-theme anchor.

| Step | Hex | Use |
|------|-----|-----|
| 50 | `#EEF0F6` | Info background |
| 100 | `#DBDFEC` | — |
| 200 | `#BCC3DA` | — |
| 300 | `#969FC2` | Accent on dark |
| 400 | `#6F7AA6` | — |
| **500** | `#525C87` | **Info, evening accent** |
| 600 | `#3F4769` | — |
| 700 | `#2E3450` | Dark canvas (alt) |
| 800 | `#21263B` | Dark raised surface |
| 900 | `#171B2B` | Dark canvas |
| 950 | `#0F1220` | Deepest dark |

### 1.3 Functional colors

| Role | Light | Dark | Notes |
|------|-------|------|-------|
| Success | `Sage 500` | `Sage 300` | "Marked done", streak kept |
| Warning | `#C98A2B` (Amber) | `#E0AE5C` | Gentle, never red |
| Error | `#B4473E` (Rose-clay) | `#E08980` | Muted, not fire-engine red |
| Info | `Dusk 500` | `Dusk 300` | Tips, neutral system messages |

> **Rule:** Errors use a desaturated rose-clay, not pure red. Daily should never
> feel like it's scolding the user.

### 1.4 Semantic tokens (theme-aware)

Build components against these, **never** raw ramp steps. Dark values in
[`tokens.css`](./tokens.css).

| Token | Light value | Meaning |
|-------|-------------|---------|
| `--color-bg` | Sand 50 | App canvas |
| `--color-surface` | `#FFFFFF` | Cards, sheets |
| `--color-surface-sunken` | Sand 100 | Wells, inset fields |
| `--color-border` | Sand 200 | Hairlines, dividers |
| `--color-border-strong` | Sand 300 | Focused/active borders |
| `--color-text` | Sand 900 | Primary text |
| `--color-text-secondary` | Sand 500 | Supporting text |
| `--color-text-muted` | Sand 400 | Placeholder, timestamps |
| `--color-text-on-accent` | Sand 50 | Text on Clay 500 |
| `--color-accent` | Clay 500 | Primary actions |
| `--color-accent-hover` | Clay 400 | Hover |
| `--color-accent-pressed` | Clay 600 | Pressed |
| `--color-accent-tint` | Clay 50 | Accent backgrounds |
| `--color-success` | Sage 500 | Completion |
| `--color-success-tint` | Sage 100 | Completed states |
| `--color-warning` | Amber | — |
| `--color-error` | Rose-clay | — |
| `--color-info` | Dusk 500 | — |
| `--color-focus-ring` | Clay 400 @ 40% | Focus halo |

### 1.5 Contrast & accessibility

- Body text (`--color-text` on `--color-bg`): **≥ 7:1** (AAA).
- Secondary text (`--color-text-secondary`): **≥ 4.5:1** (AA).
- Text on Clay 500 uses Sand 50 → **4.6:1** (AA for ≥17px / large/medium).
  For small text on accent, use Sand 900 on Clay 200 tint instead.
- Never encode meaning in color alone — pair with icon, label, or shape.
- Test both themes with simulated deuteranopia/protanopia (clay↔sage remain
  distinguishable by lightness, not just hue).

---

## 2. Typography

### 2.1 Families

| Role | Primary | Open fallback stack | Why |
|------|---------|---------------------|-----|
| **Reflective / Display** | `Tiempos Text` (or `GT Sectra`) | `Newsreader, "Source Serif 4", Georgia, serif` | A humanist serif gives reflective moments weight and warmth — the Stoic influence |
| **UI / Body** | `Inter` | `"Inter", -apple-system, "SF Pro Text", "Segoe UI", Roboto, sans-serif` | Neutral, legible, excellent at small sizes; the working voice |
| **Numeric** | `Inter` (tabular figures) | same, `font-variant-numeric: tabular-nums` | Aligned times, streak counts, stats |

> If budget rules out a licensed serif, ship **Newsreader** (Google Fonts, free,
> variable) — it carries the same reflective tone. Use the serif *sparingly*:
> greetings, quotes, large numerals, and reflective prompts. Everything
> functional is sans.

### 2.2 Type scale

Modular scale ≈ **1.2**, base 16px. Serif rows marked **(serif)**; all others
are Inter.

| Token | Size / Line | Weight | Tracking | Use |
|-------|-------------|--------|----------|-----|
| `display-xl` **(serif)** | 40 / 46 | 400 | -0.5 | Onboarding hero, big greeting |
| `display-l` **(serif)** | 32 / 40 | 400 | -0.25 | Screen hero, reflective prompt |
| `title` **(serif)** | 26 / 34 | 400 | -0.25 | Section hero, quote |
| `heading` | 20 / 28 | 600 | -0.1 | Card titles, screen titles (sans) |
| `subheading` | 17 / 24 | 600 | 0 | Group headers |
| `body-l` | 17 / 26 | 400 | 0 | Primary reading text |
| `body` | 15 / 23 | 400 | 0 | Default UI text |
| `label` | 14 / 20 | 500 | 0 | Buttons, list rows, form labels |
| `caption` | 13 / 18 | 500 | 0.1 | Timestamps, helper text |
| `overline` | 12 / 16 | 600 | 0.6 (UPPER) | Section eyebrows, tags |
| `numeral` **(serif)** | 48 / 52 | 400 | -1 | Streak count, big stats |

### 2.3 Rules

- **One serif moment per screen** as a rule of thumb. Serif is seasoning.
- Body copy max line length ~**60–66 characters** for comfortable reading.
- Respect the OS **Dynamic Type / font scale**; cap display sizes so layouts
  don't break, but never disable scaling.
- Headings: weight 600, not 700 — keep it soft.
- Use **tabular figures** for any aligned numbers (times, durations, stats).

---

## 3. Spacing

A **4px base** grid. Use named steps, never arbitrary values.

| Token | px | Typical use |
|-------|----|-----|
| `space-0` | 2 | Hairline nudges |
| `space-1` | 4 | Icon ↔ label gap |
| `space-2` | 8 | Tight stacks, chip padding |
| `space-3` | 12 | Compact row padding |
| `space-4` | 16 | **Default gutter & card padding** |
| `space-5` | 20 | Comfortable internal padding |
| `space-6` | 24 | Section spacing, screen margins |
| `space-7` | 32 | Between major blocks |
| `space-8` | 40 | Hero breathing room |
| `space-9` | 56 | Top-of-screen rhythm |
| `space-10` | 72 | Empty-state vertical centering |

**Screen margins:** 20px on phones (`space-5`), 24 on larger. **Card padding:**
16–20. **List row height:** 56 min (touch target ≥44pt always).

---

## 4. Radius

Daily is **soft**. Corners are rounded everywhere; nothing has a sharp 90°.

| Token | px | Use |
|-------|----|-----|
| `radius-sm` | 10 | Chips, small inputs, tags |
| `radius-md` | 14 | Buttons, list rows |
| `radius-lg` | 20 | Cards |
| `radius-xl` | 28 | Sheets, large cards, modals |
| `radius-2xl` | 36 | Hero/feature cards |
| `radius-full` | 999 | Pills, avatars, toggles, FAB |

---

## 5. Elevation & shadows

Shadows are **soft, warm, and low** — a diffuse lift, never a hard drop. Use a
warm-tinted shadow color (Sand 900 @ low alpha), not black.

| Token | Spec | Use |
|-------|------|-----|
| `elevation-0` | none | Flat on canvas |
| `elevation-1` | `0 1px 2px rgba(33,27,20,.04), 0 1px 3px rgba(33,27,20,.06)` | Resting cards |
| `elevation-2` | `0 4px 12px rgba(33,27,20,.06), 0 2px 4px rgba(33,27,20,.04)` | Raised cards, FAB |
| `elevation-3` | `0 12px 32px rgba(33,27,20,.10), 0 4px 8px rgba(33,27,20,.05)` | Sheets, popovers |
| `elevation-4` | `0 24px 60px rgba(33,27,20,.16)` | Modals, dialogs |

In **dark theme**, reduce shadow reliance — convey elevation primarily with
*lighter surface tints* (Dusk 800 → 700) plus a faint top hairline highlight
(`inset 0 1px 0 rgba(255,255,255,.04)`).

---

## 6. Motion

Motion is **gentle, brief, and natural**. It should feel like breathing — ease
out, settle softly. Nothing bounces aggressively.

### 6.1 Duration

| Token | ms | Use |
|-------|----|-----|
| `motion-fast` | 120 | Hover, press, micro-feedback |
| `motion-base` | 220 | Most transitions, fades, toggles |
| `motion-slow` | 360 | Sheet present/dismiss, screen change |
| `motion-ambient` | 600–900 | Breathing/pulsing reflective animations |

### 6.2 Easing

| Token | Curve | Use |
|-------|-------|-----|
| `ease-out-soft` | `cubic-bezier(0.22, 1, 0.36, 1)` | Enters, reveals (default) |
| `ease-in-out-soft` | `cubic-bezier(0.45, 0, 0.25, 1)` | Moves, reorders |
| `ease-spring-gentle` | spring(stiffness 180, damping 22) | Sheets, FAB, checkmarks |

### 6.3 Patterns

- **Sheets:** slide up + fade scrim, `motion-slow`, `ease-spring-gentle`.
- **Completion check:** sage circle draws + soft scale 0.9→1.0 pop, haptic
  `success`. Reflective, satisfying, ~300ms.
- **List add/remove:** height + opacity transition, `ease-in-out-soft`.
- **Ambient:** breathing dot on the focus/timer screens pulses scale 1.0↔1.06
  over ~4s — a calming anchor.
- **Reduce Motion:** honor the OS setting. Replace movement with cross-fades;
  disable ambient pulsing entirely.

---

## 7. Iconography

- **Style:** rounded, 1.75px stroke, open and friendly. Recommended set:
  **Lucide** (rounded, consistent) or **Phosphor** (regular/duotone) — both
  match the soft brand. Avoid sharp/filled-heavy sets.
- **Sizes:** 20 (inline/label), 24 (default UI/nav), 28 (primary actions),
  44 (touch target box — icon centered).
- **Color:** inherit `currentColor`; default `--color-text-secondary`, active
  `--color-accent`.
- **Custom marks:** the Daily logomark is a simple **sunrise-over-horizon /
  single circle** — calm, dawn-of-day. Used in the app icon, splash, and empty
  states. Two-tone clay + sand.

---

## 8. Layout & grid

- **Single-column, content-led.** Phone layouts are a vertical flow with 20px
  side margins; no rigid multi-column grid on mobile.
- **Max content width** on tablet/web: 480px reading column, centered, with
  surrounding canvas.
- **Safe areas:** always respect notch/home-indicator insets; sticky bars pad
  for them.
- **Vertical rhythm:** sections separated by `space-6`/`space-7`; related items
  by `space-3`/`space-4`.
