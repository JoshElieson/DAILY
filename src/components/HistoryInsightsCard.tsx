import { ChevronRight, Gem } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { useTheme } from '@/theme';

/**
 * History & Insights entry point (Reflect tab). Keeps the Premium gem mark — the
 * feature is premium-only. When the user isn't subscribed, pressing it routes to
 * the Premium upsell (the gate is handled by the caller); when they are, it opens
 * the full reflection history.
 */
export function HistoryInsightsCard({
  active,
  onPress,
}: {
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        active ? 'Open History & Insights' : 'History & Insights — Daily Premium'
      }
      style={{ marginTop: theme.space[4] }}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.color.accentTint,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.color.border,
          },
        ]}
      >
        <View style={[styles.icon, { backgroundColor: theme.color.surface }]}>
          <Gem size={22} color={theme.color.accent} strokeWidth={1.75} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="subheading">History &amp; Insights</Text>
          <Text variant="caption" color="textSecondary">
            {active
              ? 'Revisit every reflection you’ve saved'
              : 'Premium · revisit every reflection you’ve saved'}
          </Text>
        </View>
        <ChevronRight size={20} color={theme.color.accent} strokeWidth={1.75} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
