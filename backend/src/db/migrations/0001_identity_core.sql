-- 0001 — Identity, Prompts, Templates, Schedules.
-- Implements BACKEND-SCHEMA-API.md clusters 1 & 2.
--
-- Portability note: enumerated types from the spec (§2) are modeled as
-- `text` + CHECK constraints rather than Postgres ENUMs. This keeps the same
-- migrations runnable on the in-memory pg-mem mock used for dev/test, and lets
-- new values be added without `ALTER TYPE`. Primary keys are app-generated
-- UUID v7 (lib/uuid.mjs).

-- ── users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id               uuid PRIMARY KEY,
  handle           text,
  display_name     text,
  email            text,
  is_anonymous     boolean NOT NULL DEFAULT true,
  primary_provider text NOT NULL DEFAULT 'anonymous'
                     CHECK (primary_provider IN ('anonymous','apple','google','email')),
  timezone         text NOT NULL DEFAULT 'UTC',
  locale           text NOT NULL DEFAULT 'en-US',
  status           text NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','suspended','deleted')),
  is_admin         boolean NOT NULL DEFAULT false,
  claimed_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS users_handle_key ON users (handle);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (email);

-- ── devices ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devices (
  id              uuid PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES users(id),
  platform        text NOT NULL CHECK (platform IN ('ios','android','web')),
  install_id      text NOT NULL,
  expo_push_token text,
  push_enabled    boolean NOT NULL DEFAULT false,
  app_version     text,
  os_version      text,
  last_seen_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS devices_install_key ON devices (user_id, install_id);
CREATE INDEX IF NOT EXISTS devices_user_idx ON devices (user_id);
CREATE INDEX IF NOT EXISTS devices_push_token_idx ON devices (expo_push_token);

-- ── auth_identities ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth_identities (
  id               uuid PRIMARY KEY,
  user_id          uuid NOT NULL REFERENCES users(id),
  provider         text NOT NULL CHECK (provider IN ('anonymous','apple','google','email')),
  provider_subject text NOT NULL,
  email            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS auth_identities_provider_subject_key
  ON auth_identities (provider, provider_subject);

-- ── auth_sessions (refresh-token rotation / revocation) ──────────────────────
CREATE TABLE IF NOT EXISTS auth_sessions (
  id           uuid PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES users(id),
  device_id    uuid REFERENCES devices(id),
  refresh_hash text NOT NULL,
  expires_at   timestamptz NOT NULL,
  revoked_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS auth_sessions_refresh_key ON auth_sessions (refresh_hash);

-- ── prompt_templates ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prompt_templates (
  id          uuid PRIMARY KEY,
  slug        text NOT NULL,
  title       text NOT NULL,
  description text,
  type        text NOT NULL
                CHECK (type IN ('reflection','motivation','habit','story','journal','learning','custom')),
  intent_seed text,
  is_official boolean NOT NULL DEFAULT false,
  created_by  uuid REFERENCES users(id),
  visibility  text NOT NULL DEFAULT 'public'
                CHECK (visibility IN ('private','unlisted','followers','public')),
  usage_count integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS prompt_templates_slug_key ON prompt_templates (slug);
CREATE INDEX IF NOT EXISTS prompt_templates_popular_idx ON prompt_templates (visibility, usage_count);

-- ── prompts (the recurring "daily item") ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS prompts (
  id          uuid PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id),
  template_id uuid REFERENCES prompt_templates(id),
  type        text NOT NULL
                CHECK (type IN ('reflection','motivation','habit','story','journal','learning','custom')),
  intent      text NOT NULL,
  title       text,
  tone        text,
  status      text NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','paused','archived')),
  model_pref  text NOT NULL DEFAULT 'auto' CHECK (model_pref IN ('auto','haiku','sonnet')),
  position    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);
CREATE INDEX IF NOT EXISTS prompts_user_status_idx ON prompts (user_id, status);
CREATE INDEX IF NOT EXISTS prompts_template_idx ON prompts (template_id);

-- ── schedules (next_run_at is the scheduler heartbeat) ───────────────────────
CREATE TABLE IF NOT EXISTS schedules (
  id           uuid PRIMARY KEY,
  prompt_id    uuid NOT NULL REFERENCES prompts(id),
  user_id      uuid NOT NULL REFERENCES users(id),
  frequency    text NOT NULL
                 CHECK (frequency IN ('daily','weekdays','weekends','weekly','custom_days','multiple_daily')),
  time_of_day  text NOT NULL,
  timezone     text NOT NULL DEFAULT 'UTC',
  days_of_week integer NOT NULL DEFAULT 127,
  start_date   date,
  end_date     date,
  next_run_at  timestamptz,
  enabled      boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS schedules_prompt_idx ON schedules (prompt_id);
CREATE INDEX IF NOT EXISTS schedules_next_run_idx ON schedules (next_run_at);
