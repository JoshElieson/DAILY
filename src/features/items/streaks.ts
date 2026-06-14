/**
 * Streak & practice-stat computation (master-spec D3). Derived from the distinct
 * local dates on which the user completed at least one Daily, so it works the
 * same in mock and backend modes (completion is device-local either way).
 * Pure functions — no I/O — so they're trivially testable.
 */
import { isoDate } from '@/lib/date';

/** Add `days` to a 'YYYY-MM-DD' string, returning a new 'YYYY-MM-DD'. */
function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

export type Stats = {
  /** Consecutive days ending today (or yesterday — see below). */
  currentStreak: number;
  /** Longest consecutive run anywhere in the history. */
  longestStreak: number;
  /** Total distinct days with a completion. */
  totalDays: number;
};

/**
 * The current streak counts back from today; if today has no completion yet we
 * start from yesterday, so the streak isn't shown as "broken" simply because the
 * day isn't over. A missed full day resets it to 0.
 */
export function computeStats(completionDates: string[], today = isoDate()): Stats {
  const set = new Set(completionDates);

  // Longest run of consecutive days.
  const sorted = Array.from(set).sort();
  let longestStreak = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev && shiftDate(prev, 1) === d ? run + 1 : 1;
    if (run > longestStreak) longestStreak = run;
    prev = d;
  }

  // Current streak: walk backwards from today (grace day = yesterday).
  let currentStreak = 0;
  let cursor = set.has(today) ? today : shiftDate(today, -1);
  while (set.has(cursor)) {
    currentStreak += 1;
    cursor = shiftDate(cursor, -1);
  }

  return { currentStreak, longestStreak, totalDays: set.size };
}
