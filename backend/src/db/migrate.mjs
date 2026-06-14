// Migration runner. Applies every `*.sql` file in ./migrations in lexical order
// inside a transaction, tracking applied files in `schema_migrations`. Idempotent
// — already-applied files are skipped. Safe to run at boot (the server calls
// runMigrations() before serving) and from the CLI (`npm run migrate`).

import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initPool, query, transaction } from './pool.mjs';
import { childLogger } from '../config/logger.mjs';

const log = childLogger('migrate');
const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, 'migrations');

async function ensureTrackingTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name        text PRIMARY KEY,
      applied_at  timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function appliedSet() {
  const res = await query('SELECT name FROM schema_migrations');
  return new Set(res.rows.map((r) => r.name));
}

/**
 * Split a SQL file into individual statements. pg-mem executes one statement
 * per call, so we strip full-line `--` comments first (otherwise a statement
 * preceded by a comment block would itself begin with `--`), then split on
 * top-level semicolons. Our migrations contain no semicolons inside string
 * literals or function bodies, so this naive split is sufficient.
 */
function splitStatements(sql) {
  const withoutComments = sql
    .split('\n')
    .filter((line) => !/^\s*--/.test(line))
    .join('\n');
  return withoutComments
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length);
}

export async function runMigrations() {
  await initPool();
  await ensureTrackingTable();
  const done = await appliedSet();

  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();
  let applied = 0;

  for (const file of files) {
    if (done.has(file)) continue;
    const sql = await readFile(join(migrationsDir, file), 'utf8');
    const statements = splitStatements(sql);

    await transaction(async (client) => {
      for (const stmt of statements) {
        await client.query(stmt);
      }
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    });

    applied++;
    log.info({ file, statements: statements.length }, 'migration applied');
  }

  if (applied === 0) log.info('database schema up to date');
  else log.info({ applied }, 'migrations complete');
  return applied;
}

// CLI entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      log.error({ err }, 'migration failed');
      process.exit(1);
    });
}
