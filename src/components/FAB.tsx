/**
 * Floating action button — the "+" to create a reminder (components §3). 60×60,
 * accent fill, elevation-2, sits bottom-right above the tab bar; sinks on press.
 */
import { Plus } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';

export type FABProps = {
  onPress: () => void;
  accessibilityLabel?: string;
  bottom?: number;
};

export function FAB({
  onPress,
  accessibilityLabel = 'Create a reminder',
  bottom = 24,
}: FABProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptics.light();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.fab,
        {
          right: theme.space[5],
          bottom,
          backgroundColor: pressed ? theme.color.accentPressed : theme.color.accent,
          borderRadius: theme.radius.full,
          // Accent-tinted glow so the create action floats with intent.
          shadowColor: theme.color.accent,
          shadowOpacity: pressed ? 0.22 : 0.38,
          shadowRadius: pressed ? 8 : 16,
          shadowOffset: { width: 0, height: pressed ? 3 : 8 },
          elevation: pressed ? 4 : 8,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
      ]}
    >
      <Plus size={28} color={theme.color.textOnAccent} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
