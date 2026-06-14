/**
 * Free-tier limits (master-spec §E; roadmap T-403). The free plan keeps a small
 * number of active Dailies; beyond it the create flow routes to the paywall.
 * Premium is unlimited. Kept here so the cap is a single source of truth shared
 * by the create flow and any future gating.
 */

/** Active Dailies allowed on the free plan. */
export const FREE_ACTIVE_LIMIT = 3;

/** Daily reminders (scheduled notifications) allowed on the free plan. */
export const FREE_REMINDER_LIMIT = 2;

/** True when a non-premium user is at/over the active-Daily cap. */
export function atFreeLimit(activeCount: number, premium: boolean): boolean {
  return !premium && activeCount >= FREE_ACTIVE_LIMIT;
}

/**
 * True when turning a reminder on would exceed the free reminder cap.
 * `otherReminderCount` is the number of OTHER active Dailies that already have a
 * reminder on (exclude the Daily being saved). Premium is unlimited.
 */
export function atReminderLimit(otherReminderCount: number, premium: boolean): boolean {
  return !premium && otherReminderCount >= FREE_REMINDER_LIMIT;
}
