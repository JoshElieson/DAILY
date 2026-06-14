# Daily — Visual Design System

A calm, reflective reminders & intention app. This system defines the complete
visual language: foundations, components, screens, flows, and implementation
guidance.

> **Product in one line:** Daily helps people set gentle intentions and
> reminders, then return to them with a sense of calm rather than urgency.

---

## Design principles

1. **Calm over urgent.** Nothing shouts. Reminders feel like a nudge from a
   thoughtful friend, not an alarm. Muted color, soft motion, generous space.
2. **Reflective, not transactional.** A serif display voice and quiet
   moments of pause make the app feel considered. We design for *attention*,
   not engagement metrics.
3. **Warm minimalism.** Plenty of whitespace, but warm — paper, not clinical
   white. Apple Health's clarity with Headspace's warmth.
4. **One thing at a time.** Each screen has a single clear focus. We resist
   density; we never crowd.
5. **Earned depth.** Power features exist but stay out of the way until needed.
   The default path is effortless.

## Aesthetic references

| Reference | What we borrow |
|-----------|----------------|
| **Headspace** | Warmth, rounded forms, friendly approachability, soft color |
| **Stoic** | Typographic reflection, restraint, dark reading moments, journaling calm |
| **Apple Health** | Systematic clarity, clean data display, trustworthy structure, light surfaces |

The synthesis: **warm paper light theme**, **ink-dusk dark theme**, a **clay**
signature accent, a **sage** support accent, a humanist **serif** for reflective
moments, and a clean **sans** for the working UI.

---

## Document index

| File | Contents |
|------|----------|
| [`01-foundations.md`](./01-foundations.md) | Color, typography, spacing, radius, elevation, motion, iconography, grid |
| [`02-components.md`](./02-components.md) | Full component library with states & specs |
| [`03-screens.md`](./03-screens.md) | Onboarding, home, reminder creation, settings, premium upsell, notifications — wireframes + annotations |
| [`04-implementation.md`](./04-implementation.md) | Stack, theming, dark mode, accessibility, motion, asset & handoff guidance |
| [`tokens.css`](./tokens.css) | CSS custom properties (light + dark) ready to drop in |
| [`tokens.json`](./tokens.json) | Platform-agnostic design tokens (Style Dictionary shape) |

## How to read the wireframes

Wireframes are drawn in monospace ASCII at an approximate 1:1 mobile aspect.
Each is followed by **annotations** keyed to numbered callouts `①②③`, plus the
tokens used. They communicate **layout, hierarchy, and intent** — not pixel-final
visuals. Hand these to design for high-fidelity, and to engineering as build
specs alongside the token files.

## Target platforms

Primary: **iOS & Android** (native or React Native / Flutter). The token files
and specs are platform-neutral; `04-implementation.md` covers per-platform
notes. A responsive web companion reuses the same tokens.
