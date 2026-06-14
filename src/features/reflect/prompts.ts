/**
 * Evergreen reflection prompts. One is surfaced per day, chosen deterministically
 * from the date so it's stable through the day and rotates over time. These are
 * app chrome (a gentle question to sit with) — NOT user-created content, so they
 * don't count as "default prompts" in the Daily/items sense.
 */
import { isoDate } from '@/lib/date';

export const reflectionPrompts = [
  'What is one small thing you’re grateful for today?',
  'What felt good today, however small?',
  'What is asking for your attention right now?',
  'When did you feel most like yourself today?',
  'What would make tomorrow feel a little lighter?',
  'What did you give yourself permission to let go of?',
  'Who or what made today easier to carry?',
  'What is one thing you handled better than you expected?',
];

/** Stable day index for a 'YYYY-MM-DD' date. */
function dayNumber(date: string): number {
  return Math.floor(new Date(`${date}T00:00:00`).getTime() / 86_400_000);
}

export function reflectionPromptForDate(date: string = isoDate()): string {
  const len = reflectionPrompts.length;
  const n = dayNumber(date);
  return reflectionPrompts[((n % len) + len) % len];
}
