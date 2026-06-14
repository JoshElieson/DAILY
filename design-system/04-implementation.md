# 04 · Implementation Recommendations

How to take this system from documents to a shipped app. Opinionated defaults;
adapt to your team's stack.

---

## 1. Recommended stack

| Concern | Recommendation | Why |
|---------|----------------|-----|
| **App framework** | **React Native (Expo)** or **Flutter** | One codebase, native feel, strong animation + notification libs. Choose RN if your team is JS/TS; Flutter if you want pixel-control + built-in theming. |
| **Native alt** | SwiftUI (iOS) + Jetpack Compose (Android) | If you want best-in-class platform polish and have the resources. Both map cleanly to these tokens. |
| **Design tooling** | Figma + Tokens Studio plugin | Sync `tokens.json` ↔ Figma variables; single source of truth. |
| **Token pipeline** | **Style Dictionary** | Transforms `tokens.json` → CSS / TS / Swift / Kotlin / Compose. |
| **Local data** | SQLite (WatermelonDB / Drift) or MMKV for prefs | Reminders are local-first; sync optional. |
| **Notifications** | `expo-notifications` / `flutter_local_notifications` + native scheduling | Local scheduled notifications cover the core; push server only for cross-device. |
| **Subscriptions** | **RevenueCat** | Cross-platform IAP, trials, restore, paywall analytics — saves weeks. |

> **Local-first by default.** Reminders, completions, and reflections live on
> device. Account/sync is an enhancement, not a requirement to use the app —
> this matches the calm, private, low-friction promise.

---

## 2. Token → code workflow

1. `tokens.json` is the source of truth (this repo).
2. Run **Style Dictionary** to generate platform outputs:
   - Web/RN: CSS vars (`tokens.css`, already provided) + a typed TS object.
   - iOS: a `Color`/`Font` extension (asset catalog or code).
   - Android: `colors.xml` + a Compose `Theme.kt`.
3. Components consume **semantic tokens only** (`--color-accent`), never ramp
   steps — this is what makes theming swap cleanly.
4. CI check: fail the build if a component references a raw hex or ramp token.

**Example (TS theme object generated from tokens):**

```ts
export const theme = {
  color: {
    bg: 'var(--color-bg)',
    surface: 'var(--color-surface)',
    accent: 'var(--color-accent)',
    text: 'var(--color-text)',
    success: 'var(--color-success)',
    // …
  },
  radius: { sm: 10, md: 14, lg: 20, xl: 28, full: 999 },
  space:  [2, 4, 8, 12, 16, 20, 24, 32, 40, 56, 72],
} as const;
```

---

## 3. Theming & dark mode

- Ship **System / Light / Dark** with System as default. Persist the choice.
- Implement via a single `data-theme` attr (web) or a Theme provider (RN/Flutter)
  that swaps the semantic token set — never branch colors inside components.
- **Dark theme (Ink Dusk):** surfaces use Dusk 900→800 tints for elevation
  rather than heavy shadows; accent shifts to Clay 400 (brighter on dark);
  success to Sage 300. All in `tokens.css` under `[data-theme="dark"]`.
- **Premium themes** (Paper, Dusk, Sage, Midnight) are additional semantic token
  sets layered on top — same mechanism, gated by entitlement.
- Test every screen in both themes + at largest Dynamic Type size before merge.

---

## 4. Typography in code

- Bundle **Inter** (variable) and **Newsreader** (variable serif) as the
  shippable defaults; treat licensed serifs (Tiempos/GT Sectra) as a drop-in
  upgrade behind the same `--font-serif` token.
- Map the type scale to named text styles/components (`<Display>`, `<Title>`,
  `<Body>`, `<Label>`) — don't set raw sizes in feature code.
- Enable **tabular figures** on all numeric displays (`font-variant-numeric:
  tabular-nums` / iOS `monospacedDigit()`).
