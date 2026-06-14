/**
 * Segmented control — scope switches (Today/Upcoming/All, repeat type, etc.).
 * Sunken track, selected segment lifts to a surface pill (components §8).
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { Text } from './Text';

export type SegmentOption<T extends string> = { value: T; label: string };

export type SegmentedControlProps<T extends string> = {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.track,
        { backgroundColor: theme.color.surfaceSunken, borderRadius: theme.radius.full },
      ]}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) {
                haptics.selection();
                onChange(opt.value);
              }
            }}
            style={[
              styles.segment,
              { borderRadius: theme.radius.full },
              selected && {
                backgroundColor: theme.color.surface,
                ...theme.elevation[1],
              },
            ]}
          >
            <Text
              variant="label"
              color={selected ? 'text' : 'textSecondary'}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: 4,
  },
  segment: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
});
