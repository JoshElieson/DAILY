/**
 * Theme provider — exposes the active semantic `Theme` and the user's
 * appearance preference (System / Light / Dark, persisted). Components read
 * colors/scheme via `useTheme()`; they never branch on raw color values.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type SemanticColors } from './colors';
import {
  accentSetFor,
  DEFAULT_COLOR_THEME,
  isColorTheme,
  type ColorTheme,
} from './themes';
import { elevation, motion, radius, space } from './tokens';
import { typography } from './typography';

export type ColorScheme = 'light' | 'dark';
export type AppearancePref = 'system' | 'light' | 'dark';

export type Theme = {
  scheme: ColorScheme;
  isDark: boolean;
  color: SemanticColors;
  space: typeof space;
  radius: typeof radius;
  elevation: typeof elevation;
  motion: typeof motion;
  typography: typeof typography;
};

const STORAGE_KEY = 'daily.appearance';
const THEME_KEY = 'daily.colorTheme';

type ThemeContextValue = Theme & {
  appearance: AppearancePref;
  setAppearance: (pref: AppearancePref) => void;
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function buildTheme(scheme: ColorScheme, colorTheme: ColorTheme): Theme {
  const base = scheme === 'dark' ? darkColors : lightColors;
  return {
    scheme,
    isDark: scheme === 'dark',
    // The selected color theme overrides only the accent family; neutrals and
    // text come from the appearance's base set.
    color: { ...base, ...accentSetFor(colorTheme, scheme) },
    space,
    radius,
    elevation,
    motion,
    typography,
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [appearance, setAppearanceState] = useState<AppearancePref>('system');
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(DEFAULT_COLOR_THEME);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === 'light' || value === 'dark' || value === 'system') {
        setAppearanceState(value);
      }
    });
    AsyncStorage.getItem(THEME_KEY).then((value) => {
      if (isColorTheme(value)) setColorThemeState(value);
    });
  }, []);

  const setAppearance = useCallback((pref: AppearancePref) => {
    setAppearanceState(pref);
    AsyncStorage.setItem(STORAGE_KEY, pref).catch(() => {});
  }, []);

  const setColorTheme = useCallback((theme: ColorTheme) => {
    setColorThemeState(theme);
    AsyncStorage.setItem(THEME_KEY, theme).catch(() => {});
  }, []);

  const scheme: ColorScheme =
    appearance === 'system' ? (systemScheme ?? 'light') : appearance;

  const value = useMemo<ThemeContextValue>(
    () => ({
      ...buildTheme(scheme, colorTheme),
      appearance,
      setAppearance,
      colorTheme,
      setColorTheme,
    }),
    [scheme, colorTheme, appearance, setAppearance, setColorTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
