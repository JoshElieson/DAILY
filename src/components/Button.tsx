/**
 * Button — pill-shaped, soft, one main action per screen (components §1).
 * Variants: primary · secondary · tonal · ghost · destructive.
 * Sizes: large (56) · medium (48) · small (36).
 */
import { LucideIcon } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { Text } from './Text';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tonal'
  | 'ghost'
  | 'destructive';
export type ButtonSize = 'large' | 'medium' | 'small';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
};

const heights: Record<ButtonSize, number> = { large: 56, medium: 48, small: 36 };
const padX: Record<ButtonSize, number> = { large: 24, medium: 20, small: 16 };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'large',
  icon: Icon,
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  accessibilityHint,
}: ButtonProps) {
  const theme = useTheme();
  const { color } = theme;
  const isDisabled = disabled || loading;

  const palette = (pressed: boolean) => {
    switch (variant) {
      case 'secondary':
        return {
          bg: pressed ? color.surfaceSunken : color.surface,
          fg: color.text,
          border: color.borderStrong,
        };
      case 'tonal':
        return { bg: color.accentTint, fg: color.accent, border: 'transparent' };
      case 'ghost':
        return { bg: 'transparent', fg: color.accent, border: 'transparent' };
      case 'destructive':
        return { bg: 'transparent', fg: color.error, border: color.error };
      case 'primary':
      default:
        return {
          bg: pressed ? color.accentPressed : color.accent,
          fg: color.textOnAccent,
          border: 'transparent',
        };
    }
  };

  const handlePress = () => {
    if (isDisabled) return;
    if (variant === 'primary' || variant === 'destructive') haptics.light();
    onPress?.();
  };

  // Filled primary buttons get a soft, accent-tinted lift so they read as a
  // physical, premium object that sinks on press. Other variants stay flat.
  const liftShadow = (pressed: boolean): ViewStyle =>
    variant === 'primary' && !isDisabled
      ? {
          shadowColor: color.accent,
          shadowOpacity: pressed ? 0.18 : 0.32,
          shadowRadius: pressed ? 6 : 14,
          shadowOffset: { width: 0, height: pressed ? 2 : 6 },
          elevation: pressed ? 2 : 6,
        }
      : {};

  const labelColorKey =
    variant === 'primary'
      ? 'textOnAccent'
      : variant === 'destructive'
        ? 'error'
        : variant === 'secondary'
          ? 'text'
          : 'accent';

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => {
        const p = palette(pressed);
        return [
          styles.base,
          {
            height: heights[size],
            paddingHorizontal: padX[size],
            borderRadius: theme.radius.full,
            backgroundColor: isDisabled
              ? variant === 'ghost' || variant === 'destructive'
                ? 'transparent'
                : color.surfaceSunken
              : p.bg,
            borderWidth: p.border === 'transparent' ? 0 : 1,
            borderColor: p.border,
            opacity: isDisabled && variant !== 'primary' ? 0.5 : 1,
            transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
            ...liftShadow(pressed),
          },
          fullWidth && styles.fullWidth,
          style,
        ];
      }}
    >
      {loading ? (
        <ActivityIndicator color={palette(false).fg} />
      ) : (
        <View style={styles.content}>
          {Icon ? (
            <Icon
              size={20}
              color={isDisabled ? color.textMuted : palette(false).fg}
              strokeWidth={1.75}
            />
          ) : null}
          <Text
            variant={size === 'small' ? 'caption' : 'label'}
            color={isDisabled ? 'textMuted' : labelColorKey}
            style={size === 'large' ? styles.largeLabel : undefined}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  largeLabel: { fontSize: 16 },
});
