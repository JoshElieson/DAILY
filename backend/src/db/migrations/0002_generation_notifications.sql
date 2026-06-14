-- 0002 — Generated content, generation jobs, notifications.
-- Implements BACKEND-SCHEMA-API.md clusters 3 & 4.

-- ── content_entries ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_entries (
  id               uuid PRIMARY KEY,
  prompt_id        uuid NOT NULL REFERENCES prompts(id),
  user_id          uuid NOT NULL REFERENCES users(id),  -- denormalized for "my content"
  for_date         date NOT NULL,
  variant          integer NOT NULL DEFAULT 0,           -- 0=primary, 1+=regenerations
  title            text,
  body             text,
  tone             text,
  structured       jsonb,                                -- type-specific fields
  model            text,
  status           text NOT NULL DEFAULT 'ready'
                     CHECK (status IN ('queued','running','ready','failed','refusal')),
  input_tokens     integer,
  output_tokens    integer,
  cost_micros      integer,                              -- USD millionths
  gen_latency_ms   integer,
  regenerated_from uuid REFERENCES content_entries(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS content_entries_unique_variant
  ON content_entries (prompt_id, for_date, variant);
CREATE INDEX IF NOT EXISTS content_entries_prompt_date_idx ON content_entries (prompt_id, for_date);
CREATE INDEX IF NOT EXISTS content_entries_user_date_idx ON content_entries (user_id, for_date);

-- ── generation_jobs (async server-side generation) ───────────────────────────
CREATE TABLE IF NOT EXISTS generation_jobs (
  id                uuid PRIMARY KEY,
  prompt_id         uuid NOT NULL REFERENCES prompts(id),
  user_id           uuid NOT NULL REFERENCES users(id),
  for_date          date NOT NULL,
  variant           integer NOT NULL DEFAULT 0,
  idempotency_key   text NOT NULL,                       -- (prompt_id,for_date,variant) dedupe
  status            text NOT NULL DEFAULT 'queued'
                      CHECK (status IN ('queued','running','ready','failed','refusal')),
  attempts          integer NOT NULL DEFAULT 0,
  error             text,
  result_content_id uuid REFERENCES content_entries(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  started_at        timestamptz,
  completed_at      timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS generation_jobs_idem_key ON generation_jobs (idempotency_key);
CREATE INDEX IF NOT EXISTS generation_jobs_status_idx ON generation_jobs (status, created_at);

-- ── notifications (local + push delivery tracking) ───────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id                  uuid PRIMARY KEY,
  user_id             uuid NOT NULL REFERENCES users(id),
  prompt_id           uuid NOT NULL REFERENCES prompts(id),
  content_entry_id    uuid REFERENCES content_entries(id),
  device_id           uuid REFERENCES devices(id),
  schedule_id         uuid REFERENCES schedules(id),
  channel             text NOT NULL DEFAULT 'local' CHECK (channel IN ('local','push')),
  status              text NOT NULL DEFAULT 'scheduled'
                        CHECK (status IN ('scheduled','sent','delivered','opened','dismissed','failed','canceled')),
  scheduled_for       timestamptz NOT NULL,
  provider_message_id text,                              -- Expo ticket id
  provider_receipt_id text,                              -- Expo receipt id
  local_os_id         text,                              -- expo-notifications id (cancel/reschedule)
  error               text,
  sent_at             timestamptz,
  delivered_at        timestamptz,
  opened_at           timestamptz,
  dismissed_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_scheduled_idx ON notifications (scheduled_for);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, created_at);
CREATE INDEX IF NOT EXISTS notifications_receipt_idx ON notifications (provider_receipt_id);
