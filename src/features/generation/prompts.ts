/**
 * Client-side knowledge of the generation contract. The authoritative system
 * prompt lives server-side and is prompt-cached (PLANNING.md §4.2); this file
 * only documents the per-type framing and the request/response shapes the app
 * exchanges with the proxy, plus calm fallback copy for refusals/errors.
 */
import type { ContentType } from '@/features/items/types';

export type GenerateRequest = {
  type: ContentType;
  intent: string;
  date: string; // YYYY-MM-DD
  tz: string;
};

export type GenerateResponse = {
  content: {
    title?: string;
    body: string;
    tone?: string;
    structured?: Record<string, unknown>;
  };
  meta?: { model?: string; input_tokens?: number; output_tokens?: number };
};

/** Friendly fallback when the model refuses or generation fails (PLANNING §4.4). */
export const fallbackBody =
  'Take a slow breath. Today is yours to meet one moment at a time.';

export const typeFraming: Record<ContentType, string> = {
  reflection: 'A short reflection to pause on.',
  motivation: 'One honest, grounded line of encouragement.',
  habit: 'A gentle, fresh nudge toward the habit.',
  story: 'A self-contained one-paragraph micro-story.',
  journal: 'A single open journaling prompt.',
  learning: 'One small thing to learn, with a quick example.',
  custom: 'Content matching the user’s described intent.',
};
