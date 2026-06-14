// Shared repository helpers: parameterized INSERT/UPDATE builders and JSON
// coercion. Keeps repositories terse while guaranteeing every value is bound as
// a placeholder ($1,$2,...) — never string-interpolated — so SQL injection is
// structurally impossible.

import { uuidv7 } from '../lib/uuid.mjs';
import { query, queryOne } from '../db/pool.mjs';

/** Build and run an INSERT ... RETURNING *. Generates a UUID v7 id if absent. */
export async function insertRow(table, row, { generateId = true } = {}) {
  const data = { ...row };
  if (generateId && data.id === undefined) data.id = uuidv7();

  const cols = Object.keys(data);
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  const values = cols.map((c) => normalize(data[c]));

  const sql = `INSERT INTO ${table} (${cols.join(', ')})
               VALUES (${placeholders.join(', ')})
               RETURNING *`;
  return queryOne(sql, values);
}

/** Build and run an UPDATE ... WHERE id = $n RETURNING *. Always bumps updated_at if the column exists. */
export async function updateById(table, id, patch, { touch = true } = {}) {
  const data = { ...patch };
  delete data.id;
  const cols = Object.keys(data);
  if (cols.length === 0) return findById(table, id);

  const sets = cols.map((c, i) => `${c} = $${i + 1}`);
  const values = cols.map((c) => normalize(data[c]));
  if (touch) sets.push('updated_at = now()');
  values.push(id);

  const sql = `UPDATE ${table} SET ${sets.join(', ')}
               WHERE id = $${values.length}
               RETURNING *`;
  return queryOne(sql, values);
}

export async function findById(table, id) {
  return queryOne(`SELECT * FROM ${table} WHERE id = $1`, [id]);
}

/** Normalize a JS value for binding. Plain objects/arrays → JSON text for jsonb. */
function normalize(v) {
  if (v === undefined) return null;
  if (v !== null && typeof v === 'object' && !(v instanceof Date) && !Buffer.isBuffer(v)) {
    return JSON.stringify(v);
  }
  return v;
}

/**
 * Normalize a SQL `date` value to a 'YYYY-MM-DD' string. Both pg-mem and
 * node-pg hand back a JS Date for `date` columns, which JSON-serializes to a
 * full ISO timestamp — clients key on the calendar date, so coerce it here.
 * Uses UTC components to avoid an off-by-one when the value is UTC midnight.
 */
export function toYmd(v) {
  if (v == null) return v;
  if (typeof v === 'string') return v.slice(0, 10);
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toISOString().slice(0, 10);
}

/** Coerce a jsonb column that may come back as a string (pg-mem) or object (pg). */
export function parseJson(v, fallback = null) {
  if (v == null) return fallback;
  if (typeof v === 'object') return v;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

export { query, queryOne };
