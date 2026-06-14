/**
 * Date / time helpers. Times are stored as `HH:MM` 24h local wall-clock strings
 * (PLANNING.md §3.4); dates as `YYYY-MM-DD`. Display formatting (12h) happens at
 * the edge so the data layer stays locale-neutral.
 */

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

/** "08:00" -> "8:00 AM" */
export function formatTime(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = mStr ?? '00';
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.padStart(2, '0')} ${period}`;
}

/** Parse "08:00" -> { hour, minute }. */
export function parseTime(hhmm: string): { hour: number; minute: number } {
  const [h, m] = hhmm.split(':');
  return { hour: Number(h) || 0, minute: Number(m) || 0 };
}

export function buildTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function timeOfDayOf(hhmm: string): TimeOfDay {
  const { hour } = parseTime(hhmm);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export const timeOfDayLabel: Record<TimeOfDay, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};

/** Time-aware greeting for the Home large title (screens §B ②). */
export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** "Tuesday, June 13" */
export function formatLongDate(now = new Date()): string {
  return now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/** "YYYY-MM-DD" in local time. */
export function isoDate(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Best-effort IANA timezone for generation requests (PLANNING.md §4.1). */
export function timezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
