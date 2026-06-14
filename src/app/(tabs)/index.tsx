/**
 * Home — "Today" (screens §B). Large serif greeting, one featured intention,
 * day progress, then today's reminders grouped by time of day. Handles loading
 * (skeletons), empty (calm open day), and error states. FAB opens creation.
 * Evening variant shifts the reflective wash toward dusk.
 */
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UserCircle } from 'lucide-react-native';

import {
  EmptyState,
  ErrorState,
  FAB,
  LoadingState,
  ProgressRing,
  ReflectiveCard,
  ReminderCard,
  Screen,
  SectionHeader,
  Text,
  useToast,
} from '@/components';
import { reflectionPromptForDate } from '@/features/reflect/prompts';
import { useToday, useToggleCompletion, type TodayEntry } from '@/features/items/useItems';
import {
  formatLongDate,
  greeting,
  timeOfDayLabel,
  type TimeOfDay,
} from '@/lib/date';
import { useTheme } from '@/theme';
import { useSettings } from '@/features/settings/SettingsProvider';

const ORDER: TimeOfDay[] = ['morning', 'afternoon', 'evening'];

export default function TodayScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const { data, isLoading, isError, refetch, isRefetching } = useToday();
  const toggle = useToggleCompletion();

  const onToggle = useCallback(
    (entry: TodayEntry, next: boolean) => {
      toggle.mutate({ itemId: entry.item.id, completed: next });
      toast.show({
        message: next ? 'Marked done' : 'Marked not done',
        actionLabel: 'Undo',
        onAction: () => toggle.mutate({ itemId: entry.item.id, completed: !next }),
      });
    },
    [toggle, toast],
  );

  const { settings } = useSettings();
  const isEvening = new Date().getHours() >= 18;

  const grouped = (data?.entries ?? []).reduce<Record<TimeOfDay, TodayEntry[]>>(
    (acc, e) => {
      acc[e.timeOfDay].push(e);
      return acc;
    },
    { morning: [], afternoon: [], evening: [] },
  );

  const header = (
    <View style={{ marginBottom: theme.space[6] }}>
      <View style={styles.appBar}>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => router.push('/profile')}
          accessibilityRole="button"
          accessibilityLabel="Your practice"
          hitSlop={8}
          style={styles.avatarBtn}
        >
          <UserCircle size={28} color={theme.color.textSecondary} />
        </Pressable>
      </View>
      <Text variant="overline" color="textSecondary">
        {formatLongDate()}
      </Text>
      <Text variant="displayL" style={{ marginTop: theme.space[1] }}>
        {greeting()}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Screen
        scroll
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.color.accent}
          />
        }
      >
        {header}

        {isLoading ? (
          <LoadingState rows={4} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : data && data.total === 0 ? (
          <EmptyState
            title="A calm, open day"
            body="Nothing scheduled yet. Add your first intention whenever you're ready."
            ctaLabel="Add a reminder"
            onCta={() => router.push('/create')}
          />
        ) : (
          <>
            {settings.reflectionPrompt && (
              <ReflectiveCard
                eyebrow="A moment to reflect"
                body={reflectionPromptForDate()}
                meta={
                  isEvening
                    ? 'How did today feel? Tap to reflect'
                    : 'Tap to open Reflect'
                }
                evening={isEvening}
                onPress={() => router.push('/(tabs)/reflect')}
              />
            )}

            <View style={[styles.progressRow, !settings.reflectionPrompt && { marginTop: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text variant="overline" color="textSecondary">
                  Today’s progress
                </Text>
                <Text variant="label" color="text" style={{ marginTop: 2 }}>
                  {(data?.done ?? 0) >= (data?.total ?? 0) && (data?.total ?? 0) > 0
                    ? 'All done — beautifully paced'
                    : `${data?.done ?? 0} of ${data?.total ?? 0} complete`}
                </Text>
              </View>
              <ProgressRing done={data?.done ?? 0} total={data?.total ?? 0} size={52} />
            </View>

            {ORDER.map((tod) =>
              grouped[tod].length > 0 ? (
                <View key={tod} style={{ marginTop: theme.space[6] }}>
                  <SectionHeader title={timeOfDayLabel[tod]} />
                  <View style={{ gap: theme.space[3] }}>
                    {grouped[tod].map((entry) => (
                      <ReminderCard
                        key={entry.item.id}
                        item={entry.item}
                        completed={entry.completed}
                        subtitle={entry.contentBody}
                        onToggleComplete={(next) => onToggle(entry, next)}
                        onPress={() =>
                          router.push({ pathname: '/item/[id]', params: { id: entry.item.id } })
                        }
                      />
                    ))}
                  </View>
                </View>
              ) : null,
            )}
          </>
        )}
      </Screen>

      {!isLoading && data && data.total > 0 ? (
        <FAB onPress={() => router.push('/create')} bottom={16} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    marginBottom: 8,
  },
  avatarBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
  },
});
