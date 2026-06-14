/**
 * Chip / tag — pill, radius-full, height 32. Neutral · selected · with leading
 * icon or color dot (components §9).
 */
import { Check, LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { Text } from './Text';

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
  dotColor?: string;
  showCheckWhenSelected?: boolean;
};

export function Chip({
  label,
  selected = false,
  onPress,
  icon: Icon,
  dotColor,
  showCheckWhenSelected = false,
}: ChipProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        if (onPress) {
          haptics.selection();
          onPress();
        }
      }}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.color.accentTint : theme.color.surfaceSunken,
          borderRadius: theme.radius.full,
        },
      ]}
    >
      {dotColor ? (
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
      ) : null}
      {Icon ? (
        <Icon
          size={16}
          color={selected ? theme.color.accent : theme.color.textSecondary}
          strokeWidth={1.75}
        />
      ) : null}
      <Text variant="label" color={selected ? 'accent' : 'textSecondary'}>
        {label}
      </Text>
      {selected && showCheckWhenSelected ? (
        <Check size={14} color={theme.color.accent} strokeWidth={2.5} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
  },
  dot: { width: 8, height: 8, borderRadius: 999 },
});
