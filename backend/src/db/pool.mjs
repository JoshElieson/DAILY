// Database connection pool.
//
// Single data-access seam used by every repository. When DATABASE_URL is set we
// use the real `pg` Pool; otherwise we boot an in-memory Postgres via `pg-mem`
// (dev/test only) so the whole backend runs with zero external services. Both
// paths expose the same `{ query, getClient, transaction }` surface, so the
// repository layer never knows which is active.

import { env } from '../config/env.mjs';
import { childLogger } from '../config/logger.mjs';

const log = childLogger('db');

let pool;
let memDb = null; // pg-mem IMemoryDb handle, retained for diagnostics

async function createRealPool() {
  const pg = await import('pg');
  const Pool = pg.default?.Pool ?? pg.Pool;
  // Return `date` (OID 1082) as the raw 'YYYY-MM-DD' string instead of a JS Date
  // at local midnight (avoids a tz off-by-one on serialization).
  const types = pg.default?.types ?? pg.types;
  types?.setTypeParser?.(1082, (v) => v);
  const p = new Pool({
    connectionString: env.DATABASE_URL,
    max: env.DB_POOL_MAX,
    ssl: env.DB_SSL ? { rejectUnauthorized: false } : undefined,
  });
  p.on('error', (err) => log.error({ err }, 'idle pg client error'));
  return p;
}

async function createMemPool() {
  const { newDb } = await import('pg-mem');
  memDb = newDb({ autoCreateForeignKeyIndices: true });

  // Provide functions some queries rely on that pg-mem doesn't ship by default.
  memDb.public.registerFunction({
    name: 'now',
    returns: 'timestamptz',
    implementation: () => new Date(),
    impure: true,
  });

  const adapter = memDb.adapters.createPg();
  const p = new adapter.Pool();
  log.warn('DATABASE_URL not set — using in-memory pg-mem database (dev/test only, non-persistent)');
  return p;
}

export async function initPool() {
  if (pool) return pool;
  pool = env.flags.usingMockDb ? await createMemPool() : await createRealPool();
  return pool;
}

function ensurePool() {
  if (!pool) throw new Error('Database pool not initialized — call initPool() first');
  return pool;
}

/** Run a parameterized query. Always use placeholders ($1,$2) — never interpolate. */
export async function query(text, params = []) {
  const p = ensurePool();
  const started = Date.now();
  try {
    const res = await p.query(text, params);
    const ms = Date.now() - started;
    if (ms > 200) log.warn({ ms, sql: text.slice(0, 80) }, 'slow query');
    return res;
  } catch (err) {
    log.error({ err, sql: text.slice(0, 120) }, 'query failed');
    throw err;
  }
}

/** Convenience: first row or null. */
export async function queryOne(text, params = []) {
  const res = await query(text, params);
  return res.rows[0] ?? null;
}

/** Borrow a client for multi-statement work (caller must release). */
export async function getClient() {
  return ensurePool().connect();
}

/**
 * Run `fn` inside a transaction. The callback receives a client whose `.query`
 * is bound; commits on success, rolls back on throw.
 */
export async function transaction(fn) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore rollback failure */
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

/** Liveness probe used by /healthz. */
export async function pingDb() {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
