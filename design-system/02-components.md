# 02 · Component Library

Every reusable building block, with anatomy, variants, states, sizing, and the
tokens it consumes. Components reference **semantic tokens only** so they theme
automatically. Touch targets are **≥44×44pt** everywhere, regardless of visual
size.

States covered for interactive components: **default · hover · pressed ·
focused · disabled · loading** (where applicable).

---

## 1. Button

The primary action element. Pill-shaped, soft, confident but never loud.

### Variants

| Variant | Fill | Text | Border | Use |
|---------|------|------|--------|-----|
| **Primary** | `--color-accent` | `--color-text-on-accent` | none | The one main action per screen |
| **Secondary** | `--color-surface` | `--color-text` | 1px `--color-border-strong` | Alternative actions |
| **Tonal** | `--color-accent-tint` | `--color-accent` | none | Low-emphasis affirmative |
| **Ghost** | transparent | `--color-accent` | none | Tertiary, inline |
| **Destructive** | transparent | `--color-error` | 1px `--color-error` @ 40% | Delete, remove |

### Sizes

| Size | Height | Padding-x | Text | Radius |
|------|--------|-----------|------|--------|
| Large | 56 | `space-6` | `label` @ 16px | `radius-full` |
| Medium | 48 | `space-5` | `label` | `radius-full` |
| Small | 36 | `space-4` | `caption` @ 14px | `radius-full` |

### States (Primary)

```
default    fill clay-500            text sand-50
hover      fill clay-400            (web/pointer only)
pressed    fill clay-600 + scale .98
focused    + focus ring: 0 0 0 3px var(--color-focus-ring)
disabled   fill sand-200, text sand-400, no shadow, cursor not-allowed
loading    label → centered 18px spinner (sand-50), width locked, non-interactive
```

- Full-width primary buttons are standard for sheets/CTAs (margin `space-5`).
- Optional leading icon: 20px, `space-2` gap.
- Haptic: light impact on press for primary/destructive.

---

## 2. Icon button

44×44 hit area, centered 24px icon. `radius-full`.

| State | Style |
|-------|-------|
| default | icon `--color-text-secondary` |
| hover | bg `--color-surface-sunken` |
| pressed | bg `--color-accent-tint`, icon `--color-accent` |
| active/toggled | icon `--color-accent` |
| disabled | icon `--color-text-muted` |

Used in app bars, list row trailing actions, and the toolbar.

---

## 3. Floating action button (FAB)

The "+" to create a reminder. 60×60, `radius-full`, `--color-accent` fill,
`--color-text-on-accent` plus icon (28px), `elevation-2`. Sits bottom-right
above the tab bar (`space-5` inset, clears safe area).

- Pressed: scale .96 + `elevation-1`.
- On scroll down: optionally collapse to icon-only / fade to keep content calm.
- Tapping presents the **Reminder Creation** sheet (slide-up, spring).

---

## 4. Reminder card

The core content object on the Home screen. A single reminder/intention.

### Anatomy

```
┌───────────────────────────────────────────────┐
│ ◌  Morning pages                          9:00 │  ← checkbox · title · time
│    Write three pages, longhand                 │  ← optional note (body, muted)
│    ◷ Daily   ·   🔔 on                          │  ← meta row (chips/caption)
└───────────────────────────────────────────────┘
```

- Container: `--color-surface`, `radius-lg`, `elevation-1`, padding `space-4`/`space-5`.
- **Checkbox (leading):** 26px circle, 2px `--color-border-strong`. Tap →
  fills `--color-success`, draws check, card content fades to 60%, soft strike
  optional, `success` haptic + completion animation (see Motion §6.3).
- **Title:** `subheading`; when complete, `--color-text-muted`.
- **Note:** `body`, `--color-text-secondary`, max 2 lines, ellipsized.
- **Meta row:** schedule chip + notification state, `caption` / chips.
- **States:** default · pressed (bg → `--color-surface-sunken`) · completed
  (sage tint accent bar on leading edge) · snoozed (clock badge, dimmed).
- **Swipe actions:** left→ Complete (sage), right→ Snooze (dusk) / Delete (rose,
  requires confirm). Reveal with rounded action tiles, not full-bleed red.
