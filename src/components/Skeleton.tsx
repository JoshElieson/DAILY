/**
 * Skeleton — surface-sunken block at component shape with a gentle, low-contrast
 * shimmer (components §19). No spinners on first paint of lists.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, type DimensionValue, type ViewStyle } from 'react-native';

import { useReduceMotion } from '@/lib/useReduceMotion';
import { useTheme } from '@/theme';

export type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
};

export function Skeleton({ width = '100%', height = 16, radius, style }: SkeletonProps) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(0.7);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: theme.motion.duration.ambient,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: theme.motion.duration.ambient,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion, theme.motion.duration.ambient]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius ?? theme.radius.sm,
          backgroundColor: theme.color.surfaceSunken,
          opacity,
        },
        style,
      ]}
    />
  );
}
