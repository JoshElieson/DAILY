import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { isoDate } from '@/lib/date';

const key = (date: string) => `daily.reflection.${date}`;

/**
 * One reflection may be saved per day. Once a non-empty reflection is committed
 * (now or on a previous visit) `committed` stays true for that date and further
 * commits are rejected — the note becomes a finalized, read-only entry.
 */
export function useReflectionNote(date: string = isoDate()) {
  const [note, setNote] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [committed, setCommitted] = useState(false);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    AsyncStorage.getItem(key(date))
      .then((v) => {
        if (!active) return;
        const value = v ?? '';
        setNote(value);
        setCommitted(value.trim().length > 0);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [date]);

  /**
   * Persist today's reflection. Returns true if the save was accepted, false if
   * it was a no-op (empty text, or a reflection was already saved today).
   */
  const commit = useCallback(
    (text: string): boolean => {
      if (committed) return false;
      const trimmed = text.trim();
      if (!trimmed) return false;
      setNote(text);
      setCommitted(true);
      AsyncStorage.setItem(key(date), text).catch(() => {});
      return true;
    },
    [committed, date],
  );

  return { note, loaded, committed, commit };
}
