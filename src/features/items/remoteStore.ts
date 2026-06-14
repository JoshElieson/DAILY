/**
 * Backend-backed item store. Implements the same async surface as the local
 * `itemStore` (so `useItems` and the screens are unchanged) but reads/writes the
 * Daily `/v1` cloud API. Selected over the local store by `env.useMocks`
 * (see `store.ts`).
 *
 * Two seams the backend doesn't cover, handled here:
 * - **Completion**: the server has no per-day "done" marker, so completion is a
 *   local overlay (AsyncStorage) merged into content entries.
 * - **Edit mapping**: a `DailyItem` patch fans out to the right server calls —
 *   prompt fields → PATCH /prompts, status → pause/resume, time/cadence → PATCH
 *   the schedule.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { api } from '@/lib/api';
import { contentToEntry, promptToItem, toScheduleFields } from '@/lib/api/mappers';
import { isoDate } from '@/lib/date';
import type { ContentEntry, DailyItem, NewItemInput } from './types';

const COMPLETION_KEY = 'daily.api.completion';
const PRIMARY_VARIANT = 0;

// ── completion overlay ──────────────────────────────────────────────────────
type CompletionMap = Record<string, string | null>; // `${itemId}:${forDate}` -> completedAt|null
const completionId = (itemId: string, forDate: string) => `${itemId}:${forDate}`;

async function readCompletion(): Promise<CompletionMap> {
  try {
    const raw = await AsyncStorage.getItem(COMPLETION_KEY);
    return raw ? (JSON.parse(raw) as CompletionMap) : {};
  } catch {
    return {};
  }
}

async function writeCompletion(map: CompletionMap): Promise<void> {
  try {
    await AsyncStorage.setItem(COMPLETION_KEY, JSON.stringify(map));
  } catch {
    /* best-effort */
  }
}

function withCompletion(entry: ContentEntry, map: CompletionMap): ContentEntry {
  const completedAt = map[completionId(entry.itemId, entry.forDate)] ?? null;
  return { ...entry, completedAt };
}

export const remoteStore = {
  // --- items ----------------------------------------------------------------
  async listItems(): Promise<DailyItem[]> {
    const prompts = await api.listPrompts();
    return prompts.map(promptToItem).sort((a, b) => a.position - b.position);
  },

  async getItem(id: string): Promise<DailyItem | undefined> {
    try {
      const { prompt, schedules } = await api.getPrompt(id);
      const primary = schedules[0];
      return promptToItem({
        ...prompt,
        schedule: primary
          ? {
              id: primary.id,
              time_of_day: primary.time_of_day,
              frequency: primary.frequency,
              timezone: primary.timezone,
              enabled: primary.enabled,
              days_of_week: primary.days_of_week,
            }
          : null,
      });
    } catch {
      return undefined;
    }
  },

  async createItem(input: NewItemInput): Promise<DailyItem> {
    const { prompt } = await api.createPrompt({
      type: input.type,
      intent: input.intent,
      title: input.title,
      tone: input.tone,
      ...toScheduleFields(input.frequency, input.daysOfWeek),
      time_of_day: input.timeOfDay,
    });
    // Re-read once so the returned item carries its schedule (createPrompt
    // returns the prompt only); fall back to the input shape if that fails.
    const full = await this.getItem(prompt.id);
    return full ?? promptToItem(prompt);
  },

  async updateItem(id: string, patch: Partial<DailyItem>): Promise<DailyItem | undefined> {
    // 1. Prompt-level fields.
    const promptPatch: Record<string, unknown> = {};
    for (const k of ['type', 'intent', 'title', 'tone', 'position'] as const) {
      if (patch[k] !== undefined) promptPatch[k] = patch[k];
    }
    if (Object.keys(promptPatch).length) await api.updatePrompt(id, promptPatch);

    // 2. Status → pause/resume.
    if (patch.status === 'paused') await api.pausePrompt(id);
    else if (patch.status === 'active') await api.resumePrompt(id);

    // 3. Time / cadence / reminder → patch the prompt's primary schedule.
    if (patch.timeOfDay !== undefined || patch.frequency !== undefined || patch.reminderOn !== undefined) {
      const { schedules } = await api.getPrompt(id);
      const primary = schedules[0];
      if (primary) {
        const schedPatch: Record<string, unknown> = {};
        if (patch.timeOfDay !== undefined) schedPatch.time_of_day = patch.timeOfDay;
        // Cadence change → translate to backend frequency (+ day mask for custom).
        if (patch.frequency !== undefined) {
          Object.assign(schedPatch, toScheduleFields(patch.frequency, patch.daysOfWeek));
        }
        if (patch.reminderOn !== undefined) schedPatch.enabled = patch.reminderOn;
        if (Object.keys(schedPatch).length) await api.updateSchedule(primary.id, schedPatch);
      }
    }

    return this.getItem(id);
  },

  async deleteItem(id: string): Promise<void> {
    await api.deletePrompt(id);
    // Drop any local completion overlay for this item.
    const map = await readCompletion();
    let changed = false;
    for (const key of Object.keys(map)) {
      if (key.startsWith(`${id}:`)) {
        delete map[key];
        changed = true;
      }
    }
    if (changed) await writeCompletion(map);
  },

  // --- content --------------------------------------------------------------
  async listContent(): Promise<ContentEntry[]> {
    // The home payload (today's primary content across active prompts).
    const [{ entries }, map] = await Promise.all([api.today(), readCompletion()]);
    return entries.map((c) => withCompletion(contentToEntry(c), map));
  },

  async getContent(itemId: string, forDate: string): Promise<ContentEntry | undefined> {
    const [list, map] = await Promise.all([api.promptContent(itemId), readCompletion()]);
    const dto = list.find((c) => c.for_date === forDate && c.variant === PRIMARY_VARIANT);
    return dto ? withCompletion(contentToEntry(dto), map) : undefined;
  },

  async listContentForItem(itemId: string): Promise<ContentEntry[]> {
    const [list, map] = await Promise.all([api.promptContent(itemId), readCompletion()]);
    return list
      .map((c) => withCompletion(contentToEntry(c), map))
      .sort((a, b) => (a.forDate < b.forDate ? 1 : -1));
  },

  /** Server persists content during generation; nothing to write here. */
  async saveContent(): Promise<void> {
    /* no-op: generation persists server-side */
  },

  // --- completion (local overlay) -------------------------------------------
  async setCompletion(itemId: string, forDate: string, completed: boolean): Promise<void> {
    const map = await readCompletion();
    map[completionId(itemId, forDate)] = completed ? new Date().toISOString() : null;
    await writeCompletion(map);
  },

  /**
   * Distinct dates the user completed something — derived from the local
   * completion overlay (the server has no per-day completion marker, so streaks
   * are device-local; see header). Sorted ascending.
   */
  async listCompletionDates(): Promise<string[]> {
    const map = await readCompletion();
    const dates = new Set<string>();
    for (const [key, value] of Object.entries(map)) {
      if (value) dates.add(key.split(':')[1]);
    }
    return Array.from(dates).sort();
  },

  async reset(): Promise<void> {
    await AsyncStorage.removeItem(COMPLETION_KEY);
  },
};

export type RemoteStore = typeof remoteStore;
export { isoDate };
