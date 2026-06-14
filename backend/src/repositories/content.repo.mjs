// content_entries + generation_jobs data access (Generation cluster).
import { insertRow, updateById, findById, query, queryOne, parseJson, toYmd } from './_helpers.mjs';

function mapEntry(row) {
  if (!row) return row;
  return { ...row, for_date: toYmd(row.for_date), structured: parseJson(row.structured, null) };
}

export const contentRepo = {
  findById: (id) => findById('content_entries', id).then(mapEntry),

  findOwned: (id, userId) =>
    queryOne(
      'SELECT * FROM content_entries WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
      [id, userId],
    ).then(mapEntry),

  /** Primary (variant 0) content for a prompt+date, if any. */
  findPrimary: (promptId, forDate) =>
    queryOne(
      'SELECT * FROM content_entries WHERE prompt_id = $1 AND for_date = $2 AND variant = 0',
      [promptId, forDate],
    ).then(mapEntry),

  /** Highest existing variant number for a (prompt, date). */
  maxVariant: (promptId, forDate) =>
    queryOne(
      'SELECT coalesce(max(variant), -1)::int AS v FROM content_entries WHERE prompt_id = $1 AND for_date = $2',
      [promptId, forDate],
    ).then((r) => r.v),

  /** Today's content across all of a user's active prompts (home payload). */
  todayForUser: (userId, forDate) =>
    query(
      `SELECT c.* FROM content_entries c
       JOIN prompts p ON p.id = c.prompt_id
       WHERE c.user_id = $1 AND c.for_date = $2 AND c.variant = 0
         AND c.deleted_at IS NULL AND p.deleted_at IS NULL
       ORDER BY p.position ASC`,
      [userId, forDate],
    ).then((r) => r.rows.map(mapEntry)),

  history: (promptId, { from, to, limit = 50 } = {}) => {
    const params = [promptId];
    let sql = 'SELECT * FROM content_entries WHERE prompt_id = $1 AND variant = 0 AND deleted_at IS NULL';
    if (from) {
      params.push(from);
      sql += ` AND for_date >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      sql += ` AND for_date <= $${params.length}`;
    }
    params.push(limit);
    sql += ` ORDER BY for_date DESC LIMIT $${params.length}`;
    return query(sql, params).then((r) => r.rows.map(mapEntry));
  },

  create: (row) => insertRow('content_entries', row).then(mapEntry),

  update: (id, patch) => updateById('content_entries', id, patch, { touch: false }).then(mapEntry),

  softDelete: (id) =>
    updateById('content_entries', id, { deleted_at: new Date() }, { touch: false }),
};

export const generationJobsRepo = {
  findById: (id) => findById('generation_jobs', id),

  findOwned: (id, userId) =>
    queryOne('SELECT * FROM generation_jobs WHERE id = $1 AND user_id = $2', [id, userId]),

  findByIdempotencyKey: (key) =>
    queryOne('SELECT * FROM generation_jobs WHERE idempotency_key = $1', [key]),

  create: (row) => insertRow('generation_jobs', row),

  update: (id, patch) => updateById('generation_jobs', id, patch, { touch: false }),

  /** Claim the next queued job (worker pulls these). */
  claimNext: async () => {
    // Two-step claim keeps it portable to pg-mem (no SKIP LOCKED there).
    const job = await queryOne(
      `SELECT * FROM generation_jobs WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1`,
    );
    if (!job) return null;
    const claimed = await queryOne(
      `UPDATE generation_jobs
       SET status = 'running', started_at = now(), attempts = attempts + 1
       WHERE id = $1 AND status = 'queued'
       RETURNING *`,
      [job.id],
    );
    return claimed; // null if another worker won the race
  },
};
