/**
 * Local-first item store. master-spec §4.1 specifies on-device SQLite; for the
 * Phase-1 clickable build we use an AsyncStorage-backed repository behind a
 * small async interface. The contract is fully async, so a versioned
 * expo-sqlite implementation can replace it later without touching the
 * hooks/UI. (See docs/ARCHITECTURE.md §3.)
 *
 * The store starts EMPTY — there are no default/seeded Dailies. Every Daily the
 * user sees is one they created (onboarding's first intention, or the create
 * sheet); creations are persisted here on this device.
 *
 * Completion is modelled per D3 as `completed_at` on the primary content_entry —
 * not a separate table.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { createId } from '@/lib/id';
import type { ContentEntry, DailyItem, NewItemInput } from './types';

const KEYS = {
  items: 'daily.items',
  content: 'daily.content',
};

const PRIMARY_VARIANT = 0;

async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function write<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const itemStore = {
  async listItems(): Promise<DailyItem[]> {
    const items = await read<DailyItem[]>(KEYS.items, []);
    return items.slice().sort((a, b) => a.position - b.position);
  },

  async getItem(id: string): Promise<DailyItem | undefined> {
    const items = await this.listItems();
    return items.find((i) => i.id === id);
  },

  async createItem(input: NewItemInput): Promise<DailyItem> {
    const items = await this.listItems();
    const now = new Date().toISOString();
    const item: DailyItem = {
      ...input,
      id: createId('item'),
      status: input.status ?? 'active',
      position: input.position ?? items.length,
      createdAt: now,
      updatedAt: now,
    };
    await write(KEYS.items, [item, ...items]);
    return item;
  },

  async updateItem(
    id: string,
    patch: Partial<DailyItem>,
  ): Promise<DailyItem | undefined> {
    const items = await this.listItems();
    let updated: DailyItem | undefined;
    const next = items.map((i) => {
      if (i.id !== id) return i;
      updated = { ...i, ...patch, id: i.id, updatedAt: new Date().toISOString() };
      return updated;
    });
    await write(KEYS.items, next);
    return updated;
  },

  async deleteItem(id: string): Promise<void> {
    const items = await this.listItems();
    await write(
      KEYS.items,
      items.filter((i) => i.id !== id),
    );
    // ON DELETE CASCADE (master-spec §4.1).
    const content = await read<ContentEntry[]>(KEYS.content, []);
    await write(
      KEYS.content,
      content.filter((c) => c.itemId !== id),
    );
  },

  // --- content -------------------------------------------------------------
  async listContent(): Promise<ContentEntry[]> {
    return read<ContentEntry[]>(KEYS.content, []);
  },

  async getContent(
    itemId: string,
    forDate: string,
  ): Promise<ContentEntry | undefined> {
    const content = await this.listContent();
    return content.find(
      (c) => c.itemId === itemId && c.forDate === forDate && c.variant === PRIMARY_VARIANT,
    );
  },

  async listContentForItem(itemId: string): Promise<ContentEntry[]> {
    const content = await this.listContent();
    return content
      .filter((c) => c.itemId === itemId)
      .sort((a, b) => (a.forDate < b.forDate ? 1 : -1));
  },

  /** Upsert the primary content entry for (item, date), preserving completion. */
  async saveContent(entry: ContentEntry): Promise<void> {
    const content = await this.listContent();
    const existing = content.find(
      (c) =>
        c.itemId === entry.itemId &&
        c.forDate === entry.forDate &&
        c.variant === entry.variant,
    );
    const without = content.filter(
      (c) =>
        !(
          c.itemId === entry.itemId &&
          c.forDate === entry.forDate &&
          c.variant === entry.variant
        ),
    );
    await write(KEYS.content, [
      { ...entry, completedAt: existing?.completedAt ?? entry.completedAt ?? null },
      ...without,
    ]);
  },

  // --- completion (D3: completed_at on the primary content entry) -----------
  async setCompletion(
    itemId: string,
    forDate: string,
    completed: boolean,
  ): Promise<void> {
    const content = await this.listContent();
    const idx = content.findIndex(
      (c) => c.itemId === itemId && c.forDate === forDate && c.variant === PRIMARY_VARIANT,
    );
    const completedAt = completed ? new Date().toISOString() : null;

    if (idx >= 0) {
      content[idx] = { ...content[idx], completedAt };
      await write(KEYS.content, content);
      return;
    }

    // No content yet for this day — record completion on a minimal placeholder
    // entry so the engagement marker isn't lost (real content overwrites it via
    // saveContent, which preserves completedAt).
    const placeholder: ContentEntry = {
      id: createId('content'),
      itemId,
      forDate,
      variant: PRIMARY_VARIANT,
      body: '',
      genStatus: 'ready',
      completedAt,
      createdAt: new Date().toISOString(),
    };
    await write(KEYS.content, [placeholder, ...content]);
  },

  /**
   * Distinct local dates ('YYYY-MM-DD') on which the user completed at least one
   * Daily. Feeds streak/stat computation (master-spec D3). Sorted ascending.
   */
  async listCompletionDates(): Promise<string[]> {
    const content = await this.listContent();
    const dates = new Set<string>();
    for (const c of content) if (c.completedAt) dates.add(c.forDate);
    return Array.from(dates).sort();
  },

  /** Test/util — wipe everything (used by "reset" in dev). */
  async reset(): Promise<void> {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  },
};
