import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { reflectionPromptForDate } from './prompts';

/** Storage prefix every saved reflection shares (`daily.reflection.YYYY-MM-DD`). */
const PREFIX = 'daily.reflection.';

export type ReflectionEntry = {
  /** 'YYYY-MM-DD' the reflection was saved for. */
  date: string;
  /** The prompt surfaced that day (recomputed deterministically from the date). */
  prompt: string;
  /** The answer the user saved. */
  answer: string;
};

/**
 * Loads every saved reflection across all time, pairing each saved answer with
 * the prompt that was shown on that date. Newest first. Powers the premium
 * History & Insights page; the data lives entirely on-device (master-spec §2.7).
 */
export function useAllReflections() {
  const [entries, setEntries] = useState<ReflectionEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const reflectionKeys = keys.filter((k) => k.startsWith(PREFIX));
      const pairs = await AsyncStorage.multiGet(reflectionKeys);
      const next = pairs
        .map(([key, value]) => {
          const date = key.slice(PREFIX.length);
          const answer = (value ?? '').trim();
          return { date, prompt: reflectionPromptForDate(date), answer };
        })
        .filter((e) => e.answer.length > 0)
        // Newest first — ISO 'YYYY-MM-DD' sorts lexicographically by date.
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
      setEntries(next);
    } catch {
      setEntries([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    load().finally(() => {
      if (!active) setLoaded(false);
    });
    return () => {
      active = false;
    };
  }, [load]);

  return { entries, loaded, reload: load };
}
