// prompts + prompt_templates + schedules data access (Prompts cluster).
import { insertRow, updateById, findById, query, queryOne } from './_helpers.mjs';

export const promptsRepo = {
  findById: (id) =>
    queryOne('SELECT * FROM prompts WHERE id = $1 AND deleted_at IS NULL', [id]),

  /** Tenancy-scoped fetch — services use this to enforce ownership. */
  findOwned: (id, userId) =>
    queryOne('SELECT * FROM prompts WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL', [
      id,
      userId,
    ]),

  listByUser: (userId, { status } = {}) => {
    const params = [userId];
    let sql = 'SELECT * FROM prompts WHERE user_id = $1 AND deleted_at IS NULL';
    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }
    sql += ' ORDER BY position ASC, created_at DESC';
    return query(sql, params).then((r) => r.rows);
  },

  countActive: (userId) =>
    queryOne(
      `SELECT count(*)::int AS n FROM prompts
       WHERE user_id = $1 AND status IN ('active','paused') AND deleted_at IS NULL`,
      [userId],
    ).then((r) => r.n),

  create: (row) => insertRow('prompts', row),

  update: (id, patch) => updateById('prompts', id, patch),

  softDelete: (id) => updateById('prompts', id, { deleted_at: new Date(), status: 'archived' }),

  setStatus: (id, status) => updateById('prompts', id, { status }),
};

export const templatesRepo = {
  findById: (id) => findById('prompt_templates', id),

  findBySlug: (slug) => queryOne('SELECT * FROM prompt_templates WHERE slug = $1', [slug]),

  list: ({ type, sort = 'popular', limit = 50 } = {}) => {
    const params = [];
    let sql = "SELECT * FROM prompt_templates WHERE visibility = 'public'";
    if (type) {
      params.push(type);
      sql += ` AND type = $${params.length}`;
    }
    sql += sort === 'popular' ? ' ORDER BY usage_count DESC' : ' ORDER BY created_at DESC';
    params.push(limit);
    sql += ` LIMIT $${params.length}`;
    return query(sql, params).then((r) => r.rows);
  },

  create: (row) => insertRow('prompt_templates', row),

  incrementUsage: (id) =>
    query('UPDATE prompt_templates SET usage_count = usage_count + 1, updated_at = now() WHERE id = $1', [
      id,
    ]),
};

export const schedulesRepo = {
  findById: (id) => findById('schedules', id),

  findOwned: (id, userId) =>
    queryOne('SELECT * FROM schedules WHERE id = $1 AND user_id = $2', [id, userId]),

  listByPrompt: (promptId) =>
    query('SELECT * FROM schedules WHERE prompt_id = $1 ORDER BY time_of_day ASC', [promptId]).then(
      (r) => r.rows,
    ),

  /** Schedules for many prompts at once (avoids N+1 when enriching a list). */
  listByPromptIds: (promptIds) => {
    if (!promptIds.length) return Promise.resolve([]);
    const placeholders = promptIds.map((_, i) => `$${i + 1}`).join(', ');
    return query(
      `SELECT * FROM schedules WHERE prompt_id IN (${placeholders}) ORDER BY time_of_day ASC`,
      promptIds,
    ).then((r) => r.rows);
  },

  create: (row) => insertRow('schedules', row),

  update: (id, patch) => updateById('schedules', id, patch),

  remove: (id) => query('DELETE FROM schedules WHERE id = $1', [id]),

  setEnabledForPrompt: (promptId, enabled) =>
    query('UPDATE schedules SET enabled = $1, updated_at = now() WHERE prompt_id = $2', [
      enabled,
      promptId,
    ]),

  /** The scheduler heartbeat: schedules due to fire within `lead` ms. */
  due: (beforeIso, limit = 200) =>
    query(
      `SELECT s.* FROM schedules s
       JOIN prompts p ON p.id = s.prompt_id
       WHERE s.enabled = true
         AND s.next_run_at IS NOT NULL
         AND s.next_run_at <= $1
         AND p.status = 'active'
         AND p.deleted_at IS NULL
       ORDER BY s.next_run_at ASC
       LIMIT $2`,
      [beforeIso, limit],
    ).then((r) => r.rows),
};
