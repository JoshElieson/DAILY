/**
 * Icon button — 44×44 hit area, centered 24px icon (components §2).
 * Always provide an accessibilityLabel (implementation §6).
 */
import { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

export type IconButtonProps = {
  icon: LucideIcon;
  onPress?: () => void;
  accessibilityLabel: string;
  size?: number;
  active?: boolean;
  disabled?: boolean;
  color?: string;
  style?: ViewStyle;
};

export function IconButton({
  icon: Icon,
  onPress,
  accessibilityLabel,
  size = 24,
  active = false,
  disabled = false,
  color,
  style,
}: IconButtonProps) {
  const theme = useTheme();
  const iconColor = disabled
    ? theme.color.textMuted
    : color ?? (active ? theme.color.accent : theme.color.textSecondary);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        {
          borderRadius: theme.radius.full,
          backgroundColor: pressed ? theme.color.accentTint : 'transparent',
        },
        style,
      ]}
    >
      <Icon size={size} color={iconColor} strokeWidth={1.75} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
