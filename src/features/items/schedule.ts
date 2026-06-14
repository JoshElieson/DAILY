/**
 * Repeat-schedule helpers. A Daily's cadence is modelled as a `frequency`
 * discriminator plus, for `custom`, an explicit set of weekdays. Everything that
 * needs the concrete days a Daily fires on (the notification scheduler, labels,
 * the picker UI) derives them from one place here so the model and the UI can
 * never drift.
 *
 * Day numbers use the JS `Date.getDay()` convention: 0 = Sunday … 6 = Saturday.
 */
import type { Frequency } from './types';

/** Weekday columns in display order (Sun-first, matching most calendars). */
export const WEEKDAY_ORDER = [0, 1, 2, 3, 4, 5, 6] as const;

/** Single-letter labels for the day toggles (index = day number, 0=Sun). */
export const dayInitial = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
/** Short labels for compact summaries. */
export const dayShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
/** Full labels for accessibility. */
export const dayLong = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5]; // Mon–Fri
const WEEKENDS = [0, 6]; // Sun, Sat

/** True when two day-sets contain exactly the same days (order-independent). */
export function sameDaySet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((d) => set.has(d));
}

/**
 * The concrete weekdays a Daily fires on (0=Sun..6=Sat), ascending. `daily`
 * implies all 7 and `weekdays` implies Mon–Fri, so their day-sets are derived
 * rather than stored; only `custom` carries an explicit `daysOfWeek`.
 */
export function daysForFrequency(frequency: Frequency, daysOfWeek?: number[]): number[] {
  if (frequency === 'weekdays') return [...WEEKDAYS];
  if (frequency === 'custom') {
    return Array.from(new Set(daysOfWeek ?? [])).sort((a, b) => a - b);
  }
  return [...ALL_DAYS]; // daily
}

export type RepeatValue = { frequency: Frequency; daysOfWeek?: number[] };

/**
 * Collapse a raw set of selected days into the canonical `(frequency,
 * daysOfWeek)` pair: all 7 → `daily`, Mon–Fri → `weekdays`, otherwise `custom`
 * with the explicit (sorted, de-duped) set.
 */
export function normalizeDays(days: number[]): RepeatValue {
  const set = Array.from(new Set(days)).sort((a, b) => a - b);
  if (sameDaySet(set, ALL_DAYS)) return { frequency: 'daily' };
  if (sameDaySet(set, WEEKDAYS)) return { frequency: 'weekdays' };
  return { frequency: 'custom', daysOfWeek: set };
}

/** Quick-pick presets shown above the per-day toggles. */
export const repeatPresets: { label: string; days: number[] }[] = [
  { label: 'Every day', days: ALL_DAYS },
  { label: 'Weekdays', days: WEEKDAYS },
  { label: 'Weekends', days: WEEKENDS },
];

/**
 * A compact, human label for a Daily's repeat schedule — used on cards and the
 * Repeat row. Custom sets list their days when short (≤3) and otherwise collapse
 * to a count; the picker itself always shows the exact days.
 */
export function repeatLabel(frequency: Frequency, daysOfWeek?: number[]): string {
  if (frequency === 'daily') return 'Daily';
  if (frequency === 'weekdays') return 'Weekdays';
  const days = daysForFrequency('custom', daysOfWeek);
  if (days.length === 0) return 'Never';
  if (sameDaySet(days, ALL_DAYS)) return 'Daily';
  if (sameDaySet(days, WEEKDAYS)) return 'Weekdays';
  if (sameDaySet(days, WEEKENDS)) return 'Weekends';
  if (days.length <= 3) return days.map((d) => dayShort[d]).join(', ');
  return `${days.length} days / week`;
}
