/**
 * Notification themes — selectable "personalities" for reminder notifications.
 *
 * What's actually adjustable maps to what each OS allows:
 *  • Sound — iOS plays the default system sound or none (a custom tone needs a
 *    bundled audio file, which the MVP doesn't ship); Android routes sound via
 *    the channel. So `sound: true` = default sound, `false` = silent.
 *  • Look / how it pops up — iOS exposes an `interruptionLevel`:
 *      - 'passive'      → slips quietly into the list, never lights the screen
 *      - 'active'       → the normal banner + sound
 *      - 'timeSensitive'→ breaks through Focus / Do Not Disturb, demands attention
 *    Android mirrors this with channel `importance` (low / high), which controls
 *    whether the heads-up banner appears.
 *
 * Each theme bundles a sound + interruption level + Android importance, and gets
 * its own Android channel (importance can't be changed after a channel is made,
 * so distinct looks need distinct channels).
 */

export type NotificationThemeId = 'calm' | 'gentle' | 'chime' | 'focus';

export type InterruptionLevel = 'passive' | 'active' | 'timeSensitive';
export type AndroidImportanceName = 'LOW' | 'DEFAULT' | 'HIGH';

export type NotificationTheme = {
  id: NotificationThemeId;
  label: string;
  description: string;
  /** Plays the default notification sound when true; silent when false. */
  sound: boolean;
  /** iOS: how forcefully the notification presents. */
  interruptionLevel: InterruptionLevel;
  /** Android: channel importance (drives heads-up banner + sound). */
  androidImportance: AndroidImportanceName;
  /** Stable per-theme Android channel id. */
  channelId: string;
};

/** Ordered for display; the first is the default. */
export const NOTIFICATION_THEMES: NotificationTheme[] = [
  {
    id: 'calm',
    label: 'Calm',
    description: 'Soft banner with the default sound',
    sound: true,
    interruptionLevel: 'active',
    androidImportance: 'DEFAULT',
    channelId: 'daily-calm',
  },
  {
    id: 'gentle',
    label: 'Gentle',
    description: 'Silent — slips quietly into your list',
    sound: false,
    interruptionLevel: 'passive',
    androidImportance: 'LOW',
    channelId: 'daily-gentle',
  },
  {
    id: 'chime',
    label: 'Chime',
    description: 'Lively banner that pops up with sound',
    sound: true,
    interruptionLevel: 'active',
    androidImportance: 'HIGH',
    channelId: 'daily-chime',
  },
  {
    id: 'focus',
    label: 'Focus',
    description: 'Breaks through Focus & Do Not Disturb',
    sound: true,
    interruptionLevel: 'timeSensitive',
    androidImportance: 'HIGH',
    channelId: 'daily-focus',
  },
];

const BY_ID: Record<NotificationThemeId, NotificationTheme> =
  NOTIFICATION_THEMES.reduce(
    (acc, t) => {
      acc[t.id] = t;
      return acc;
    },
    {} as Record<NotificationThemeId, NotificationTheme>,
  );

export const DEFAULT_NOTIFICATION_THEME: NotificationThemeId = 'calm';

export function isNotificationThemeId(v: unknown): v is NotificationThemeId {
  return typeof v === 'string' && v in BY_ID;
}

export function notificationTheme(id: NotificationThemeId): NotificationTheme {
  return BY_ID[id] ?? BY_ID[DEFAULT_NOTIFICATION_THEME];
}
