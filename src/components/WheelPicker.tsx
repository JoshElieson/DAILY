/**
 * WheelPicker — a single snapping column used by the time picker. Centered
 * selection band tinted accent-tint, large digits (components §10). Built on a
 * snapping ScrollView so it has a native, tactile feel without extra native deps.
 */
import React, { useEffect, useRef } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { Text } from './Text';

const ITEM_HEIGHT = 44;
const VISIBLE = 5; // odd so there is a clear center

export type WheelPickerProps = {
  values: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  width?: number;
  accessibilityLabel?: string;
};

export function WheelPicker({
  values,
  selectedIndex,
  onChange,
  width = 80,
  accessibilityLabel,
}: WheelPickerProps) {
  const theme = useTheme();
  const ref = useRef<ScrollView>(null);
  const lastIndex = useRef(selectedIndex);

  useEffect(() => {
    ref.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
  }, [selectedIndex]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    if (idx !== lastIndex.current && idx >= 0 && idx < values.length) {
      lastIndex.current = idx;
      haptics.selection();
    }
  };

  const handleEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.max(
      0,
      Math.min(values.length - 1, Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT)),
    );
    onChange(idx);
  };

  const pad = (ITEM_HEIGHT * (VISIBLE - 1)) / 2;

  return (
    <View
      style={{ height: ITEM_HEIGHT * VISIBLE, width }}
      accessibilityLabel={accessibilityLabel}
    >
      <View
        pointerEvents="none"
        style={[
          styles.band,
          {
            top: pad,
            height: ITEM_HEIGHT,
            backgroundColor: theme.color.accentTint,
            borderRadius: theme.radius.sm,
          },
        ]}
      />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScroll={handleScroll}
        onMomentumScrollEnd={handleEnd}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: pad }}
      >
        {values.map((v, i) => {
          const selected = i === selectedIndex;
          return (
            <View key={`${v}-${i}`} style={styles.item}>
              <Text
                variant={selected ? 'heading' : 'subheading'}
                color={selected ? 'text' : 'textMuted'}
                tabular
              >
                {v}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  band: { position: 'absolute', left: 8, right: 8 },
  item: { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
});