- **Long-press:** lifts (`elevation-3`) for drag-reorder; haptic on pickup.

### Variants
- **Compact** (in lists/sections): single line, no note.
- **Reflective** (featured "today's intention"): larger, serif `title`, optional
  background image/gradient wash (clay→sand), used once at top of Home.

---

## 5. List row

Generic row for settings, pickers, schedules.

```
┌───────────────────────────────────────────────┐
│ [icon]  Label                       value  ›   │
│         Optional secondary text                │
└───────────────────────────────────────────────┘
```

- Min height 56, padding `space-4`. Leading icon 24 (optional, in 28 tint
  circle for settings groups). Trailing: value text (`--color-text-secondary`),
  chevron, toggle, or checkmark.
- Grouped rows sit in a `--color-surface` container `radius-lg` with inset
  hairline dividers (`--color-border`, 1px, starting after leading icon).
- Pressed: `--color-surface-sunken`.

---

## 6. Text field / input

```
 Label                                            ← label (caption, secondary)
┌───────────────────────────────────────────────┐
│ Placeholder or value                           │ ← field
└───────────────────────────────────────────────┘
 Helper or error text                             ← caption
```

- Field: `--color-surface-sunken` fill, 1px `--color-border`, `radius-md`,
  height 52, padding-x `space-4`, `body-l` text.
- **Focused:** border → `--color-border-strong`/`--color-accent`, + focus ring.
- **Error:** border `--color-error`, helper text `--color-error`, error icon.
- **Disabled:** fill `--color-surface`, text muted.
- **Multiline (note):** min 3 lines, auto-grow, same styling.
- Placeholder `--color-text-muted`. Clear (✕) button appears when filled.

---

## 7. Toggle (switch)

iOS-style pill, `radius-full`. Off: track `--color-border-strong`, knob white.
On: track `--color-success` (or `--color-accent` for non-completion toggles),
knob white slides with `ease-out-soft` 180ms. 51×31 track, 27 knob. Light haptic
on change. Always paired with a text label — never standalone.

---

## 8. Segmented control

Used for scope switches (e.g. *Today / Upcoming / All*, or AM/PM, repeat type).

```
┌───────────┬───────────┬───────────┐
│  Today    │ Upcoming  │   All     │
└───────────┴───────────┴───────────┘
   selected = surface pill + elevation-1 on sunken track
```

- Track: `--color-surface-sunken`, `radius-full`, 4px inset padding.
- Selected segment: `--color-surface` pill, `elevation-1`, `label` weight 600,
  `--color-text`. Unselected: `--color-text-secondary`.
- Slide indicator animates `motion-base`.

---

## 9. Chip / tag

Pill, `radius-full`, height 32, padding-x `space-3`, `caption`/`label`.

| Variant | Style |
|---------|-------|
| Neutral | `--color-surface-sunken`, text secondary |
| Selected | `--color-accent-tint`, text `--color-accent`, optional check |
| Schedule | leading clock/repeat icon + text |
| Category | leading color dot + name |

Filter chips are toggle-selectable; selection animates fill + check fade-in.

---

## 10. Time & date picker

Reminder timing is core — make it tactile and calm.

- **Time:** native-feel wheel picker on a sheet (hours · minutes · AM/PM),
  centered selection band tinted `--color-accent-tint`, `numeral`-ish large
  digits. Confirm with a primary button.
- **Date:** month calendar grid; today ringed, selected day filled
  `--color-accent`, `radius-full`. Past dates muted. Range select tints the span
  `--color-accent-tint`.
- **Quick presets** above the wheel as chips: *Morning (8:00) · Midday ·
  Evening (8:00 pm) · Custom* — reduces friction for the common case.

---

## 11. Repeat / schedule selector

Row group on the creation sheet:

```
 Repeat
┌───────────────────────────────────────────────┐
│ Never · Daily · Weekdays · Weekly · Custom     │  ← segmented / chips
└───────────────────────────────────────────────┘
 On these days  [S][M][T][W][T][F][S]             ← day toggles (circular)
```

