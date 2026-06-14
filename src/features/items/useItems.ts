/**
 * React Query hooks over the local item store. TanStack Query manages async
 * state (loading/error/refetch) per master-spec §9.5; mutations invalidate the
 * relevant queries so screens stay in sync. Completion is read from
 * `content_entry.completed_at` (D3).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { generateContent } from '@/features/generation/claudeClient';
import { maybeRequestReview } from '@/features/feedback/review';
import { cancelItem, scheduleItem } from '@/features/notifications/scheduler';
import { isoDate, timeOfDayOf, type TimeOfDay } from '@/lib/date';
// `store` resolves to the local mock store or the backend-backed remote store
// (see store.ts), so the hooks below are identical in both modes.
import { computeWeeklyRecap, type WeeklyRecap } from './recap';
import { store as itemStore } from './store';
import { computeStats, type Stats } from './streaks';
import type { DailyItem, NewItemInput } from './types';

export const itemKeys = {
  all: ['items'] as const,
  list: () => [...itemKeys.all, 'list'] as const,
  detail: (id: string) => [...itemKeys.all, 'detail', id] as const,
  content: (id: string) => [...itemKeys.all, 'content', id] as const,
  today: () => [...itemKeys.all, 'today'] as const,
  stats: () => [...itemKeys.all, 'stats'] as const,
  recap: () => [...itemKeys.all, 'recap'] as const,
};

export function useItems() {
  return useQuery({
    queryKey: itemKeys.list(),
    queryFn: () => itemStore.listItems(),
  });
}

export function useItem(id: string) {
  return useQuery({
    queryKey: itemKeys.detail(id),
    queryFn: async () => (await itemStore.getItem(id)) ?? null,
    enabled: !!id,
  });
}

export function useItemHistory(id: string) {
  return useQuery({
    queryKey: itemKeys.content(id),
    queryFn: () => itemStore.listContentForItem(id),
    enabled: !!id,
  });
}

export type TodayEntry = {
  item: DailyItem;
  contentTitle?: string;
  contentBody?: string;
  completed: boolean;
  timeOfDay: TimeOfDay;
};

export type TodayData = {
  date: string;
  entries: TodayEntry[];
  done: number;
  total: number;
};

/** Joins active Dailies with today's content + completion, ready for Home. */
export function useToday() {
  return useQuery({
    queryKey: itemKeys.today(),
    queryFn: async (): Promise<TodayData> => {
      const date = isoDate();
      const [items, content] = await Promise.all([
        itemStore.listItems(),
        itemStore.listContent(),
      ]);
      const active = items.filter((i) => i.status === 'active');
      const entries: TodayEntry[] = active
        .map((item) => {
          const c = content.find(
            (x) => x.itemId === item.id && x.forDate === date && x.variant === 0,
          );
          return {
            item,
            contentTitle: c?.title,
            contentBody: c && c.body.length > 0 ? c.body : undefined,
            completed: !!c?.completedAt,
            timeOfDay: timeOfDayOf(item.timeOfDay),
          };
        })
        .sort((a, b) => a.item.timeOfDay.localeCompare(b.item.timeOfDay));

      return {
        date,
        entries,
        done: entries.filter((e) => e.completed).length,
        total: entries.length,
      };
    },
  });
}

/** Consecutive-day streak + practice stats from completion history (D3). */
export function useStreakStats() {
  return useQuery({
    queryKey: itemKeys.stats(),
    queryFn: async (): Promise<Stats> => computeStats(await itemStore.listCompletionDates()),
  });
}

/** This week's (Mon–Sun) practice recap from completion history. */
export function useWeeklyRecap() {
  return useQuery({
    queryKey: itemKeys.recap(),
    queryFn: async (): Promise<WeeklyRecap> =>
      computeWeeklyRecap(await itemStore.listCompletionDates()),
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: itemKeys.all });
}

export function useCreateItem() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: NewItemInput) => {
      const item = await itemStore.createItem(input);
      // Pre-generate today's content so the Daily is never empty (master-spec
      // §6.6 buffer; the full 7-day buffer fill belongs to the notifications
      // layer in Phase 3).
      try {
        const entry = await generateContent({
          itemId: item.id,
          type: item.type,
          intent: item.intent,
          date: isoDate(),
        });
        await itemStore.saveContent(entry);
      } catch {
        // Non-fatal at creation; the detail screen can retry.
      }
      // Schedule its reminder (no-op if reminders/permission are off).
      try {
        await scheduleItem(item);
      } catch {
        /* scheduling is best-effort */
      }
      return item;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateItem() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<DailyItem> }) => {
      const updated = await itemStore.updateItem(id, patch);
      // Reconcile the schedule on time/cadence/reminder/pause changes.
      if (updated) {
        try {
          await scheduleItem(updated);
        } catch {
          /* best-effort */
        }
      }
      return updated;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteItem() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      await itemStore.deleteItem(id);
      try {
        await cancelItem(id);
      } catch {
        /* best-effort */
      }
    },
    onSuccess: invalidate,
  });
}

export function useToggleCompletion() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({
      itemId,
      completed,
      forDate = isoDate(),
    }: {
      itemId: string;
      completed: boolean;
      forDate?: string;
    }) => {
      await itemStore.setCompletion(itemId, forDate, completed);
      // After a positive moment (a short streak / a few completions) gently ask
      // for a review — once, ever (roadmap T-409).
      if (completed) {
        try {
          const { currentStreak, totalDays } = computeStats(
            await itemStore.listCompletionDates(),
          );
          if (currentStreak >= 3 || totalDays >= 5) await maybeRequestReview();
        } catch {
          /* best-effort */
        }
      }
    },
    onSuccess: invalidate,
  });
}
