/**
 * Daily content / item detail (screens §B → item, PLANNING.md §2 viewing).
 * Shows today's generated content with loading/empty/error states, completion,
 * pause/resume, edit, and history. Content is written automatically on open;
 * there is no manual regenerate. Reached from a card tap or a notification deep
 * link (daily://item/:id).
 */
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import {
  ChevronLeft,
  Feather,
  Pencil,
  Pause,
  Play,
} from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  CompletionCheck,
  ContentCard,
  ErrorState,
  IconButton,
  Screen,
  SectionHeader,
  Skeleton,
  Text,
  useToast,
} from '@/components';
import { generateContent } from '@/features/generation/claudeClient';
import { contentTypeByKey } from '@/features/items/metadata';
import { itemStore } from '@/features/items/itemStore';
import {
  itemKeys,
  useItem,
  useItemHistory,
  useToggleCompletion,
  useUpdateItem,
} from '@/features/items/useItems';
import { formatTime, isoDate } from '@/lib/date';
import { useTheme } from '@/theme';

export default function ItemDetail() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const itemId = id ?? '';
  const today = isoDate();

  const { data: item, isLoading: itemLoading, isError: itemError, refetch } = useItem(itemId);
  const { data: history, isLoading: historyLoading } = useItemHistory(itemId);
  const update = useUpdateItem();
  const toggle = useToggleCompletion();

  const todayContent = (history ?? []).find(
    (c) => c.forDate === today && c.variant === 0 && c.body.length > 0,
  );
  const past = (history ?? []).filter((c) => c.forDate !== today && c.body.length > 0);

  // Completion state for today (D3: completed_at on the primary content entry).
  const completedToday = (history ?? []).some(
    (c) => c.forDate === today && c.variant === 0 && !!c.completedAt,
  );

  const generate = useMutation({
    mutationFn: async () => {
      if (!item) return;
      const entry = await generateContent({
        itemId: item.id,
        type: item.type,
        intent: item.intent,
        date: today,
      });
      await itemStore.saveContent(entry);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: itemKeys.all }),
  });

  // Lazy-on-tap fallback (roadmap T-208/§7): opened from a notification on a new
  // day with no content yet → generate today's once, so ready content is always
  // there when the reminder is tapped. Only for active Dailies; never retries on
  // failure (the manual Generate/retry button covers that).
  const autoGenedRef = useRef(false);
  useEffect(() => {
    if (autoGenedRef.current) return;
    if (!item || item.status !== 'active' || historyLoading || todayContent) return;
    if (generate.isPending || generate.isError || generate.isSuccess) return;
    autoGenedRef.current = true;
    generate.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, historyLoading, todayContent]);

  if (itemLoading) {
    return (
      <Screen scroll>
        <DetailHeader onBack={() => router.back()} />
        <Skeleton width="70%" height={28} style={{ marginTop: 16 }} />
        <Skeleton width="40%" height={14} style={{ marginTop: 12 }} />
        <Skeleton height={140} radius={theme.radius.lg} style={{ marginTop: 24 }} />
      </Screen>
    );
  }

  if (itemError || !item) {
    return (
      <Screen scroll>
        <DetailHeader onBack={() => router.back()} />
        <ErrorState
          title="Reminder not found"
          body="This reminder may have been deleted."
          retryLabel="Go back"
          onRetry={() => router.back()}
        />
      </Screen>
    );
  }

  const typeMeta = contentTypeByKey[item.type];
  const paused = item.status === 'paused';
  const title = item.title ?? item.intent;

  return (
    <Screen scroll>
      <DetailHeader
        onBack={() => router.back()}
        onEdit={() => router.push({ pathname: '/create', params: { id: item.id } })}
      />

      {/* Title block */}
      <View style={styles.titleRow}>
        <CompletionCheck
          checked={!!completedToday}
          onToggle={(next) => {
            toggle.mutate({ itemId: item.id, completed: next });
            toast.show({ message: next ? 'Marked done' : 'Marked not done' });
          }}
          accessibilityLabel={`${title}, ${completedToday ? 'done' : 'not done'}`}
        />
        <View style={{ flex: 1 }}>
          <Text variant="heading">{title}</Text>
          <View style={styles.metaRow}>
            <View style={[styles.dot, { backgroundColor: typeMeta.color }]} />
            <Text variant="caption" color="textSecondary">
              {typeMeta.label} · {formatTime(item.timeOfDay)}
            </Text>
          </View>
        </View>
      </View>

      {item.title && item.intent !== item.title ? (
        <Text variant="caption" color="textMuted" style={{ marginTop: theme.space[3] }}>
          Your intent: “{item.intent}”
        </Text>
      ) : null}

      {/* Today's content */}
      <View style={{ marginTop: theme.space[6] }}>
        <SectionHeader title="Today" />
        {generate.isPending ? (
          <Card style={{ padding: theme.space[5], gap: theme.space[3] }}>
            <Skeleton width="50%" height={22} />
            <Skeleton width="100%" height={16} />
            <Skeleton width="85%" height={16} />
          </Card>
        ) : generate.isError ? (
          <ErrorState
            title="Couldn't generate"
            body="Generation hit a snag. It's not you — try again."
            onRetry={() => generate.mutate()}
          />
        ) : todayContent ? (
          <ContentCard entry={todayContent} showDate={false} />
        ) : (
          <Card style={{ alignItems: 'center', paddingVertical: theme.space[7] }}>
            <Feather size={28} color={theme.color.accent} strokeWidth={1.75} />
            <Text variant="subheading" align="center" style={{ marginTop: theme.space[3] }}>
              No content yet for today
            </Text>
            <Text variant="body" color="textSecondary" align="center" style={{ marginTop: theme.space[1] }}>
              Generate today's {typeMeta.label.toLowerCase()}.
            </Text>
            <Button
              label="Generate"
              size="medium"
              onPress={() => generate.mutate()}
              style={{ marginTop: theme.space[4] }}
            />
          </Card>
        )}
      </View>

      {/* Actions */}
      <View style={{ marginTop: theme.space[7], gap: theme.space[3] }}>
        <Button
          label={paused ? 'Resume reminder' : 'Pause reminder'}
          variant="secondary"
          icon={paused ? Play : Pause}
          fullWidth
          onPress={() => {
            update.mutate({ id: item.id, patch: { status: paused ? 'active' : 'paused' } });
            toast.show({ message: paused ? 'Reminder resumed' : 'Reminder paused', tone: 'info' });
          }}
        />
        <Button
          label="Edit reminder"
          variant="ghost"
          icon={Pencil}
          fullWidth
          onPress={() => router.push({ pathname: '/create', params: { id: item.id } })}
        />
      </View>

      {/* History */}
      {past.length > 0 ? (
        <View style={{ marginTop: theme.space[8] }}>
          <SectionHeader title="History" />
          <View style={{ gap: theme.space[3] }}>
            {past.map((entry) => (
              <ContentCard key={entry.id} entry={entry} />
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

function DetailHeader({
  onBack,
  onEdit,
}: {
  onBack: () => void;
  onEdit?: () => void;
}) {
  return (
    <View style={styles.header}>
      <IconButton icon={ChevronLeft} onPress={onBack} accessibilityLabel="Back" />
      {onEdit ? (
        <IconButton icon={Pencil} onPress={onEdit} accessibilityLabel="Edit reminder" />
      ) : (
        <View style={{ width: 44 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 999 },
});
