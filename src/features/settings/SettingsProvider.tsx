/**
 * Settings + entitlement provider. Holds user preferences (default reminder
 * time, notification/reflection toggles, badge counts), the onboarding-complete
 * flag, and the mocked premium entitlement. Persisted locally; appearance lives
 * in ThemeProvider. (screens §D, §E; implementation §7.)
 *
 * The app is anonymous/local-first (master-spec §2.7 — no accounts), so there is
 * no auth provider; the only cross-launch identity state is "has the user
 * finished onboarding," which lives here alongside the other persisted prefs.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_NOTIFICATION_THEME,
  type NotificationThemeId,
} from '@/features/notifications/themes';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type Settings = {
  defaultTime: string; // 'HH:MM'
  notificationsEnabled: boolean;
  /** Notification "personality" — sound + how it pops up (see notifications/themes.ts). */
  notificationTheme: NotificationThemeId;
  reflectionPrompt: boolean;
  showStreaks: boolean;
  badgeCount: boolean;
  premiumActive: boolean;
  /** First launch shows onboarding until this flips true. */
  onboarded: boolean;
};

const DEFAULTS: Settings = {
  defaultTime: '08:00',
  notificationsEnabled: true,
  notificationTheme: DEFAULT_NOTIFICATION_THEME,
  reflectionPrompt: true,
  showStreaks: true,
  badgeCount: false,
  premiumActive: false,
  onboarded: false,
};

const STORAGE_KEY = 'daily.settings';

type SettingsContextValue = {
  settings: Settings;
  hydrated: boolean;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  setPremium: (active: boolean) => void;
  completeOnboarding: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setSettings({ ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) });
      })
      .finally(() => setHydrated(true));
  }, []);

  const persist = useCallback((next: Settings) => {
    setSettings(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const update = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      persist({ ...settings, [key]: value });
    },
    [persist, settings],
  );

  const setPremium = useCallback(
    (active: boolean) => persist({ ...settings, premiumActive: active }),
    [persist, settings],
  );

  const completeOnboarding = useCallback(
    () => persist({ ...settings, onboarded: true }),
    [persist, settings],
  );

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, hydrated, update, setPremium, completeOnboarding }),
    [settings, hydrated, update, setPremium, completeOnboarding],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
