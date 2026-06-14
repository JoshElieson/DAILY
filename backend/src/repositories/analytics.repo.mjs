// analytics_events + analytics_sessions + metric_rollups_daily data access.
import { insertRow, updateById, query, queryOne, parseJson } from './_helpers.mjs';

export const analyticsRepo = {
  insertEvent: (row) =>
    insertRow('analytics_events', {
      user_id: row.user_id ?? null,
      device_id: row.device_id ?? null,
      session_id: row.session_id ?? null,
      event_name: row.event_name,
      properties: row.properties ?? null,
      app_version: row.app_version ?? null,
      platform: row.platform ?? null,
      ts: row.ts ?? new Date(),
    }),

  insertEvents: async (rows) => {
    const out = [];
    for (const r of rows) out.push(await analyticsRepo.insertEvent(r));
    return out;
  },

  startSession: (row) =>
    insertRow('analytics_sessions', {
      user_id: row.user_id ?? null,
      device_id: row.device_id ?? null,
      started_at: row.started_at ?? new Date(),
    }),

  endSession: (id, { duration_s, events_count }) =>
    updateById(
      'analytics_sessions',
      id,
      { ended_at: new Date(), duration_s: duration_s ?? null, events_count: events_count ?? 0 },
      { touch: false },
    ),

  /** Upsert a daily rollup metric (day, metric, dimensions) -> value. */
  async upsertRollup(day, metric, dimensions, value) {
    const dims = JSON.stringify(dimensions ?? {});
    const existing = await queryOne(
      'SELECT * FROM metric_rollups_daily WHERE day = $1 AND metric = $2 AND dimensions = $3',
      [day, metric, dims],
    );
    if (existing) {
      return query(
        'UPDATE metric_rollups_daily SET value = $1, updated_at = now() WHERE day = $2 AND metric = $3 AND dimensions = $4',
        [value, day, metric, dims],
      );
    }
    return insertRow(
      'metric_rollups_daily',
      { day, metric, dimensions: dimensions ?? {}, value },
      { generateId: false },
    );
  },

  rollupsForDay: (day) =>
    query('SELECT * FROM metric_rollups_daily WHERE day = $1', [day]).then((r) =>
      r.rows.map((row) => ({ ...row, dimensions: parseJson(row.dimensions, {}) })),
    ),

  // ── Aggregation queries the rollup job runs over live tables ───────────────
  countEvents: (eventName, day) =>
    queryOne(
      `SELECT count(*)::int AS n FROM analytics_events
       WHERE event_name = $1 AND ts >= $2 AND ts < $3`,
      [eventName, `${day}T00:00:00Z`, `${day}T23:59:59Z`],
    ).then((r) => r.n),

  dailyActiveUsers: (day) =>
    queryOne(
      `SELECT count(DISTINCT user_id)::int AS n FROM analytics_events
       WHERE ts >= $1 AND ts < $2 AND user_id IS NOT NULL`,
      [`${day}T00:00:00Z`, `${day}T23:59:59Z`],
    ).then((r) => r.n),

  generationCostMicros: (day) =>
    queryOne(
      `SELECT coalesce(sum(cost_micros), 0)::bigint AS micros FROM content_entries
       WHERE created_at >= $1 AND created_at < $2`,
      [`${day}T00:00:00Z`, `${day}T23:59:59Z`],
    ).then((r) => Number(r.micros)),

  notificationOpenRate: (day) =>
    queryOne(
      `SELECT
         sum(CASE WHEN status IN ('sent','delivered','opened','dismissed') THEN 1 ELSE 0 END)::int AS sent,
         sum(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END)::int AS opened
       FROM notifications
       WHERE created_at >= $1 AND created_at < $2`,
      [`${day}T00:00:00Z`, `${day}T23:59:59Z`],
    ).then((r) => (r.sent ? r.opened / r.sent : 0)),
};
