-- 0003 — Premium subscriptions, credits, analytics.
-- Implements BACKEND-SCHEMA-API.md clusters 5 & 6.

-- ── subscriptions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                      uuid PRIMARY KEY,
  user_id                 uuid NOT NULL REFERENCES users(id),
  provider                text NOT NULL
                            CHECK (provider IN ('apple_app_store','google_play','revenuecat','stripe')),
  product_id              text NOT NULL,
  rc_app_user_id          text,
  original_transaction_id text,
  latest_transaction_id   text,
  status                  text NOT NULL
                            CHECK (status IN ('trialing','active','grace_period','on_hold','paused','expired','canceled')),
  is_trial                boolean NOT NULL DEFAULT false,
  auto_renew              boolean NOT NULL DEFAULT true,
  environment             text NOT NULL DEFAULT 'production' CHECK (environment IN ('production','sandbox')),
  started_at              timestamptz,
  current_period_end      timestamptz,
  trial_end               timestamptz,
  canceled_at             timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS subscriptions_original_txn_idx ON subscriptions (original_transaction_id);

-- ── user_entitlements (the gating cache every request reads) ─────────────────
CREATE TABLE IF NOT EXISTS user_entitlements (
  id                   uuid PRIMARY KEY,
  user_id              uuid NOT NULL REFERENCES users(id),
  key                  text NOT NULL CHECK (key IN ('daily_plus')),
  active               boolean NOT NULL DEFAULT false,
  expires_at           timestamptz,
  source_subscription_id uuid REFERENCES subscriptions(id),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS user_entitlements_user_key ON user_entitlements (user_id, key);

-- ── subscription_events (append-only webhook log; idempotent) ────────────────
CREATE TABLE IF NOT EXISTS subscription_events (
  id             uuid PRIMARY KEY,
  user_id        uuid REFERENCES users(id),
  provider       text NOT NULL
                   CHECK (provider IN ('apple_app_store','google_play','revenuecat','stripe')),
  event_type     text NOT NULL,
  store_event_id text NOT NULL,
  raw            jsonb,
  event_at       timestamptz,
  processed_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS subscription_events_store_key ON subscription_events (store_event_id);

-- ── credit_ledger (append-only; powers free-tier metered regenerations) ──────
CREATE TABLE IF NOT EXISTS credit_ledger (
  id             uuid PRIMARY KEY,
  user_id        uuid NOT NULL REFERENCES users(id),
  delta          integer NOT NULL,
  reason         text NOT NULL
                   CHECK (reason IN ('daily_grant','purchase','regenerate_spend','refund','promo')),
  balance_after  integer NOT NULL,
  ref_content_id uuid REFERENCES content_entries(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS credit_ledger_user_idx ON credit_ledger (user_id, created_at);

-- ── analytics_sessions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_sessions (
  id           uuid PRIMARY KEY,
  user_id      uuid REFERENCES users(id),
  device_id    uuid REFERENCES devices(id),
  started_at   timestamptz NOT NULL DEFAULT now(),
  ended_at     timestamptz,
  duration_s   integer,
  events_count integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS analytics_sessions_user_idx ON analytics_sessions (user_id, started_at);

-- ── analytics_events (first-party thin layer; partition-by-day in prod) ──────
CREATE TABLE IF NOT EXISTS analytics_events (
  id          uuid PRIMARY KEY,
  user_id     uuid REFERENCES users(id),
  device_id   uuid REFERENCES devices(id),
  session_id  uuid REFERENCES analytics_sessions(id),
  event_name  text NOT NULL,
  properties  jsonb,
  app_version text,
  platform    text CHECK (platform IS NULL OR platform IN ('ios','android','web')),
  ts          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS analytics_events_user_idx ON analytics_events (user_id, ts);
CREATE INDEX IF NOT EXISTS analytics_events_name_idx ON analytics_events (event_name, ts);

-- ── metric_rollups_daily (nightly aggregation target for dashboards) ─────────
CREATE TABLE IF NOT EXISTS metric_rollups_daily (
  day        date NOT NULL,
  metric     text NOT NULL,
  dimensions jsonb NOT NULL DEFAULT '{}',
  value      numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day, metric, dimensions)
);
