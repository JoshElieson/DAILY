/**
 * Root layout — providers, fonts, splash, and the root Stack navigator.
 * Create / Premium are presented modally (sheet-style) per the design
 * (screens §C, §E).
 */
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { store } from '@/features/items/store';
import {
  configureNotifications,
  rescheduleAll,
} from '@/features/notifications/scheduler';
import { useNotificationObserver } from '@/features/notifications/useNotificationObserver';
import { useSettings } from '@/features/settings/SettingsProvider';
import { FRESH_START, resetAllAppState } from '@/lib/devReset';
import { useAppFonts } from '@/lib/useAppFonts';
import { AppProviders } from '@/providers/AppProviders';
import { useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const theme = useTheme();
  const { settings, hydrated } = useSettings();
  const didInit = useRef(false);

  // Route notification taps to the right Daily (deep links, T-303).
  useNotificationObserver();

  // On launch (once settings hydrate) re-assert the schedule from stored Dailies
  // — covers reinstall, OS-cleared schedules, and permission changes (T-305).
  useEffect(() => {
    if (!hydrated || didInit.current) return;
    didInit.current = true;
    (async () => {
      await configureNotifications();
      try {
        const items = settings.notificationsEnabled ? await store.listItems() : [];
        await rescheduleAll(items);
      } catch {
        /* scheduling is best-effort */
      }
    })();
  }, [hydrated, settings.notificationsEnabled]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.bg }}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.color.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="item/[id]" />
        <Stack.Screen name="profile" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="reflections" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="recap" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen
          name="create"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="premium"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const fontsLoaded = useAppFonts();

  // Dev "fresh start": when EXPO_PUBLIC_FRESH_START is set, wipe all persisted
  // state BEFORE the providers mount and read storage, so the app boots exactly
  // like a brand-new install (onboarding, no Dailies/reminders). Off by default.
  const [resetDone, setResetDone] = useState(!FRESH_START);
  useEffect(() => {
    if (FRESH_START) resetAllAppState().finally(() => setResetDone(true));
  }, []);

  useEffect(() => {
    if (fontsLoaded && resetDone) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, resetDone]);

  if (!fontsLoaded || !resetDone) return null;

  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
