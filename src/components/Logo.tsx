/**
 * Daily logomark — a calm sunrise over a horizon (foundations §7). Two-tone
 * clay + sand. Used in onboarding, empty states, splash, and notification mock.
 */
import React from 'react';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { useTheme } from '@/theme';

export type LogoProps = {
  size?: number;
  /** Override the sun color; defaults to the accent (clay). */
  sunColor?: string;
  horizonColor?: string;
};

export function Logo({ size = 64, sunColor, horizonColor }: LogoProps) {
  const theme = useTheme();
  const sun = sunColor ?? theme.color.accent;
  const horizon = horizonColor ?? theme.color.borderStrong;
  const s = size;

  return (
    <Svg width={s} height={s} viewBox="0 0 64 64" fill="none">
      {/* sun disc */}
      <Circle cx={32} cy={34} r={12} fill={sun} opacity={0.18} />
      <Path
        d="M20 34a12 12 0 0 1 24 0"
        stroke={sun}
        strokeWidth={3}
        strokeLinecap="round"
      />
      {/* rays */}
      <Line x1={32} y1={8} x2={32} y2={16} stroke={sun} strokeWidth={3} strokeLinecap="round" />
      <Line x1={12} y1={18} x2={17} y2={23} stroke={sun} strokeWidth={3} strokeLinecap="round" />
      <Line x1={52} y1={18} x2={47} y2={23} stroke={sun} strokeWidth={3} strokeLinecap="round" />
      {/* horizon */}
      <Line x1={8} y1={44} x2={56} y2={44} stroke={horizon} strokeWidth={3} strokeLinecap="round" />
      <Line x1={16} y1={52} x2={48} y2={52} stroke={horizon} strokeWidth={3} strokeLinecap="round" opacity={0.6} />
    </Svg>
  );
}
