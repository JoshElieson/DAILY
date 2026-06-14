// Seed starter prompt templates (the curated onboarding library, PLANNING §0).
// Idempotent: upserts by slug. Runs automatically at boot in mock-DB mode and
// can be run manually with `npm run seed`.

import { initPool } from './pool.mjs';
import { runMigrations } from './migrate.mjs';
import { templatesRepo } from '../repositories/prompts.repo.mjs';
import { childLogger } from '../config/logger.mjs';

const log = childLogger('seed');

const STARTERS = [
  {
    slug: 'morning-reflection',
    title: 'Morning Reflection',
    description: 'A thoughtful prompt to start the day grounded.',
    type: 'reflection',
    intent_seed: 'Give me a thoughtful journaling prompt each morning.',
  },
  {
    slug: 'daily-motivation',
    title: 'Daily Motivation',
    description: 'One short, non-cheesy line to get moving.',
    type: 'motivation',
    intent_seed: 'Send me one short, non-cheesy motivational line at 7am.',
  },
  {
    slug: 'stretch-nudge',
    title: 'Stretch Nudge',
    description: 'A fresh reminder to move your body.',
    type: 'habit',
    intent_seed: 'Remind me to stretch, but make it feel different each day.',
  },
  {
    slug: 'bedtime-microstory',
    title: 'Bedtime Micro-Story',
    description: 'A one-paragraph story each night.',
    type: 'story',
    intent_seed: 'Tell me a 1-paragraph sci-fi story each night.',
  },
  {
    slug: 'spanish-phrase',
    title: 'A Phrase a Day (Spanish)',
    description: 'Learn one Spanish phrase daily with an example.',
    type: 'learning',
    intent_seed: 'Teach me one Spanish phrase a day with an example.',
  },
  {
    slug: 'gratitude-journal',
    title: 'Gratitude Journal',
    description: 'A daily gratitude prompt.',
    type: 'journal',
    intent_seed: 'Give me a specific gratitude prompt each evening.',
  },
];

export async function seedTemplates() {
  let created = 0;
  for (const s of STARTERS) {
    const existing = await templatesRepo.findBySlug(s.slug);
    if (existing) continue;
    await templatesRepo.create({ ...s, is_official: true, created_by: null, visibility: 'public', usage_count: 0 });
    created++;
  }
  log.info({ created, total: STARTERS.length }, 'starter templates seeded');
  return created;
}

// CLI entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    await initPool();
    await runMigrations();
    await seedTemplates();
    process.exit(0);
  })().catch((err) => {
    log.error({ err }, 'seed failed');
    process.exit(1);
  });
}
