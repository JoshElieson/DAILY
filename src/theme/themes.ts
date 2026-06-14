/**
 * Color themes — selectable accent palettes layered on top of the light/dark
 * appearance. Appearance (System/Light/Dark) controls the neutral surfaces and
 * text; a color theme swaps only the accent family (accent + hover/pressed/tint
 * + focus ring), so every screen recolors cleanly without touching component
 * code (it still consumes semantic tokens via `useTheme()` — tokens.ts §header).
 *
 * Each theme provides a light and a dark accent set tuned for contrast on that
 * appearance's surfaces (lighter, more luminous accents on dark, as the base
 * `darkColors` does).
 */
import type { ColorScheme } from './ThemeProvider';
import type { SemanticColors } from './colors';

export type ColorTheme = 'clay' | 'sage' | 'dusk' | 'rose' | 'amber';

/** The accent-family slots a theme overrides. */
type AccentSet = Pick<
  SemanticColors,
  'accent' | 'accentHover' | 'accentPressed' | 'accentTint' | 'focusRing'
>;

export type ThemeMeta = {
  id: ColorTheme;
  label: string;
  /** Short word for the picker subtitle. */
  hint: string;
  /** Swatch dot shown in the picker (the light-mode accent). */
  swatch: string;
  light: AccentSet;
  dark: AccentSet;
};

/** Ordered for display; the first is the default. */
export const COLOR_THEMES: ThemeMeta[] = [
  {
    id: 'clay',
    label: 'Sunset Clay',
    hint: 'Warm terracotta',
    swatch: '#C75F3D',
    light: {
      accent: '#C75F3D',
      accentHover: '#D67C5C',
      accentPressed: '#AA4B2D',
      accentTint: '#FBF1ED',
      focusRing: 'rgba(199,95,61,0.40)',
    },
    dark: {
      accent: '#D67C5C',
      accentHover: '#E29C82',
      accentPressed: '#C75F3D',
      accentTint: 'rgba(214,124,92,0.16)',
      focusRing: 'rgba(214,124,92,0.40)',
    },
  },
  {
    id: 'sage',
    label: 'Garden Sage',
    hint: 'Calm green',
    swatch: '#62804F',
    light: {
      accent: '#62804F',
      accentHover: '#7F9A6C',
      accentPressed: '#4D663E',
      accentTint: '#EFF3EC',
      focusRing: 'rgba(98,128,79,0.40)',
    },
    dark: {
      accent: '#A0B891',
      accentHover: '#C1D2B5',
      accentPressed: '#7F9A6C',
      accentTint: 'rgba(160,184,145,0.18)',
      focusRing: 'rgba(160,184,145,0.40)',
    },
  },
  {
    id: 'dusk',
    label: 'Evening Dusk',
    hint: 'Quiet indigo',
    swatch: '#525C87',
    light: {
      accent: '#525C87',
      accentHover: '#6F7AA6',
      accentPressed: '#3F4769',
      accentTint: '#EEF0F6',
      focusRing: 'rgba(82,92,135,0.40)',
    },
    dark: {
      accent: '#969FC2',
      accentHover: '#BCC3DA',
      accentPressed: '#6F7AA6',
      accentTint: 'rgba(150,159,194,0.18)',
      focusRing: 'rgba(150,159,194,0.40)',
    },
  },
  {
    id: 'rose',
    label: 'Soft Rose',
    hint: 'Gentle blush',
    swatch: '#BE4A6A',
    light: {
      accent: '#BE4A6A',
      accentHover: '#D2738C',
      accentPressed: '#9E3A55',
      accentTint: '#FBEEF1',
      focusRing: 'rgba(190,74,106,0.40)',
    },
    dark: {
      accent: '#E08CA0',
      accentHover: '#ECB0BE',
      accentPressed: '#C2657C',
      accentTint: 'rgba(224,140,160,0.18)',
      focusRing: 'rgba(224,140,160,0.40)',
    },
  },
  {
    id: 'amber',
    label: 'Golden Amber',
    hint: 'Sunlit gold',
    swatch: '#C98A2B',
    light: {
      accent: '#C98A2B',
      accentHover: '#E0AE5C',
      accentPressed: '#A4701F',
      accentTint: '#FBF3E4',
      focusRing: 'rgba(201,138,43,0.40)',
    },
    dark: {
      accent: '#E0AE5C',
      accentHover: '#ECC587',
      accentPressed: '#C98A2B',
      accentTint: 'rgba(224,174,92,0.18)',
      focusRing: 'rgba(224,174,92,0.40)',
    },
  },
];

const BY_ID: Record<ColorTheme, ThemeMeta> = COLOR_THEMES.reduce(
  (acc, t) => {
    acc[t.id] = t;
    return acc;
  },
  {} as Record<ColorTheme, ThemeMeta>,
);

export const DEFAULT_COLOR_THEME: ColorTheme = 'clay';

export function isColorTheme(value: unknown): value is ColorTheme {
  return typeof value === 'string' && value in BY_ID;
}

/** Resolve the accent override for a theme on a given appearance scheme. */
export function accentSetFor(theme: ColorTheme, scheme: ColorScheme): AccentSet {
  const meta = BY_ID[theme] ?? BY_ID[DEFAULT_COLOR_THEME];
  return scheme === 'dark' ? meta.dark : meta.light;
}

export function themeMeta(theme: ColorTheme): ThemeMeta {
  return BY_ID[theme] ?? BY_ID[DEFAULT_COLOR_THEME];
}
