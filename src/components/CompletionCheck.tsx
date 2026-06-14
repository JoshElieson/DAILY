/**
 * Completion checkbox — the signature "marked done" moment. 26px circle, 2px
 * border; on complete it fills sage, draws a check, and pops scale 0.9→1.0 with
 * a success haptic (motion §6.3, implementation §5). Reused everywhere a thing
 * is marked done.
 */
import { Check } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet } from 'react-native';

import { haptics } from '@/lib/haptics';
import { useReduceMotion } from '@/lib/useReduceMotion';
import { useTheme } from '@/theme';

export type CompletionCheckProps = {
  checked: boolean;
  onToggle: (next: boolean) => void;
  accessibilityLabel: string;
  size?: number;
};

export function CompletionCheck({
  checked,
  onToggle,
  accessibilityLabel,
  size = 26,
}: CompletionCheckProps) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (checked && !reduceMotion) {
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 0.9,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          tension: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [checked, reduceMotion, scale]);

  const handle = () => {
    const next = !checked;
    if (next) haptics.success();
    else haptics.light();
    onToggle(next);
  };

  return (
    <Pressable
      onPress={handle}
      hitSlop={12}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View
        style={[
          styles.box,
          {
            width: size,
            height: size,
            borderRadius: 999,
            borderWidth: 2,
            borderColor: checked ? theme.color.success : theme.color.borderStrong,
            backgroundColor: checked ? theme.color.success : 'transparent',
            transform: [{ scale }],
          },
        ]}
      >
        {checked ? (
          <Check size={size * 0.6} color="#FFFFFF" strokeWidth={3} />
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
});
