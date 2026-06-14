-- Production-only DDL enhancements (NOT applied by the auto-migrator, which must
-- stay portable to the pg-mem in-memory mock). Apply these manually against a
-- real PostgreSQL 16+ instance:
--
--   psql "$DATABASE_URL" -f src/db/production-extras.sql
--
-- They are separated because pg-mem does not support partial indexes, table
-- partitioning, or row-level security. The repository layer already enforces
-- tenancy in every query (WHERE user_id = $current), so RLS here is
-- defense-in-depth, not the sole guard.

-- ── Partial indexes (match BACKEND-SCHEMA-API.md §3–8 exactly) ───────────────
CREATE UNIQUE INDEX IF NOT EXISTS users_handle_partial
  ON users (handle) WHERE handle IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_partial
  ON users (email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS devices_push_partial
  ON devices (expo_push_token) WHERE push_enabled;
CREATE INDEX IF NOT EXISTS prompts_active_partial
  ON prompts (user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS schedules_next_run_enabled
  ON schedules (next_run_at) WHERE enabled;
CREATE INDEX IF NOT EXISTS content_user_live
  ON content_entries (user_id, for_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS gen_jobs_pending
  ON generation_jobs (status, created_at) WHERE status IN ('queued','running');
CREATE INDEX IF NOT EXISTS notif_scheduled_partial
  ON notifications (scheduled_for) WHERE status = 'scheduled';

-- ── Row-Level Security (multi-tenancy) ───────────────────────────────────────
-- The app sets `app.user_id` per request (see middleware/requestContext.mjs,
-- which on real Postgres issues `SET LOCAL app.user_id = ...`).
ALTER TABLE prompts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_ledger    ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_prompts ON prompts
  USING (user_id = current_setting('app.user_id', true)::uuid);
CREATE POLICY tenant_isolation_schedules ON schedules
  USING (user_id = current_setting('app.user_id', true)::uuid);
CREATE POLICY tenant_isolation_content ON content_entries
  USING (user_id = current_setting('app.user_id', true)::uuid);
CREATE POLICY tenant_isolation_notifications ON notifications
  USING (user_id = current_setting('app.user_id', true)::uuid);
CREATE POLICY tenant_isolation_devices ON devices
  USING (user_id = current_setting('app.user_id', true)::uuid);
CREATE POLICY tenant_isolation_credits ON credit_ledger
  USING (user_id = current_setting('app.user_id', true)::uuid);

-- ── Partitioning (high-volume, time-queried tables) ──────────────────────────
-- Convert to declarative monthly/daily partitioning once volume warrants it:
--   analytics_events  → PARTITION BY RANGE (ts)         -- daily, short retention
--   notifications     → PARTITION BY RANGE (scheduled_for) -- monthly
--   content_entries   → PARTITION BY RANGE (for_date)   -- monthly
-- See §11 "Scaling levers". Left as comments to avoid a disruptive table rewrite
-- before it's needed.
