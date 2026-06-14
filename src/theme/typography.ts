/**
 * Type scale → React Native text styles. Mirrors tokens.json `font.style`.
 *
 * Because we bundle Inter and Newsreader as discrete weight files, each variant
 * pins an exact `fontFamily` (e.g. `Inter_600SemiBold`) rather than relying on
 * `fontWeight`, which is unreliable for custom fonts on Android.
 *
 * Serif (Newsreader) is reserved for reflective moments — display, title,
 * numeral. Everything functional is Inter. (foundations §2.3: serif is seasoning.)
 */
import type { TextStyle } from 'react-native';

export const fontFamily = {
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemibold: 'Inter_600SemiBold',
  serif: 'Newsreader_400Regular',
  serifMedium: 'Newsreader_500Medium',
} as const;

/** Font modules to load via `useFonts` at startup. */
export type TypeVariant =
  | 'displayXl'
  | 'displayL'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'bodyL'
  | 'body'
  | 'label'
  | 'caption'
  | 'overline'
  | 'numeral';

export const typography: Record<TypeVariant, TextStyle> = {
  displayXl: {
    fontFamily: fontFamily.serif,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.8,
  },
  displayL: {
    fontFamily: fontFamily.serif,
    fontSize: 32,
    lineHeight: 39,
    letterSpacing: -0.5,
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: 26,
    lineHeight: 33,
    letterSpacing: -0.4,
  },
  heading: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 20,
    lineHeight: 27,
    letterSpacing: -0.3,
  },
  subheading: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 17,
    lineHeight: 23,
    letterSpacing: -0.2,
  },
  bodyL: {
    fontFamily: fontFamily.sans,
    fontSize: 17,
    lineHeight: 26,
  },
  body: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    lineHeight: 23,
  },
  label: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  overline: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  numeral: {
    fontFamily: fontFamily.serif,
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -1,
  },
};

/** Numbers that should align (times, streaks, stats) — foundations §2.3. */
export const tabularNums: TextStyle = { fontVariant: ['tabular-nums'] };
