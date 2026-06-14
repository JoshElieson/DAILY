/**
 * Day progress ring — circular sage arc, center shows n / m (tabular). Calm
 * momentum, not pressure (components §17, screens §B ④).
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/theme';
import { Text } from './Text';

export type ProgressRingProps = {
  done: number;
  total: number;
  size?: number;
  showCount?: boolean;
};

export function ProgressRing({
  done,
  total,
  size = 48,
  showCount = true,
}: ProgressRingProps) {
  const theme = useTheme();
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, done / total) : 0;
  const offset = c * (1 - pct);

  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessibilityRole="progressbar"
      accessibilityLabel={`${done} of ${total} done`}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={theme.color.border}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={theme.color.success}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {showCount ? (
        <View style={{ position: 'absolute' }}>
          <Text variant="caption" color="textSecondary" tabular>
            {done}/{total}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
