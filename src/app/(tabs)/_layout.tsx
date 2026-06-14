/**
 * Bottom tab bar — Today · Upcoming · Reflect · Settings (components §12).
 * Surface background with a top hairline; active = accent. The FAB is not a tab;
 * it floats above this bar on the Today/Upcoming screens.
 */
import { Tabs } from 'expo-router';
import {
  CalendarClock,
  Moon,
  Settings as SettingsIcon,
  Sun,
} from 'lucide-react-native';
import React from 'react';
import { Platform } from 'react-native';

import { fontFamily } from '@/theme/typography';
import { useTheme } from '@/theme';

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.color.accent,
        tabBarInactiveTintColor: theme.color.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.color.surface,
          borderTopColor: theme.color.hairline,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          // Soft upward lift — the bar floats over the content beneath it.
          shadowColor: '#2A2014',
          shadowOpacity: 0.05,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: -3 },
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamily.sansMedium,
          fontSize: 11,
          letterSpacing: 0.3,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => (
            <Sun size={size} color={color} strokeWidth={1.75} />
          ),
        }}
      />
      <Tabs.Screen
        name="upcoming"
        options={{
          title: 'Upcoming',
          tabBarIcon: ({ color, size }) => (
            <CalendarClock size={size} color={color} strokeWidth={1.75} />
          ),
        }}
      />
      <Tabs.Screen
        name="reflect"
        options={{
          title: 'Reflect',
          tabBarIcon: ({ color, size }) => (
            <Moon size={size} color={color} strokeWidth={1.75} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <SettingsIcon size={size} color={color} strokeWidth={1.75} />
          ),
        }}
      />
    </Tabs>
  );
}
