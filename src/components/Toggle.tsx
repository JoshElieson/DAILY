/**
 * Toggle (switch) — iOS-style pill. On = success (or accent for non-completion
 * toggles); knob slides with ease-out-soft. Light haptic on change. Always
 * paired with a label (components §7).
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet } from 'react-native';

import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';

export type ToggleProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  tone?: 'success' | 'accent';
  disabled?: boolean;
};

const TRACK_W = 51;
const TRACK_H = 31;
const KNOB = 27;

export function Toggle({
  value,
  onValueChange,
  accessibilityLabel,
  tone = 'success',
  disabled = false,
}: ToggleProps) {
  const theme = useTheme();
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 180,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: false,
    }).start();
  }, [value, anim]);

  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      theme.color.borderStrong,
      tone === 'success' ? theme.color.success : theme.color.accent,
    ],
  });
  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, TRACK_W - KNOB - 2],
  });

  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      onPress={() => {
        haptics.light();
        onValueChange(!value);
      }}
      hitSlop={8}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View style={[styles.knob, { transform: [{ translateX }] }]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: 999,
    justifyContent: 'center',
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    shadowColor: '#211B14',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
