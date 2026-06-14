import { useRouter } from 'expo-router';
import { Flame } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Card,
  ErrorState,
  HistoryInsightsCard,
  LoadingState,
  ProgressRing,
  ReflectiveCard,
  Screen,
  Text,
} from '@/components';
import { useStreakStats, useToday } from '@/features/items/useItems';
import { reflectionPromptForDate } from '@/features/reflect/prompts';
import { ReflectionNoteCard } from '@/features/reflect/ReflectionNoteCard';
import { useReflectionNote } from '@/features/reflect/useReflectionNote';
import { useSettings } from '@/features/settings/SettingsProvider';
import { useTheme } from '@/theme';

export default function ReflectScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { settings } = useSettings();

  const { data, isLoading, isError, refetch } = useToday();
  const stats = useStreakStats();
  const { note, loaded, committed, commit } = useReflectionNote();

  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (loaded) setDraft(note);
  }, [loaded, note]);

  const streak = stats.data?.currentStreak ?? 0;
  const best = stats.data?.longestStreak ?? 0;

  return (
    <Screen scroll>
      <Text variant="displayL" style={{ marginTop: theme.space[4], marginBottom: theme.space[5] }}>
        Reflect
      </Text>

      {isLoading ? (
        <LoadingState rows={3} />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <>
          <ReflectiveCard
            eyebrow="This evening"
            body={reflectionPromptForDate()}
            evening
          />

          <View style={styles.statsRow}>
            {settings.showStreaks ? (
              <Card style={styles.statCard}>
                <View style={styles.streakRow}>
                  <Flame size={20} color={theme.color.accent} strokeWidth={1.75} />
                  <Text variant="numeral" color="text" tabular style={{ fontSize: 36, lineHeight: 40 }}>
                    {streak}
                  </Text>
                </View>
                <Text variant="caption" color="textSecondary">
                  day streak
                </Text>
                {best > 0 ? (
                  <Text variant="caption" color="textMuted" style={{ marginTop: theme.space[1] }}>
                    best {best}
                  </Text>
                ) : null}
              </Card>
            ) : null}

            <Card style={styles.statCard}>
              <ProgressRing done={data?.done ?? 0} total={data?.total ?? 0} size={56} />
              <Text variant="caption" color="textSecondary" style={{ marginTop: theme.space[2] }}>
                done today
              </Text>
            </Card>
          </View>

          <ReflectionNoteCard
            value={draft}
            onChangeText={setDraft}
            loaded={loaded}
            committed={committed}
            onSave={() => commit(draft)}
          />

          <HistoryInsightsCard
            active={settings.premiumActive}
            onPress={() =>
              router.push(settings.premiumActive ? '/reflections' : '/premium')
            }
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 20 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