Day toggles: 36px circles, selected = `--color-accent` fill + `on-accent` text.

---

## 12. Tab bar (bottom navigation)

```
┌─────────────────────────────────────────────────┐
│   ☀        ◷         ✦          ☰                │
│  Today   Upcoming  Reflect    Settings           │
└─────────────────────────────────────────────────┘
```

- 3–4 destinations: **Today · Upcoming · Reflect · Settings**.
- Height 56 + safe-area. Bg `--color-surface` with top hairline `--color-border`,
  subtle blur/translucency over content.
- Active: icon + label `--color-accent`. Inactive: `--color-text-secondary`.
- Labels `overline`/`caption`. Active tab icon may use filled/duotone variant.
- The FAB floats above this bar (create flow is not a tab).

---

## 13. Top app bar

```
┌───────────────────────────────────────────────┐
│  Good morning, Josh              ⚙   ◐         │  ← greeting/title · actions
│  Tuesday, June 13                              │  ← subtitle (caption)
└───────────────────────────────────────────────┘
```

- Large title style: greeting in `display-l` **serif** at top of Home; collapses
  to a compact `heading` sticky bar on scroll (Apple-style large-title behavior).
- Transparent over canvas; gains hairline + slight surface on scroll.
- Trailing icon buttons (profile, theme, search) max 2.

---

## 14. Sheet (bottom sheet / modal)

- Slides up from bottom, `radius-xl` top corners, `--color-surface`,
  `elevation-4`, scrim `--color-scrim` behind.
- **Grabber:** 36×4 rounded bar, `--color-border-strong`, centered, `space-3` top.
- Detents: medium (≈55%) and large (≈92%); drag to dismiss.
- Header: title (`heading`), optional left "Cancel" ghost + right primary action.
- Used for: reminder creation/edit, time/date pickers, premium upsell, confirm
  dialogs.

---

## 15. Dialog (alert)

Centered card, `radius-xl`, `--color-surface`, `elevation-4`, max-width 320,
padding `space-6`. Title `heading`, body `body`, stacked full-width buttons
(primary + ghost cancel). Destructive confirmations use a destructive primary.

---

## 16. Toast / snackbar

Floating pill above the tab bar, `--color-surface`, `elevation-3`,
`radius-full`, padding `space-3`/`space-4`. Leading status icon, `label` text,
optional trailing "Undo" ghost action. Auto-dismiss 4s, swipe to dismiss. Used
for "Reminder saved", "Marked done · Undo", "Snoozed to 6:00 pm".

---

## 17. Progress ring & streak

- **Day progress ring:** circular, 2.5px track `--color-border`, progress arc
  `--color-success`, center shows `n / m` (tabular). Animates fill on completion.
- **Streak badge:** flame/sun glyph + `numeral` count in serif, used on Reflect
  and Home header. Quiet celebration, never gamified-loud.

---

## 18. Empty state

```
            ◌  (soft sunrise illustration)

            A calm, open day

   Nothing scheduled yet. Add your first
   intention whenever you're ready.

            [  Add a reminder  ]
```

- Centered, vertically balanced (`space-10` top). Illustration (two-tone clay /
  sand), `title` **serif** headline, `body` secondary copy, single primary CTA.
- Tone is reassuring, never "you have nothing / you're behind".

---

## 19. Loading & skeletons

- Skeletons: `--color-surface-sunken` blocks at component shape, gentle shimmer
  (`motion-ambient`, low contrast). No spinners on first paint of lists.
- Inline spinner only inside buttons / pull-to-refresh.

---

## Component → token quick reference

| Component | Key tokens |
|-----------|-----------|
| Button primary | `accent`, `text-on-accent`, `radius-full`, `elevation-0` |
| Card | `surface`, `border`, `radius-lg`, `elevation-1`, `space-4` |
| Field | `surface-sunken`, `border`, `radius-md`, `space-4` |
| Toggle on | `success`, `radius-full` |
| Tab bar active | `accent`, `surface`, `border` |
| Sheet | `surface`, `scrim`, `radius-xl`, `elevation-4` |
| Completion | `success`, `success-tint`, `ease-spring-gentle` |
