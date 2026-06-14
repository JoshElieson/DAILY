// Time & schedule math. The scheduler's heartbeat is `schedules.next_run_at`
// (BACKEND-SCHEMA-API.md §4): we store the user's local wall-clock time + IANA
// timezone, and compute the next UTC instant the schedule should fire.
//
// Timezone conversion uses Intl (no external tz library). `zonedTimeToUtc`
// finds the UTC instant whose wall-clock, rendered in the target tz, matches
// the requested local Y-M-D H:M. This is DST-correct for the common cases.

const DOW = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };

export const WEEKDAYS_MASK = 0b0111110; // Mon..Fri  (bit0=Mon ... bit6=Sun)
export const WEEKENDS_MASK = 0b1000001; // Sat,Sun
export const ALL_DAYS_MASK = 0b1111111;

/** Today's date (YYYY-MM-DD) in a given IANA timezone. */
export function todayInTz(timezone, now = new Date()) {
  return formatYmdInTz(now, timezone);
}

export function formatYmdInTz(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** The weekday (0=Sun..6=Sat) of an instant rendered in a timezone. */
function weekdayInTz(date, timezone) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(
    date,
  );
  return DOW[name];
}

/** Offset (minutes) of a timezone at a given instant. */
function tzOffsetMinutes(date, timezone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  const asUTC = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') === 24 ? 0 : get('hour'),
    get('minute'),
    get('second'),
  );
  return (asUTC - date.getTime()) / 60000;
}

/**
 * Convert a wall-clock local time in `timezone` to a UTC Date.
 * @param {string} ymd 'YYYY-MM-DD'
 * @param {string} hm  'HH:MM'
 */
export function zonedTimeToUtc(ymd, hm, timezone) {
  const [y, mo, d] = ymd.split('-').map(Number);
  const [h, mi] = hm.split(':').map(Number);
  // First guess: treat the wall-clock as if it were UTC, then correct by the
  // tz offset at that approximate instant (two-pass handles DST boundaries).
  const guess = new Date(Date.UTC(y, mo - 1, d, h, mi, 0));
  const offset1 = tzOffsetMinutes(guess, timezone);
  const corrected = new Date(guess.getTime() - offset1 * 60000);
  const offset2 = tzOffsetMinutes(corrected, timezone);
  if (offset2 !== offset1) {
    return new Date(guess.getTime() - offset2 * 60000);
  }
  return corrected;
}

function dayEnabled(mask, weekday /* 0=Sun..6=Sat */) {
  // bitmask is Mon(bit0)..Sun(bit6)
  const bit = weekday === 0 ? 6 : weekday - 1;
  return (mask & (1 << bit)) !== 0;
}

/**
 * Compute the next UTC fire instant for a schedule, strictly after `after`.
 * @param {object} schedule { frequency, time_of_day, timezone, days_of_week, start_date, end_date }
 * @param {Date} [after]
 * @returns {Date|null} null when the schedule has ended / never fires
 */
export function computeNextRunAt(schedule, after = new Date()) {
  const { frequency, time_of_day: hm, timezone, start_date, end_date } = schedule;
  const tz = timezone || 'UTC';

  let mask;
  switch (frequency) {
    case 'daily':
    case 'multiple_daily':
      mask = ALL_DAYS_MASK;
      break;
    case 'weekdays':
      mask = WEEKDAYS_MASK;
      break;
    case 'weekends':
      mask = WEEKENDS_MASK;
      break;
    case 'weekly':
    case 'custom_days':
      mask = schedule.days_of_week ?? 0;
      break;
    default:
      mask = ALL_DAYS_MASK;
  }
  if (!mask) return null;

  const endLimit = end_date ? new Date(`${end_date}T23:59:59Z`) : null;

  // Walk forward day by day (max ~370 to cover weekly/custom + a leap year).
  for (let i = 0; i < 370; i++) {
    const probe = new Date(after.getTime() + i * 86400000);
    const ymd = formatYmdInTz(probe, tz);
    if (start_date && ymd < start_date) continue;

    const fireUtc = zonedTimeToUtc(ymd, hm, tz);
    if (fireUtc <= after) continue; // already passed today
    if (endLimit && fireUtc > endLimit) return null;

    const wd = weekdayInTz(fireUtc, tz);
    if (dayEnabled(mask, wd)) return fireUtc;
  }
  return null;
}

/** ISO string or null. */
export const iso = (d) => (d ? new Date(d).toISOString() : null);
