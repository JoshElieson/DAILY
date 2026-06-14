import { ChevronRight, Gem } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { useTheme } from '@/theme';

export function PremiumCard({ active, onPress }: { active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={active ? 'Premium active' : 'Get Daily Premium'}
      style={{ marginTop: theme.space[4] }}
    >
      <View
        style={[
          styles.premium,
          {
            backgroundColor: theme.color.accentTint,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.color.border,
          },
        ]}
      >
        <View style={[styles.premiumIcon, { backgroundColor: theme.color.surface }]}>
          <Gem size={22} color={theme.color.accent} strokeWidth={1.75} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="subheading">Daily Premium</Text>
          <Text variant="caption" color="textSecondary">
            {active ? 'Active · thank you' : 'Unlock themes, weekly recap & more'}
          </Text>
        </View>
        <ChevronRight size={20} color={theme.color.accent} strokeWidth={1.75} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  premium: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  premiumIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
