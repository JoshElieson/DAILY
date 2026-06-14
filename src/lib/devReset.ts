/**
 * Dev-only "fresh start" reset.
 *
 * When EXPO_PUBLIC_FRESH_START is set, the app wipes ALL locally-persisted state
 * on launch so you see exactly what a brand-new user sees: no Dailies/reminders,
 * not onboarded (→ redirected to /onboarding), default settings/appearance, and
 * no scheduled notifications.
 *
 * Everything this app persists lives under the `daily.` AsyncStorage namespace
 * (items, content, settings incl. onboarding, appearance, the review prompt, the
 * backend session, and the notification id map), so clearing that prefix is a
 * complete reset and automatically covers any future keys.
 *
 * This runs ONCE per JS runtime (a module-level guard), before the providers
 * read storage — see src/app/_layout.tsx. Orphaned OS-scheduled notifications
 * are cleared by the existing launch reschedule, which now sees an empty item
 * list and cancels everything.
 *
 * To use it:  EXPO_PUBLIC_FRESH_START=1 npx expo start   (or `npm run start:fresh`)
 * To go back to your real data, just start normally (`npx expo start`).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'daily.';

/** True when the fresh-start flag is set (accepts `1` or `true`). */
export const FRESH_START =
  process.env.EXPO_PUBLIC_FRESH_START === '1' ||
  process.env.EXPO_PUBLIC_FRESH_START === 'true';

let didReset = false;

/** Remove every persisted `daily.*` key. Idempotent and best-effort. */
export async function resetAllAppState(): Promise<void> {
  if (didReset) return;
  didReset = true;
  try {
    const keys = await AsyncStorage.getAllKeys();
    const dailyKeys = keys.filter((k) => k.startsWith(PREFIX));
    if (dailyKeys.length) await AsyncStorage.multiRemove(dailyKeys);
  } catch {
    /* best-effort: a failed wipe just leaves existing data in place */
  }
}
