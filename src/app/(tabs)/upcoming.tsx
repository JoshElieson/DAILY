/**
 * Upcoming — all reminders across the week, filterable by status. A scheduling
 * overview (vs. Today's completion view). Loading/empty/error states + FAB.
 */
import { useRouter } from 'expo-router';
import { Bell, BellOff, PauseCircle, Repeat } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Card,
  EmptyState,
  ErrorState,
  FAB,
  LoadingState,
  Screen,
  SegmentedControl,
  Text,
} from '@/components';
import { contentTypeByKey } from '@/features/items/metadata';
import { repeatLabel } from '@/features/items/schedule';
import type { DailyItem } from '@/features/items/types';
import { useItems } from '@/features/items/useItems';
import { formatTime } from '@/lib/date';
import { useTheme } from '@/theme';

type Scope = 'all' | 'active' | 'paused';

export default function UpcomingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useItems();
  const [scope, setScope] = useState<Scope>('all');

  const items = useMemo(() => {
    const all = (data ?? []).slice().sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay));
    if (scope === 'active') return all.filter((i) => i.status === 'active');
    if (scope === 'paused') return all.filter((i) => i.status === 'paused');
    return all;
  }, [data, scope]);

  return (
    <View style={{ flex: 1 }}>
      <Screen scroll>
        <Text variant="displayL" style={{ marginTop: theme.space[4], marginBottom: theme.space[5] }}>
          Upcoming
        </Text>

        <SegmentedControl<Scope>
          options={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'paused', label: 'Paused' },
          ]}
          value={scope}
          onChange={setScope}
        />

        <View style={{ height: theme.space[5] }} />

        {isLoading ? (
          <LoadingState rows={5} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : items.length === 0 ? (
          <EmptyState
            title="Nothing on the horizon"
            body="When you add reminders, they'll line up here by time of day."
            ctaLabel="Add a reminder"
            onCta={() => router.push('/create')}
          />
        ) : (
          <View style={{ gap: theme.space[3] }}>
            {items.map((item) => (
              <ScheduleRow
                key={item.id}
                item={item}
                onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })}
              />
            ))}
          </View>
        )}
      </Screen>
      {!isLoading && (data?.length ?? 0) > 0 ? (
        <FAB onPress={() => router.push('/create')} bottom={16} />
      ) : null}
    </View>
  );
}

function ScheduleRow({ item, onPress }: { item: DailyItem; onPress: () => void }) {
  const theme = useTheme();
  const type = contentTypeByKey[item.type];
  const paused = item.status === 'paused';
  const label = item.title ?? item.intent;

  return (
    <Card onPress={onPress} accessibilityLabel={`${label}, ${formatTime(item.timeOfDay)}`}>
      <View style={[styles.row, { opacity: paused ? 0.6 : 1 }]}>
        <View style={[styles.dot, { backgroundColor: type.color }]} />
        <View style={{ flex: 1 }}>
          <Text variant="subheading" numberOfLines={1}>
            {label}
          </Text>
          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <Repeat size={14} color={theme.color.textMuted} strokeWidth={1.75} />
              <Text variant="caption" color="textMuted">
                {repeatLabel(item.frequency, item.daysOfWeek)}
              </Text>
            </View>
            <View style={styles.metaItem}>
              {item.reminderOn ? (
                <Bell size={14} color={theme.color.textMuted} strokeWidth={1.75} />
              ) : (
                <BellOff size={14} color={theme.color.textMuted} strokeWidth={1.75} />
              )}
              <Text variant="caption" color="textMuted">
                {item.reminderOn ? 'On' : 'Off'}
              </Text>
            </View>
            {paused ? (
              <View style={styles.metaItem}>
                <PauseCircle size={14} color={theme.color.warning} strokeWidth={1.75} />
                <Text variant="caption" color="textMuted">
                  Paused
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <Text variant="label" color="textSecondary" tabular>
          {formatTime(item.timeOfDay)}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 999 },
  meta: { flexDirection: 'row', gap: 14, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
