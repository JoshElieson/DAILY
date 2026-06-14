/**
 * Weekly Recap — a calm snapshot of this week's practice (Mon–Sun), reached from
 * "Your Profile". Shows the 7-day dot row, days practiced this week, and the
 * streak stats. Everything is derived from device-local completion history
 * (recap.ts / streaks.ts); nothing leaves the device.
 */
import { useRouter } from 'expo-router';
import { CalendarRange, ChevronLeft, Flame, Trophy } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Card,
  IconButton,
  ListGroup,
  ListRow,
  Screen,
  SectionHeader,
  Text,
} from '@/components';
import { useStreakStats, useWeeklyRecap } from '@/features/items/useItems';
import { useTheme } from '@/theme';

export default function Recap() {
  const theme = useTheme();
  const router = useRouter();
  const { data: recap } = useWeeklyRecap();
  const stats = useStreakStats();

  const days = recap?.days ?? [];
  const practiced = recap?.daysPracticed ?? 0;
  const elapsed = recap?.daysElapsed ?? 0;
  const currentStreak = stats.data?.currentStreak ?? 0;
  const longestStreak = stats.data?.longestStreak ?? 0;
  const totalDays = stats.data?.totalDays ?? 0;

  const summary =
    practiced === 0
      ? 'A fresh week to begin.'
      : practiced >= elapsed && elapsed > 0
        ? 'Every day so far — beautiful.'
        : `${practiced} ${practiced === 1 ? 'day' : 'days'} of practice this week.`;

  return (
    <Screen scroll>
      <View style={styles.header}>
        <IconButton icon={ChevronLeft} onPress={() => router.back()} accessibilityLabel="Back" />
        <View style={{ width: 44 }} />
      </View>

      <Text variant="displayL" style={{ marginTop: theme.space[2] }}>
        Weekly Recap
      </Text>
      <Text variant="body" color="textSecondary" style={{ marginTop: theme.space[1] }}>
        {summary}
      </Text>

      {/* This week's 7-day dot row */}
      <Card style={{ marginTop: theme.space[5], paddingVertical: theme.space[5] }}>
        <View style={styles.weekRow}>
          {days.map((d) => {
            const filled = d.done;
            return (
              <View key={d.date} style={styles.dayCol}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: filled ? theme.color.accent : theme.color.surfaceSunken,
                      borderWidth: d.isToday ? 2 : 0,
                      borderColor: theme.color.accent,
                      opacity: d.isFuture ? 0.4 : 1,
                    },
                  ]}
                >
                  {filled ? (
                    <View style={[styles.innerDot, { backgroundColor: theme.color.textOnAccent }]} />
                  ) : null}
                </View>
                <Text
                  variant="caption"
                  color={d.isToday ? 'accent' : 'textSecondary'}
                  style={{ marginTop: theme.space[2] }}
                >
                  {d.label}
                </Text>
              </View>
            );
          })}
        </View>
        <View style={[styles.divider, { backgroundColor: theme.color.border }]} />
        <View style={styles.tallyRow}>
          <Text variant="body" color="textSecondary">
            Days practiced
          </Text>
          <Text variant="subheading" color="accent" tabular>
            {practiced} / 7
          </Text>
        </View>
      </Card>

      {/* Streak stats */}
      <View style={styles.group}>
        <SectionHeader title="Your streak" />
        <ListGroup>
          <ListRow label="Current streak" icon={Flame} value={currentStreak > 0 ? `${currentStreak}` : '—'} />
          <ListRow label="Longest streak" icon={Trophy} value={longestStreak > 0 ? `${longestStreak}` : '—'} />
          <ListRow label="Total days" icon={CalendarRange} value={`${totalDays}`} />
        </ListGroup>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  dayCol: { alignItems: 'center', flex: 1 },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerDot: { width: 10, height: 10, borderRadius: 999 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 20 },
  tallyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  group: { marginTop: 24 },
});
