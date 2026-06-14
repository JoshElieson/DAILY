/**
 * TimePicker — quick presets (Morning/Midday/Evening/Custom) over a wheel of
 * hours · minutes · AM/PM (components §10, screens §C2). Operates on a 'HH:MM'
 * 24h string; presents inside a sheet/screen with its own Confirm.
 */
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { buildTime, parseTime } from '@/lib/date';
import { useTheme } from '@/theme';
import { Button } from './Button';
import { Chip } from './Chip';
import { Text } from './Text';
import { WheelPicker } from './WheelPicker';

export type TimePickerProps = {
  value: string; // 'HH:MM'
  onConfirm: (value: string) => void;
};

const HOURS = Array.from({ length: 12 }, (_, i) => String(i === 0 ? 12 : i)).map((h) =>
  h.padStart(2, '0'),
);
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const PERIODS = ['AM', 'PM'];

const presets = [
  { label: 'Morning', time: '08:00' },
  { label: 'Midday', time: '12:00' },
  { label: 'Evening', time: '20:00' },
];

function to12h(hhmm: string) {
  const { hour, minute } = parseTime(hhmm);
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return { hourIndex: HOURS.indexOf(String(h12).padStart(2, '0')), minuteIndex: minute, periodIndex: period === 'AM' ? 0 : 1 };
}

export function TimePicker({ value, onConfirm }: TimePickerProps) {
  const theme = useTheme();
  const initial = useMemo(() => to12h(value), [value]);
  const [hourIndex, setHourIndex] = useState(initial.hourIndex < 0 ? 7 : initial.hourIndex);
  const [minuteIndex, setMinuteIndex] = useState(initial.minuteIndex);
  const [periodIndex, setPeriodIndex] = useState(initial.periodIndex);

  const current = useMemo(() => {
    let h = Number(HOURS[hourIndex]) % 12;
    if (periodIndex === 1) h += 12;
    return buildTime(h, Number(MINUTES[minuteIndex]));
  }, [hourIndex, minuteIndex, periodIndex]);

  const applyPreset = (time: string) => {
    const next = to12h(time);
    setHourIndex(next.hourIndex);
    setMinuteIndex(next.minuteIndex);
    setPeriodIndex(next.periodIndex);
  };

  return (
    <View style={{ gap: theme.space[5] }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: theme.space[2] }}
      >
        {presets.map((p) => (
          <Chip
            key={p.label}
            label={p.label}
            selected={current === p.time}
            onPress={() => applyPreset(p.time)}
          />
        ))}
        <Chip label="Custom" selected={!presets.some((p) => p.time === current)} />
      </ScrollView>

      <View style={styles.wheels}>
        <WheelPicker
          values={HOURS}
          selectedIndex={hourIndex}
          onChange={setHourIndex}
          accessibilityLabel="Hour"
        />
        <Text variant="heading" color="textMuted">
          :
        </Text>
        <WheelPicker
          values={MINUTES}
          selectedIndex={minuteIndex}
          onChange={setMinuteIndex}
          accessibilityLabel="Minute"
        />
        <WheelPicker
          values={PERIODS}
          selectedIndex={periodIndex}
          onChange={setPeriodIndex}
          width={64}
          accessibilityLabel="AM or PM"
        />
      </View>

      <Button label="Confirm" fullWidth onPress={() => onConfirm(current)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wheels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
});
