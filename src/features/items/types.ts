/**
 * Daily-item domain types. Mirrors the binding local SQLite schema in
 * docs/master-spec.md §4.1 (daily_item / content_entry) so it ports 1:1 to the
 * cloud Postgres schema (§4.2) by adding a `user_id` later.
 *
 * Canonical vocabulary (master-spec §3, §12): the entity is a **Daily**
 * (`daily_item`); "reminder" means only the OS notification; `intent` is the
 * user's free-text request and doubles as the card title source AND the Claude
 * prompt. Per D4, `content_type` is the single MVP taxonomy and drives both
 * generation and the card's color accent (category is deferred post-MVP).
 */

export type ContentType =
  | 'reflection'
  | 'motivation'
  | 'habit'
  | 'story'
  | 'journal'
  | 'learning'
  | 'custom';

/**
 * Repeat cadence. `daily` (all 7 days) and `weekdays` (Mon–Fri) are presets whose
 * day-sets are implied; `custom` carries an explicit `daysOfWeek` on the Daily.
 * (weekly | multiple_daily remain post-MVP.)
 */
export type Frequency = 'daily' | 'weekdays' | 'custom';

export type ItemStatus = 'active' | 'paused';

export type GenStatus = 'ready' | 'failed' | 'refusal';

/** A Daily: one recurring intent the user created. */
export type DailyItem = {
  id: string;
  type: ContentType;
  /** User free-text (<=500 chars); card title source + Claude prompt. */
  intent: string;
  /** Optional short label (defaults to a truncation of intent). */
  title?: string;
  /** Optional tone hint — 'warmer'|'drier'|'funnier' (post-MVP UI; column now). */
  tone?: string;
  /** 'HH:MM' local 24h wall-clock. */
  timeOfDay: string;
  frequency: Frequency;
  /**
   * Selected weekdays (0=Sun … 6=Sat) when `frequency === 'custom'`. Omitted for
   * `daily`/`weekdays`, whose day-sets are implied (see features/items/schedule).
   */
  daysOfWeek?: number[];
  status: ItemStatus;
  /** Whether a local notification is scheduled for this Daily. */
  reminderOn: boolean;
  /** Manual home sort. */
  position: number;
  createdAt: string;
  updatedAt: string;
};

/** Generated content: one canonical row per (Daily, date, variant). */
export type ContentEntry = {
  id: string;
  itemId: string;
  /** 'YYYY-MM-DD' (the Daily's local date). */
  forDate: string;
  /** 0 = primary; 1+ = regenerations (post-MVP). */
  variant: number;
  title?: string;
  body: string;
  tone?: string;
  /** JSON string for type-specific fields (learning: {phrase,translation,example}). */
  structured?: string;
  model?: string;
  genStatus: GenStatus;
  /** D3: null until the user marks done / engages with today's content. */
  completedAt?: string | null;
  createdAt: string;
};

export type NewItemInput = Omit<
  DailyItem,
  'id' | 'createdAt' | 'updatedAt' | 'status' | 'position'
> & {
  status?: ItemStatus;
  position?: number;
};
