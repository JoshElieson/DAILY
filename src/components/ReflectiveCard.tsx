/**
 * Reflective card — the featured "today's intention" at the top of Home
 * (components §4 Reflective variant, screens §B ③). Larger, serif quote, soft
 * clay→sand (or dusk in the evening) gradient wash, radius-xl. One per day.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { Quote } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ramp } from '@/theme/tokens';
import { useTheme } from '@/theme';
import { Text } from './Text';

export type ReflectiveCardProps = {
  eyebrow?: string;
  body: string;
  meta?: string;
  evening?: boolean;
  onPress?: () => void;
};

export function ReflectiveCard({
  eyebrow = "Today's intention",
  body,
  meta,
  evening = false,
  onPress,
}: ReflectiveCardProps) {
  const theme = useTheme();

  const colors = evening
    ? ([ramp.dusk[200], ramp.sand[100]] as const)
    : ([ramp.clay[100], ramp.sand[100]] as const);
  const darkColors = evening
    ? ([ramp.dusk[700], ramp.dusk[800]] as const)
    : ([ramp.clay[900], ramp.dusk[800]] as const);

  const Wrapper: React.ComponentType<{ children: React.ReactNode }> = onPress
    ? ({ children }) => (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`${eyebrow}: ${body}`}
        >
          {children}
        </Pressable>
      )
    : ({ children }) => <View>{children}</View>;

  return (
    <Wrapper>
      <LinearGradient
        colors={theme.isDark ? darkColors : colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          {
            borderRadius: theme.radius.xl,
            // Glassy inner edge + soft lift make the featured card feel premium.
            borderWidth: 1,
            borderColor: theme.isDark
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(255,255,255,0.55)',
            ...theme.elevation[1],
          },
        ]}
      >
        <View style={styles.eyebrowRow}>
          <Quote
            size={13}
            color={theme.color.accent}
            strokeWidth={2}
            fill={theme.color.accent}
          />
          <Text variant="overline" color="textSecondary">
            {eyebrow}
          </Text>
        </View>
        <Text variant="title" style={{ marginTop: theme.space[3] }}>
          “{body}”
        </Text>
        {meta ? (
          <Text variant="caption" color="textSecondary" style={{ marginTop: theme.space[4] }}>
            {meta}
          </Text>
        ) : null}
      </LinearGradient>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: { padding: 22 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
});
