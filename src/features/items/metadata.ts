/**
 * Display metadata for content types and frequencies. Per master-spec D4,
 * `content_type` is the single MVP taxonomy: it drives Claude generation AND the
 * card's color accent. (The design-system "category" color-dot field is deferred
 * post-MVP, so there is no category metadata here.)
 *
 * Icons are Lucide names matching the rounded set (foundations §7); colors are
 * drawn from the brand ramps and used as each card's leading accent.
 */
import {
  BookOpen,
  GraduationCap,
  type LucideIcon,
  Moon,
  NotebookPen,
  Quote,
  Sprout,
  Sun,
} from 'lucide-react-native';

import { ramp } from '@/theme/tokens';
import type { ContentType } from './types';

export type ContentTypeMeta = {
  key: ContentType;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Card leading-accent color (D4: content_type drives the accent). */
  color: string;
  /** A starter intent prefilled when chosen during onboarding/creation. */
  starterIntent: string;
};

export const contentTypes: ContentTypeMeta[] = [
  {
    key: 'reflection',
    label: 'Reflection',
    description: 'A thoughtful prompt to pause on',
    icon: Moon,
    color: ramp.clay[400],
    starterIntent: 'Give me a short, calming reflection to start the day.',
  },
  {
    key: 'motivation',
    label: 'Motivation',
    description: 'One honest, non-cheesy line',
    icon: Sun,
    color: ramp.amber[500],
    starterIntent: 'Send me one short, grounded motivational line each morning.',
  },
  {
    key: 'habit',
    label: 'Habit nudge',
    description: 'A gentle, fresh reminder',
    icon: Sprout,
    color: ramp.sage[400],
    starterIntent: 'Remind me to stretch, but make it feel different each day.',
  },
  {
    key: 'story',
    label: 'Micro-story',
    description: 'A one-paragraph read',
    icon: BookOpen,
    color: ramp.dusk[400],
    starterIntent: 'Tell me a one-paragraph sci-fi story each night.',
  },
  {
    key: 'journal',
    label: 'Journaling',
    description: 'A prompt to write to',
    icon: NotebookPen,
    color: ramp.clay[500],
    starterIntent: 'Give me a thoughtful journaling prompt each morning.',
  },
  {
    key: 'learning',
    label: 'Learning drip',
    description: 'One small thing to learn',
    icon: GraduationCap,
    color: ramp.dusk[300],
    starterIntent: 'Teach me one Spanish phrase a day with an example.',
  },
  {
    key: 'custom',
    label: 'Custom',
    description: 'Describe your own',
    icon: Quote,
    color: ramp.sand[400],
    starterIntent: '',
  },
];

export const contentTypeByKey: Record<ContentType, ContentTypeMeta> =
  Object.fromEntries(contentTypes.map((t) => [t.key, t])) as Record<
    ContentType,
    ContentTypeMeta
  >;
