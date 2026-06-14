/**
 * DTOs for the Daily backend `/v1` API (see backend/docs/API.md). These mirror
 * the JSON the server returns; the app's domain types (DailyItem/ContentEntry)
 * are produced from these by `mappers.ts`.
 */
import type { ContentType } from '@/features/items/types';

export type Tokens = {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
};

export type UserDTO = {
  id: string;
  handle: string | null;
  display_name: string | null;
  email: string | null;
  is_anonymous: boolean;
  primary_provider: 'anonymous' | 'apple' | 'google' | 'email';
  timezone: string;
  locale: string;
  is_admin?: boolean;
  created_at: string;
};

export type AuthBundle = {
  user: UserDTO;
  device: unknown | null;
  tokens: Tokens;
};

export type ScheduleDTO = {
  id: string;
  prompt_id?: string;
  frequency: 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom_days' | 'multiple_daily';
  time_of_day: string; // 'HH:MM'
  timezone: string;
  days_of_week?: number;
  enabled: boolean;
  next_run_at?: string | null;
};

export type PromptDTO = {
  id: string;
  user_id: string;
  type: ContentType;
  intent: string;
  title: string | null;
  tone: string | null;
  status: 'active' | 'paused' | 'archived';
  model_pref: 'auto' | 'haiku' | 'sonnet';
  position: number;
  created_at: string;
  updated_at: string;
  /** Present on list responses (the prompt's primary schedule), null if none. */
  schedule?: Pick<
    ScheduleDTO,
    'id' | 'time_of_day' | 'frequency' | 'timezone' | 'enabled' | 'days_of_week'
  > | null;
};

export type ContentEntryDTO = {
  id: string;
  prompt_id: string;
  user_id: string;
  for_date: string; // 'YYYY-MM-DD'
  variant: number;
  title: string | null;
  body: string | null;
  tone: string | null;
  structured: Record<string, unknown> | null;
  model: string | null;
  status: 'queued' | 'running' | 'ready' | 'failed' | 'refusal';
  created_at: string;
};

export type GenerationJobDTO = {
  id: string;
  status: ContentEntryDTO['status'];
  result_content_id: string | null;
};

export type TemplateDTO = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: ContentType;
  intent_seed: string | null;
  usage_count: number;
};

export type CreatePromptBody = {
  type: ContentType;
  intent: string;
  title?: string;
  tone?: string;
  model_pref?: 'auto' | 'haiku' | 'sonnet';
  frequency?: ScheduleDTO['frequency'];
  /** 7-bit weekday mask (required by the backend when frequency is custom_days). */
  days_of_week?: number;
  time_of_day?: string;
  timezone?: string;
  position?: number;
};
