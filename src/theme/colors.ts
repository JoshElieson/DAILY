/**
 * Semantic color sets (theme-aware). Build components against these names only.
 * Light + dark ("Ink Dusk") values mirror tokens.json `color.semantic` and
 * `color.semantic.dark`.
 */
import { ramp } from './tokens';

export type SemanticColors = {
  bg: string;
  surface: string;
  surfaceSunken: string;
  /** Whisper-thin edge for cards/surfaces — crisps the soft shadow (premium). */
  hairline: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textOnAccent: string;
  accent: string;
  accentHover: string;
  accentPressed: string;
  accentTint: string;
  success: string;
  successTint: string;
  warning: string;
  error: string;
  info: string;
  focusRing: string;
  scrim: string;
};

export const lightColors: SemanticColors = {
  bg: ramp.sand[50],
  surface: '#FFFFFF',
  surfaceSunken: ramp.sand[100],
  hairline: 'rgba(42,32,20,0.06)',
  border: ramp.sand[200],
  borderStrong: ramp.sand[300],
  text: ramp.sand[900],
  textSecondary: ramp.sand[500],
  textMuted: ramp.sand[400],
  textOnAccent: ramp.sand[50],
  accent: ramp.clay[500],
  accentHover: ramp.clay[400],
  accentPressed: ramp.clay[600],
  accentTint: ramp.clay[50],
  success: ramp.sage[500],
  successTint: ramp.sage[100],
  warning: ramp.amber[500],
  error: ramp.rose[500],
  info: ramp.dusk[500],
  focusRing: 'rgba(214,124,92,0.40)',
  scrim: 'rgba(33,27,20,0.40)',
};

export const darkColors: SemanticColors = {
  bg: ramp.dusk[900],
  surface: ramp.dusk[800],
  surfaceSunken: ramp.dusk[950],
  hairline: 'rgba(255,255,255,0.07)',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.16)',
  text: '#F3F1EC',
  textSecondary: ramp.dusk[200],
  textMuted: ramp.dusk[300],
  textOnAccent: '#FBF6F2',
  accent: ramp.clay[400],
  accentHover: ramp.clay[300],
  accentPressed: ramp.clay[500],
  accentTint: 'rgba(214,124,92,0.16)',
  success: ramp.sage[300],
  successTint: 'rgba(160,184,145,0.18)',
  warning: ramp.amber[300],
  error: ramp.rose[300],
  info: ramp.dusk[300],
  focusRing: 'rgba(214,124,92,0.40)',
  scrim: 'rgba(15,18,32,0.55)',
};
