/**
 * Translate backend DTOs ↔ the app's domain types. Kept in one place so the
 * remote store and generation client share exactly one mapping.
 *
 * Notes on the seams between the two models:
 * - The app models cadence as `daily | weekdays | custom` (+ a day-set); the
 *   backend's richer enum collapses here — `custom_days`/`weekly` → `custom`,
 *   `weekends`/`multiple_daily` → their nearest app cadence.
 * - Custom days cross the wire as the backend's 7-bit `days_of_week` mask, whose
 *   bit order is Mon(bit0)…Sat(bit5),Sun(bit6) (backend/src/lib/time.mjs
 *   `dayEnabled`). `maskToDays`/`daysToMask` convert to/from the app's day
 *   numbers (0=Sun…6=Sat).
 * - The backend has no per-day "completion" concept — `completedAt` is a
 *   client-only engagement marker overlaid by the remote store.
 */
import { daysForFrequency } from '@/features/items/schedule';
import type {
  ContentEntry,
  DailyItem,
  Frequency,
  GenStatus,
} from '@/features/items/types';
import type { CreatePromptBody, ContentEntryDTO, PromptDTO, ScheduleDTO } from './types';

type BackendFrequency = ScheduleDTO['frequency'];

function toFrequency(f?: string): Frequency {
  if (f === 'weekdays') return 'weekdays';
  if (f === 'custom_days' || f === 'weekly') return 'custom';
  return 'daily'; // daily | weekends | multiple_daily | unknown
}

/** Backend day mask (Mon=bit0…Sun=bit6) → app day numbers (0=Sun…6=Sat). */
export function maskToDays(mask: number): number[] {
  const days: number[] = [];
  for (let bit = 0; bit < 7; bit++) {
    if (mask & (1 << bit)) days.push(bit === 6 ? 0 : bit + 1);
  }
  return days.sort((a, b) => a - b);
}

/** App day numbers (0=Sun…6=Sat) → backend day mask (Mon=bit0…Sun=bit6). */
export function daysToMask(days: number[]): number {
  return days.reduce((mask, d) => mask | (1 << (d === 0 ? 6 : d - 1)), 0);
}

/**
 * Schedule fields for create/update from an app cadence. Custom cadences send
 * `custom_days` + the day mask; presets send their plain frequency string.
 */
export function toScheduleFields(
  frequency: Frequency,
  daysOfWeek?: number[],
): Pick<CreatePromptBody, 'frequency' | 'days_of_week'> {
  const backendFrequency: BackendFrequency =
    frequency === 'custom' ? 'custom_days' : frequency;
  if (frequency === 'custom') {
    return { frequency: backendFrequency, days_of_week: daysToMask(daysForFrequency('custom', daysOfWeek)) };
  }
  return { frequency: backendFrequency };
}

function toStatus(s: PromptDTO['status']): DailyItem['status'] {
  return s === 'active' ? 'active' : 'paused';
}

export function promptToItem(p: PromptDTO): DailyItem {
  const schedule = p.schedule ?? null;
  const frequency = toFrequency(schedule?.frequency);
  return {
    id: p.id,
    type: p.type,
    intent: p.intent,
    title: p.title ?? undefined,
    tone: p.tone ?? undefined,
    timeOfDay: schedule?.time_of_day ?? '08:00',
    frequency,
    // Carry the explicit day-set only for custom cadences that sent a mask.
    daysOfWeek:
      frequency === 'custom' && schedule?.days_of_week != null
        ? maskToDays(schedule.days_of_week)
        : undefined,
    status: toStatus(p.status),
    reminderOn: schedule ? schedule.enabled : true,
    position: p.position ?? 0,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

function toGenStatus(s: ContentEntryDTO['status']): GenStatus {
  if (s === 'refusal') return 'refusal';
  if (s === 'failed') return 'failed';
  return 'ready'; // queued | running | ready → treat as ready for the UI
}

export function contentToEntry(c: ContentEntryDTO): ContentEntry {
  return {
    id: c.id,
    itemId: c.prompt_id,
    forDate: c.for_date,
    variant: c.variant,
    title: c.title ?? undefined,
    body: c.body ?? '',
    tone: c.tone ?? undefined,
    structured: c.structured ? JSON.stringify(c.structured) : undefined,
    model: c.model ?? undefined,
    genStatus: toGenStatus(c.status),
    completedAt: null, // overlaid by the remote store from local engagement state
    createdAt: c.created_at,
  };
}
