/**
 * Onboarding progress dots — active accent, inactive border-strong
 * (screens §A ④).
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

export type ProgressDotsProps = {
  count: number;
  index: number;
};

export function ProgressDots({ count, index }: ProgressDotsProps) {
  const theme = useTheme();
  return (
    <View style={styles.row} accessibilityLabel={`Step ${index + 1} of ${count}`}>
      {Array.from({ length: count }).map((_, i) => {
        const active = i === index;
        return (
          <View
            key={i}
            style={{
              width: active ? 22 : 8,
              height: 8,
              borderRadius: 999,
              backgroundColor: active ? theme.color.accent : theme.color.borderStrong,
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
});
