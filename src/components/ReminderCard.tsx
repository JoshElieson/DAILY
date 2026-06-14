/**
 * Reminder card — the core content object on Home (components §4). Leading
 * completion checkbox, title, a teaser of today's generated content, meta row
 * (time · repeat · bell). The leading accent comes from the Daily's
 * `content_type` (master-spec D4). Completed items dim to 60% with a sage accent.
 */
import { Bell, BellOff, Repeat } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { contentTypeByKey } from '@/features/items/metadata';
import { repeatLabel } from '@/features/items/schedule';
import type { DailyItem } from '@/features/items/types';
import { formatTime } from '@/lib/date';
import { useTheme } from '@/theme';
import { Card } from './Card';
import { CompletionCheck } from './CompletionCheck';
import { Text } from './Text';

export type ReminderCardProps = {
  item: DailyItem;
  completed: boolean;
  /** A teaser of today's generated content (AI content is the core — D1). */
  subtitle?: string;
  onToggleComplete: (next: boolean) => void;
  onPress: () => void;
};

export function ReminderCard({
  item,
  completed,
  subtitle,
  onToggleComplete,
  onPress,
}: ReminderCardProps) {
  const theme = useTheme();
  const type = contentTypeByKey[item.type];
  const label = item.title ?? item.intent;

  return (
    <Card onPress={onPress} accessibilityLabel={`${label}, ${formatTime(item.timeOfDay)}`}>
      <View style={[styles.row, { opacity: completed ? 0.6 : 1 }]}>
        <View
          style={[
            styles.accentBar,
            { backgroundColor: completed ? theme.color.success : type.color },
          ]}
        />
        <CompletionCheck
          checked={completed}
          onToggle={onToggleComplete}
          accessibilityLabel={`${label}, ${
            completed ? 'done' : 'not done'
          } — double tap to ${completed ? 'undo' : 'complete'}`}
        />
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text
              variant="subheading"
              color={completed ? 'textMuted' : 'text'}
              numberOfLines={1}
              style={[styles.title, completed && styles.struck]}
            >
              {label}
            </Text>
            <Text variant="label" color="textSecondary" tabular>
              {formatTime(item.timeOfDay)}
            </Text>
          </View>
          {subtitle ? (
            <Text variant="body" color="textSecondary" numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
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
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  accentBar: {
    position: 'absolute',
    left: -16,
    top: -4,
    bottom: -4,
    width: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  body: { flex: 1, gap: 4 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: { flex: 1 },
  struck: { textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', gap: 16, marginTop: 2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
