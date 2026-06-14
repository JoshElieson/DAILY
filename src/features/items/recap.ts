/**
 * Weekly recap — a small, derived view of the current calendar week (Mon–Sun)
 * built from the same device-local completion dates that drive streaks
 * (streaks.ts / master-spec D3). Pure functions, no I/O, so they're testable.
 */
import { isoDate } from '@/lib/date';

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

/** 0=Sun..6=Sat → Monday-based offset (Mon=0..Sun=6). */
function mondayOffset(date: string): number {
  const dow = new Date(`${date}T00:00:00`).getDay();
  return (dow + 6) % 7;
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export type RecapDay = {
  date: string;
  label: string;
  done: boolean;
  isToday: boolean;
  isFuture: boolean;
};

export type WeeklyRecap = {
  /** Monday → Sunday of the week containing `today`. */
  days: RecapDay[];
  /** Distinct days practiced this week. */
  daysPracticed: number;
  /** Days so far this week (Mon..today inclusive) — the realistic denominator. */
  daysElapsed: number;
  weekStart: string;
  weekEnd: string;
};

export function computeWeeklyRecap(
  completionDates: string[],
  today = isoDate(),
): WeeklyRecap {
  const set = new Set(completionDates);
  const weekStart = shiftDate(today, -mondayOffset(today));
  const weekEnd = shiftDate(weekStart, 6);

  const days: RecapDay[] = WEEKDAY_LABELS.map((label, i) => {
    const date = shiftDate(weekStart, i);
    return {
      date,
      label,
      done: set.has(date),
      isToday: date === today,
      isFuture: date > today,
    };
  });

  return {
    days,
    daysPracticed: days.filter((d) => d.done).length,
    daysElapsed: mondayOffset(today) + 1,
    weekStart,
    weekEnd,
  };
}
