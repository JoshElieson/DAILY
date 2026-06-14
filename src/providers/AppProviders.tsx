/**
 * Composition root for app-wide providers: React Query (async/generation),
 * Theme, Settings, Toast, and the gesture/safe-area roots (PLANNING.md §3.1).
 * The app is anonymous/local-first, so there is no auth provider — onboarding
 * state lives in SettingsProvider.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components';
import { SettingsProvider } from '@/features/settings/SettingsProvider';
import { ThemeProvider } from '@/theme';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <SettingsProvider>
              <ToastProvider>{children}</ToastProvider>
            </SettingsProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
