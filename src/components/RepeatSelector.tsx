import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  type RepeatValue,
  WEEKDAY_ORDER,
  dayInitial,
  dayLong,
  daysForFrequency,
  normalizeDays,
  repeatLabel,
} from '@/features/items/schedule';
import type { Frequency } from '@/features/items/types';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { Text } from './Text';

export type RepeatSelectorProps = {
  frequency: Frequency;
  daysOfWeek?: number[];
  onChange: (value: RepeatValue) => void;
};

export function RepeatSelector({ frequency, daysOfWeek, onChange }: RepeatSelectorProps) {
  const theme = useTheme();
  const selected = daysForFrequency(frequency, daysOfWeek);
  const selectedSet = new Set(selected);

  const commit = (days: number[]) => {
    haptics.selection();
    onChange(normalizeDays(days));
  };

  const toggleDay = (day: number) => {
    const next = selectedSet.has(day)
      ? selected.filter((d) => d !== day)
      : [...selected, day];
    if (next.length === 0) return; // a Daily must fire at least once a week
    commit(next);
  };

  return (
    <View style={{ gap: theme.space[4] }}>
      <View style={styles.days}>
        {WEEKDAY_ORDER.map((day) => {
          const on = selectedSet.has(day);
          return (
            <Pressable
              key={day}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={dayLong[day]}
              onPress={() => toggleDay(day)}
              style={[
                styles.day,
                {
                  borderRadius: theme.radius.full,
                  backgroundColor: on ? theme.color.accent : theme.color.surfaceSunken,
                },
                on && theme.elevation[1],
              ]}
            >
              <Text
                variant="label"
                color={on ? 'textOnAccent' : 'textSecondary'}
                // Two days share each initial (S/S, T/T); the label above keeps
                // it accessible, this is just the visual glyph.
                accessibilityElementsHidden
              >
                {dayInitial[day]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text variant="caption" color="textSecondary">
        Repeats {repeatLabel(frequency, daysOfWeek).toLowerCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  days: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  day: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
