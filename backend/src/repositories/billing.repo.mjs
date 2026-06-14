// subscriptions + user_entitlements + subscription_events + credit_ledger
// data access (Premium cluster).
import { insertRow, updateById, query, queryOne, parseJson } from './_helpers.mjs';

export const subscriptionsRepo = {
  listByUser: (userId) =>
    query('SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC', [userId]).then(
      (r) => r.rows,
    ),

  findByOriginalTxn: (txnId) =>
    queryOne('SELECT * FROM subscriptions WHERE original_transaction_id = $1', [txnId]),

  create: (row) => insertRow('subscriptions', row),

  update: (id, patch) => updateById('subscriptions', id, patch),

  /** Upsert keyed on original_transaction_id (stable across renewals). */
  async upsertByOriginalTxn(userId, row) {
    const existing = row.original_transaction_id
      ? await this.findByOriginalTxn(row.original_transaction_id)
      : null;
    if (existing) return updateById('subscriptions', existing.id, row);
    return insertRow('subscriptions', { user_id: userId, ...row });
  },
};

export const entitlementsRepo = {
  findActive: (userId, key = 'daily_plus') =>
    queryOne('SELECT * FROM user_entitlements WHERE user_id = $1 AND key = $2', [userId, key]),

  listByUser: (userId) =>
    query('SELECT * FROM user_entitlements WHERE user_id = $1', [userId]).then((r) => r.rows),

  /** Upsert the gating cache (one row per user+key). */
  async upsert(userId, { key, active, expires_at, source_subscription_id }) {
    const existing = await this.findActive(userId, key);
    if (existing) {
      return updateById(
        'user_entitlements',
        existing.id,
        { active, expires_at: expires_at ?? null, source_subscription_id: source_subscription_id ?? null },
        { touch: true },
      );
    }
    return insertRow('user_entitlements', {
      user_id: userId,
      key,
      active,
      expires_at: expires_at ?? null,
      source_subscription_id: source_subscription_id ?? null,
    });
  },

  /** True iff daily_plus is active and unexpired. */
  async hasDailyPlus(userId) {
    const e = await this.findActive(userId, 'daily_plus');
    if (!e || !e.active) return false;
    if (e.expires_at && new Date(e.expires_at) < new Date()) return false;
    return true;
  },
};

export const subscriptionEventsRepo = {
  /** Insert idempotently by store_event_id. Returns { event, duplicate }. */
  async record(row) {
    const existing = await queryOne(
      'SELECT * FROM subscription_events WHERE store_event_id = $1',
      [row.store_event_id],
    );
    if (existing) return { event: existing, duplicate: true };
    const event = await insertRow('subscription_events', {
      ...row,
      raw: row.raw ?? null,
    });
    return { event, duplicate: false };
  },

  markProcessed: (id) =>
    updateById('subscription_events', id, { processed_at: new Date() }, { touch: false }),

  unprocessed: (limit = 100) =>
    query(
      'SELECT * FROM subscription_events WHERE processed_at IS NULL ORDER BY created_at ASC LIMIT $1',
      [limit],
    ).then((r) => r.rows.map((e) => ({ ...e, raw: parseJson(e.raw, {}) }))),
};

export const creditLedgerRepo = {
  /** Current balance = balance_after of the most recent ledger row (0 if none). */
  balance: (userId) =>
    queryOne(
      'SELECT balance_after FROM credit_ledger WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId],
    ).then((r) => r?.balance_after ?? 0),

  listByUser: (userId, { limit = 50 } = {}) =>
    query('SELECT * FROM credit_ledger WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2', [
      userId,
      limit,
    ]).then((r) => r.rows),

  /** Append a ledger entry, computing balance_after from the prior balance. */
  async append(userId, { delta, reason, ref_content_id = null }) {
    const current = await this.balance(userId);
    const balance_after = current + delta;
    return insertRow('credit_ledger', {
      user_id: userId,
      delta,
      reason,
      balance_after,
      ref_content_id,
    });
  },

  /** Has the user already received today's daily grant? */
  grantedOn: (userId, dateStr) =>
    queryOne(
      `SELECT id FROM credit_ledger
       WHERE user_id = $1 AND reason = 'daily_grant'
         AND created_at >= $2 AND created_at < $3`,
      [userId, `${dateStr}T00:00:00Z`, `${dateStr}T23:59:59Z`],
    ),
};
