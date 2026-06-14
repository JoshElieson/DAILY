/**
 * History & Insights (premium) — every reflection the user has saved, all time.
 * Each entry pairs the day's prompt with the answer they wrote, newest first,
 * plus a small insights summary. Premium-gated: reaching this without an active
 * entitlement redirects to the upsell (the Reflect-tab entry point already gates,
 * this is a defensive guard for deep links). Data is device-local (master-spec §2.7).
 */
import { Redirect, useRouter } from 'expo-router';
import { ChevronLeft, Gem, NotebookPen } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Card,
  EmptyState,
  IconButton,
  LoadingState,
  Screen,
  Text,
} from '@/components';
import { useAllReflections } from '@/features/reflect/useAllReflections';
import { useSettings } from '@/features/settings/SettingsProvider';
import { formatLongDate } from '@/lib/date';
import { useTheme } from '@/theme';

/** 'YYYY-MM-DD' → "Tuesday, June 13". */
function formatEntryDate(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return Number.isNaN(d.getTime()) ? date : formatLongDate(d);
}

export default function Reflections() {
  const theme = useTheme();
  const router = useRouter();
  const { settings } = useSettings();
  const { entries, loaded } = useAllReflections();

  // Defensive gate — the feature is Premium-only.
  if (!settings.premiumActive) {
    return <Redirect href="/premium" />;
  }

  const count = entries.length;
  const since = count > 0 ? entries[count - 1].date : null;

  return (
    <Screen scroll>
      <View style={styles.header}>
        <IconButton icon={ChevronLeft} onPress={() => router.back()} accessibilityLabel="Back" />
        <View style={{ width: 44 }} />
      </View>

      <Text variant="displayL" style={{ marginTop: theme.space[2], marginBottom: theme.space[2] }}>
        History &amp; Insights
      </Text>
      <Text variant="body" color="textSecondary" style={{ marginBottom: theme.space[5] }}>
        Every reflection you’ve saved, in one quiet place.
      </Text>

      {!loaded ? (
        <LoadingState rows={4} />
      ) : count === 0 ? (
        <EmptyState
          title="No reflections yet"
          body="Your saved reflections will gather here. Write tonight’s on the Reflect tab to begin."
          ctaLabel="Back to Reflect"
          onCta={() => router.back()}
        />
      ) : (
        <>
          {/* Insights summary */}
          <View
            style={[
              styles.summary,
              { backgroundColor: theme.color.accentTint, borderRadius: theme.radius.lg, borderColor: theme.color.border },
            ]}
          >
            <View style={styles.summaryItem}>
              <View style={styles.summaryHead}>
                <Gem size={18} color={theme.color.accent} strokeWidth={1.75} />
                <Text variant="numeral" color="text" tabular style={{ fontSize: 28, lineHeight: 32 }}>
                  {count}
                </Text>
              </View>
              <Text variant="caption" color="textSecondary">
                {count === 1 ? 'reflection saved' : 'reflections saved'}
              </Text>
            </View>
            {since ? (
              <View style={styles.summaryItem}>
                <View style={styles.summaryHead}>
                  <NotebookPen size={18} color={theme.color.accent} strokeWidth={1.75} />
                </View>
                <Text variant="caption" color="textSecondary">
                  since {formatEntryDate(since)}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={{ gap: theme.space[3], marginTop: theme.space[5] }}>
            {entries.map((entry) => (
              <Card key={entry.date}>
                <Text variant="overline" color="accent">
                  {formatEntryDate(entry.date)}
                </Text>
                <Text
                  variant="label"
                  color="textSecondary"
                  style={{ marginTop: theme.space[2] }}
                >
                  {entry.prompt}
                </Text>
                <Text variant="body" color="text" style={{ marginTop: theme.space[2] }}>
                  {entry.answer}
                </Text>
              </Card>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44 },
  summary: {
    flexDirection: 'row',
    gap: 24,
    padding: 16,
    borderWidth: 1,
  },
  summaryItem: { gap: 4 },
  summaryHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
