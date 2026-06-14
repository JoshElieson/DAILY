/**
 * Card — surface container, radius-lg, elevation-1, padding space-4/5
 * (components quick-ref). Optional `onPress` makes it a pressable surface that
 * sinks to surface-sunken on press.
 */
import React from 'react';
import { Pressable, View, type ViewProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

export type CardProps = ViewProps & {
  onPress?: () => void;
  padded?: boolean;
  elevation?: 0 | 1 | 2 | 3 | 4;
  style?: ViewStyle;
  accessibilityLabel?: string;
  children?: React.ReactNode;
};

export function Card({
  onPress,
  padded = true,
  elevation = 1,
  style,
  accessibilityLabel,
  children,
  ...rest
}: CardProps) {
  const theme = useTheme();

  const base: ViewStyle = {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.lg,
    // A whisper-thin edge crisps the soft shadow — premium surfaces read sharp
    // at the boundary and soft underneath, in both light and dark.
    borderWidth: 1,
    borderColor: theme.isDark ? theme.color.border : theme.color.hairline,
    padding: padded ? theme.space[4] : 0,
    ...theme.elevation[elevation],
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          base,
          pressed && { backgroundColor: theme.color.surfaceSunken },
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[base, style]} {...rest}>
      {children}
    </View>
  );
}
