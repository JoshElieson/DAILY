/**
 * Generation client. Talks ONLY to our backend proxy (never Anthropic directly —
 * the API key never reaches the client, PLANNING.md §3.2/§3.8). In Phase 1
 * (`env.useMocks`) it returns crafted mock content with a realistic delay so
 * loading/error states are exercised end-to-end.
 */
import { isoDate } from '@/lib/date';
import { env } from '@/lib/env';
import { api } from '@/lib/api';
import { contentToEntry } from '@/lib/api/mappers';
import { createId } from '@/lib/id';
import type { ContentEntry, ContentType } from '@/features/items/types';
import { fallbackBody } from './prompts';

export type GenerateArgs = {
  itemId: string;
  type: ContentType;
  intent: string;
  date?: string;
};

const MOCK_DELAY_MS = 700;

/**
 * Mock generator — deterministic-ish content keyed off the date so each day
 * differs, matching the production behaviour where `date` varies the output.
 */
const mockByType: Record<ContentType, (intent: string) => { title: string; body: string; tone: string }> = {
  reflection: () => ({
    title: 'A quiet start',
    body: 'Notice the first thing that asks for your attention this morning. You can meet it slowly.',
    tone: 'reflective',
  }),
  motivation: () => ({
    title: 'Keep going, lightly',
    body: 'You don’t have to do it all today — just the next small, honest thing.',
    tone: 'grounded',
  }),
  habit: (intent) => ({
    title: 'A small moment',
    body: `${intent.replace(/\.$/, '')} — just for a minute. Small and repeatable beats big and rare.`,
    tone: 'warm',
  }),
  story: () => ({
    title: 'Tonight’s page',
    body: 'The lighthouse keeper found a letter in a bottle addressed to no one. She wrote back anyway, and the sea, for once, seemed to listen.',
    tone: 'wistful',
  }),
  journal: () => ({
    title: 'Write to this',
    body: 'What is one thing you’re quietly grateful for today, and who helped make it possible?',
    tone: 'open',
  }),
  learning: () => ({
    title: 'One phrase',
    body: '“Poco a poco” — little by little. Example: Aprendo español poco a poco.',
    tone: 'curious',
  }),
  custom: (intent) => ({
    title: 'For today',
    body: intent
      ? `Here’s a fresh take on “${intent.replace(/\.$/, '')}.” Keep it light and specific to right now.`
      : fallbackBody,
    tone: 'neutral',
  }),
};

async function generateMock(args: GenerateArgs): Promise<ContentEntry> {
  await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));
  const date = args.date ?? isoDate();
  const made = mockByType[args.type](args.intent);
  return {
    id: createId('content'),
    itemId: args.itemId,
    forDate: date,
    variant: 0,
    title: made.title,
    body: made.body,
    tone: made.tone,
    model: 'mock',
    genStatus: 'ready',
    completedAt: null,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Remote generation against the cloud API. `args.itemId` is the server prompt id;
 * `POST /v1/prompts/:id/generate` is idempotent (returns the day's existing
 * content without re-charging), so calling it right after prompt creation is
 * cheap. The Anthropic key stays server-side (PLANNING §3.2/§3.8).
 */
async function generateRemote(args: GenerateArgs): Promise<ContentEntry> {
  const date = args.date ?? isoDate();
  const { content } = await api.generate(args.itemId, date);
  const entry = contentToEntry(content);
  return { ...entry, body: entry.body || fallbackBody };
}

export function generateContent(args: GenerateArgs): Promise<ContentEntry> {
  return env.useMocks ? generateMock(args) : generateRemote(args);
}
