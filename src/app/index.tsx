/**
 * Entry redirect — routes to onboarding on first launch, otherwise Home
 * (PLANNING.md §3.1 index → redirect). Waits for settings hydration so we don't
 * flash the wrong screen.
 */
import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useSettings } from '@/features/settings/SettingsProvider';
import { useTheme } from '@/theme';

export default function Index() {
  const { settings, hydrated } = useSettings();
  const theme = useTheme();

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.color.bg }}>
        <ActivityIndicator color={theme.color.accent} />
      </View>
    );
  }

  return <Redirect href={settings.onboarded ? '/(tabs)' : '/onboarding'} />;
}
