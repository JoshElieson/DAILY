/**
 * Design tokens — the typed, RN-consumable mirror of `design-system/tokens.json`.
 *
 * `ramp` values are the raw color steps and exist ONLY as references for the
 * semantic sets below. Feature code and components must consume semantic tokens
 * (via `useTheme()`), never ramp steps — this is what lets themes swap cleanly
 * (design-system/04-implementation.md §2).
 */

export const ramp = {
  sand: {
    50: '#FAF7F2',
    100: '#F2ECE3',
    200: '#E7DCCF',
    300: '#D6C8B6',
    400: '#B6A48C',
    500: '#94806A',
    600: '#6F5D49',
    700: '#4E4032',
    800: '#332A20',
    900: '#211B14',
    950: '#15110C',
  },
  clay: {
    50: '#FBF1ED',
    100: '#F6DDD2',
    200: '#EDBFAE',
    300: '#E29C82',
    400: '#D67C5C',
    500: '#C75F3D',
    600: '#AA4B2D',
    700: '#883A23',
    800: '#65301E',
    900: '#46241A',
  },
  sage: {
    50: '#EFF3EC',
    100: '#DCE6D4',
    200: '#C1D2B5',
    300: '#A0B891',
    400: '#7F9A6C',
    500: '#62804F',
    600: '#4D663E',
    700: '#3B4F30',
    800: '#2C3B25',
    900: '#1F291A',
  },
  dusk: {
    50: '#EEF0F6',
    100: '#DBDFEC',
    200: '#BCC3DA',
    300: '#969FC2',
    400: '#6F7AA6',
    500: '#525C87',
    600: '#3F4769',
    700: '#2E3450',
    800: '#21263B',
    900: '#171B2B',
    950: '#0F1220',
  },
  amber: { 300: '#E0AE5C', 500: '#C98A2B' },
  rose: { 300: '#E08980', 500: '#B4473E' },
} as const;

/** 4px base spacing grid — index by step (space[4] = 16px default gutter). */
export const space = [2, 4, 8, 12, 16, 20, 24, 32, 40, 56, 72] as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  '2xl': 36,
  full: 999,
} as const;

/**
 * Elevation as React Native shadow objects (warm-tinted, soft, low — never
 * black). Tuned for a premium "ambient lift": wide, low-opacity shadows that
 * read as a soft float rather than a hard drop. iOS reads shadow*, Android
 * reads elevation.
 */
export const elevation = {
  0: {
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  1: {
    shadowColor: '#2A2014',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  2: {
    shadowColor: '#2A2014',
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  3: {
    shadowColor: '#241B12',
    shadowOpacity: 0.1,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  4: {
    shadowColor: '#241B12',
    shadowOpacity: 0.16,
    shadowRadius: 44,
    shadowOffset: { width: 0, height: 20 },
    elevation: 20,
  },
} as const;

export const motion = {
  duration: { fast: 120, base: 220, slow: 360, ambient: 800 },
  // RN Easing-friendly bezier control points.
  easing: {
    outSoft: [0.22, 1, 0.36, 1] as const,
    inOutSoft: [0.45, 0, 0.25, 1] as const,
  },
} as const;

export type Space = (typeof space)[number];
export type RadiusToken = keyof typeof radius;
export type ElevationToken = keyof typeof elevation;
