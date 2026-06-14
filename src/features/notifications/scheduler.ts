/**
 * Local notification scheduler (master-spec D6/§7; roadmap T-301..T-305).
 *
 * Wraps `expo-notifications` behind a small interface so hooks/screens never
 * import it directly. Per active Daily with reminders on: a single DAILY trigger
 * when it repeats every day, otherwise one WEEKLY trigger per selected weekday
 * (`weekdays` = Mon–Fri, `custom` = the chosen set). A per-item map of scheduled
 * identifiers lets us cancel precisely.
 *
 * Every native call is guarded: on web — and if the module is unavailable — each
 * function degrades to a safe no-op, so the exact same code runs everywhere and
 * the web export keeps building.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { parseTime } from '@/lib/date';
import { daysForFrequency } from '@/features/items/schedule';
import type { ContentType, DailyItem } from '@/features/items/types';
import {
  DEFAULT_NOTIFICATION_THEME,
  isNotificationThemeId,
  NOTIFICATION_THEMES,
  notificationTheme,
  type NotificationTheme,
} from './themes';
import type { SchedulableNotificationTriggerInput } from 'expo-notifications';

type NotificationsModule = typeof import('expo-notifications');

const MAP_KEY = 'daily.notif.map'; // itemId -> scheduled notification identifiers
const SETTINGS_KEY = 'daily.settings'; // mirror of SettingsProvider's storage key

// Lazily resolve the native module exactly once; null on web / when missing.
let mod: NotificationsModule | null | undefined;
function notif(): NotificationsModule | null {
  if (mod !== undefined) return mod;
  if (Platform.OS === 'web') {
    mod = null;
    return null;
  }
  try {
    mod = require('expo-notifications') as NotificationsModule;
  } catch {
    mod = null;
  }
  return mod;
}

// ── identifier map ──────────────────────────────────────────────────────────
async function readMap(): Promise<Record<string, string[]>> {
  try {
    const raw = await AsyncStorage.getItem(MAP_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
  } catch {
    return {};
  }
}
async function writeMap(map: Record<string, string[]>): Promise<void> {
  try {
    await AsyncStorage.setItem(MAP_KEY, JSON.stringify(map));
  } catch {
    /* best-effort */
  }
}

/** Reads the persisted global toggle (defaults true, matching SettingsProvider). */
async function globalEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return true;
    return (JSON.parse(raw) as { notificationsEnabled?: boolean }).notificationsEnabled !== false;
  } catch {
    return true;
  }
}

/** Reads the persisted notification theme (defaults to the calm theme). */
async function readNotificationTheme(): Promise<NotificationTheme> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    const id = raw
      ? (JSON.parse(raw) as { notificationTheme?: unknown }).notificationTheme
      : undefined;
    return notificationTheme(
      isNotificationThemeId(id) ? id : DEFAULT_NOTIFICATION_THEME,
    );
  } catch {
    return notificationTheme(DEFAULT_NOTIFICATION_THEME);
  }
}

// ── setup ───────────────────────────────────────────────────────────────────
let handlerSet = false;
let channelsSet = false;

/** Map a theme's importance name to the native AndroidImportance enum. */
function androidImportance(N: NotificationsModule, theme: NotificationTheme) {
  switch (theme.androidImportance) {
    case 'LOW':
      return N.AndroidImportance.LOW;
    case 'HIGH':
      return N.AndroidImportance.HIGH;
    case 'DEFAULT':
    default:
      return N.AndroidImportance.DEFAULT;
  }
}

/** Foreground handler + one Android channel per notification theme. Idempotent. */
export async function configureNotifications(): Promise<void> {
  const N = notif();
  if (!N) return;
  if (!handlerSet) {
    N.setNotificationHandler({
      // Honour the active theme's sound for foreground presentation too.
      handleNotification: async () => {
        const theme = await readNotificationTheme();
        return {
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: theme.sound,
          shouldSetBadge: false,
        };
      },
    });
    handlerSet = true;
  }
  if (Platform.OS === 'android' && !channelsSet) {
    try {
      for (const theme of NOTIFICATION_THEMES) {
        await N.setNotificationChannelAsync(theme.channelId, {
          name: `Daily reminders · ${theme.label}`,
          importance: androidImportance(N, theme),
          // undefined → channel default sound; null → silent.
          sound: theme.sound ? undefined : null,
        });
      }
      channelsSet = true;
    } catch {
      /* best-effort */
    }
  }
}

// ── permissions ───────────────────────────────────────────────────────────--
export async function getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  const N = notif();
  if (!N) return 'denied';
  try {
    const { granted, canAskAgain } = await N.getPermissionsAsync();
    if (granted) return 'granted';
    // Not granted but still promptable → treat as undetermined.
    return canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'denied';
  }
}