- Respect OS font scaling; cap display styles with a max scale factor (~1.3×) so
  hero layouts don't break, but never disable scaling.

---

## 5. Motion in code

- Centralize durations/easings from tokens; no magic numbers in components.
- Use a spring lib for sheets & the completion check (RN Reanimated, Flutter
  implicit animations, SwiftUI `.spring`). Keep springs gentle (low bounce).
- **Always** gate ambient/decorative motion behind
  `prefers-reduced-motion` / `UIAccessibility.isReduceMotionEnabled`; replace
  with cross-fades.
- The completion animation is a signature moment — invest in it: sage circle
  draw + soft scale pop + `success` haptic (~300ms). Reuse the exact same
  component everywhere a thing is "marked done".

---

## 6. Accessibility (non-negotiable)

- **Contrast:** body text AAA, secondary AA (already engineered into the tokens —
  don't introduce new color pairs without checking).
- **Touch targets:** ≥44×44pt for every interactive element, even small-looking
  ones (icon buttons, checkboxes, day toggles).
- **Screen readers:** label every icon button; reminder cards announce
  "Morning pages, 9:00 AM, not done — double tap to complete". Completion state
  is conveyed by label + icon, **not color alone**.
- **Dynamic Type / font scaling:** fully supported (see §4).
- **Reduce Motion / Reduce Transparency:** honored; provide solid-surface
  fallbacks for translucent bars.
- **Focus order & visible focus** on web/companion (the focus ring token).
- Don't rely on red/green alone for error/success — pair with icon + text.

---

## 7. Notifications — engineering notes

- Schedule **local notifications** for each reminder occurrence; reschedule on
  edit/repeat changes. For repeats, schedule a rolling window (e.g. next 30
  occurrences) and top up.
- Implement **notification actions** (Mark done / Snooze / Edit) natively so
  users act from the lock screen; sync state back on next launch.
- **Grouping/threading** so multiple reminders collapse into a Daily group.
- Respect **system Focus/DND**; Premium "wind-down" suppresses evening pushes in
  a user-set quiet window.
- Badge counts **off by default** (Settings toggle) — supports the no-pressure
  promise.
- Copy comes from the reminder's own title/note; provide warm default body lines
  per category for items without a note.

---

## 8. Build order (suggested milestones)

1. **Foundations in code** — tokens pipeline, theme provider, type & motion
   primitives, core components (Button, Card, Field, List row, Sheet, Tab bar).
2. **Home + Reminder CRUD** — local DB, create/edit sheet, completion animation,
   empty state.
3. **Notifications** — scheduling, actions, grouping, permission priming screen.
4. **Onboarding** — 4 screens, first-intention seeding, permission prime.
5. **Settings** — prefs, appearance/theme switch, notification controls.
6. **Reflect + streaks** — evening prompt, history, progress ring.
7. **Premium** — RevenueCat, paywall sheet, theme gating, restore.
8. **Polish pass** — dark theme audit, a11y audit, Dynamic Type, reduce-motion,
   haptics, micro-copy review.

---

## 9. Quality bar / definition of done (per screen)

- [ ] Uses semantic tokens only (no raw hex).
- [ ] Light + dark verified.
- [ ] Largest font scale doesn't clip or overlap.
- [ ] All targets ≥44pt; screen-reader labels present.
- [ ] Motion respects reduce-motion.
- [ ] Copy matches the calm, invitational voice (no urgency words).
- [ ] Empty/loading/error states designed, not afterthoughts.

---

## 10. Voice & content guidelines (carry into copy)

- **Invitational, second person.** "Time for a pause", "A moment to reflect".
- **Never urgent or shaming.** Avoid *overdue, failed, don't forget, urgent,
  streak lost!*. A missed reminder is "still open", not "late".
- **Quiet celebration.** Acknowledge completion and streaks softly; no confetti
  spam.
- **Serif for reflection, sans for action.** Match the typographic split in the
  product's words too — greetings/prompts feel literary; buttons are plain.