/** Request OS permission (idempotent). Returns whether reminders are now allowed. */
export async function ensurePermission(): Promise<boolean> {
  const N = notif();
  if (!N) return false;
  try {
    const current = await N.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false; // denied and can't re-ask
    const req = await N.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

// ── scheduling ───────────────────────────────────────────────────────────---
/** Calm, per-type teaser shown on the notification (voice §7.7). */
const teaserByType: Record<ContentType, string> = {
  reflection: 'A moment to reflect is ready.',
  motivation: 'A little encouragement for you.',
  habit: 'A gentle nudge for today.',
  story: 'Today’s short read is ready.',
  journal: 'A prompt to write to is ready.',
  learning: 'Something small to learn today.',
  custom: 'Your Daily is ready.',
};

function triggersFor(
  item: DailyItem,
  N: NotificationsModule,
  channelId: string | undefined,
): SchedulableNotificationTriggerInput[] {
  const { hour, minute } = parseTime(item.timeOfDay);
  const days = daysForFrequency(item.frequency, item.daysOfWeek);
  // Every day → one DAILY trigger; otherwise one WEEKLY trigger per selected day
  // (weekdays and custom both fall here). expo weekday is 1=Sun … 7=Sat, so a
  // domain day (0=Sun … 6=Sat) maps with +1.
  if (days.length === 7) {
    return [{ type: N.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId }];
  }
  return days.map((day) => ({
    type: N.SchedulableTriggerInputTypes.WEEKLY,
    weekday: day + 1,
    hour,
    minute,
    channelId,
  }));
}

/** Schedule an item's trigger(s) and remember the ids. Assumes checks passed. */
async function scheduleNow(item: DailyItem, N: NotificationsModule): Promise<void> {
  const title = item.title ?? item.intent;
  const body = teaserByType[item.type] ?? teaserByType.custom;
  const theme = await readNotificationTheme();
  const channelId = Platform.OS === 'android' ? theme.channelId : undefined;
  const ids: string[] = [];
  for (const trigger of triggersFor(item, N, channelId)) {
    try {
      const id = await N.scheduleNotificationAsync({
        content: {
          title,
          body,
          // Theme-driven presentation: default sound or silent, and the iOS
          // interruption level that sets how forcefully it pops up.
          sound: theme.sound,
          interruptionLevel: theme.interruptionLevel,
          data: { itemId: item.id, url: `daily://item/${item.id}` },
        },
        trigger,
      });
      ids.push(id);
    } catch {
      /* skip this trigger */
    }
  }
  if (ids.length) {
    const map = await readMap();
    map[item.id] = ids;
    await writeMap(map);
  }
}

/** Cancel any scheduled notifications for one Daily. */
export async function cancelItem(itemId: string): Promise<void> {
  const N = notif();
  if (!N) return;
  const map = await readMap();
  const ids = map[itemId] ?? [];
  await Promise.all(ids.map((id) => N.cancelScheduledNotificationAsync(id).catch(() => {})));
  if (map[itemId]) {
    delete map[itemId];
    await writeMap(map);
  }
}

/**
 * Reconcile one Daily's notifications with its current state — call after create,
 * edit, pause/resume. Cancels the old schedule, then reschedules only if
 * reminders are on, the Daily is active, the global toggle is on, and the OS
 * granted permission. Otherwise it just stays cancelled.
 */
export async function scheduleItem(item: DailyItem): Promise<void> {
  const N = notif();
  if (!N) return;
  await configureNotifications();
  await cancelItem(item.id);

  if (!item.reminderOn || item.status !== 'active') return;
  if (!(await globalEnabled())) return;
  if ((await getPermissionStatus()) !== 'granted') return;
  await scheduleNow(item, N);
}

/**
 * Cancel everything and reschedule from `items` (roadmap T-305 — run on launch
 * and after the global toggle / permission changes). Gated only by OS
 * permission; callers pass an empty list (or only active items) to express the
 * global toggle, avoiding any read-after-write race on the persisted setting.
 */
export async function rescheduleAll(items: DailyItem[]): Promise<void> {
  const N = notif();
  if (!N) return;
  await configureNotifications();
  try {
    await N.cancelAllScheduledNotificationsAsync();
  } catch {
    /* best-effort */
  }
  await writeMap({});
  if ((await getPermissionStatus()) !== 'granted') return;
  for (const item of items) {
    if (item.status === 'active' && item.reminderOn) await scheduleNow(item, N);
  }
}
