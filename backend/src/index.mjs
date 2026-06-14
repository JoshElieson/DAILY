// Process entrypoint: validate env (on import of config/env), connect the DB,
// run migrations, seed starter templates (mock-DB only), build the HTTP app,
// start background workers, and install graceful-shutdown handlers.

import { env, capabilitySummary } from './config/env.mjs';
import { logger } from './config/logger.mjs';
import { initPool, closePool } from './db/pool.mjs';
import { runMigrations } from './db/migrate.mjs';
import { seedTemplates } from './db/seed.mjs';
import { createApp } from './server.mjs';
import { startWorkers, stopWorkers } from './workers/index.mjs';

async function main() {
  logger.info({ env: env.NODE_ENV, capabilities: capabilitySummary() }, 'starting daily-backend');

  await initPool();
  await runMigrations();
  // Seed starter templates automatically when running on the ephemeral mock DB
  // so a fresh boot has a usable catalog. On a real DB, run `npm run seed` once.
  if (env.flags.usingMockDb) await seedTemplates();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, `listening on :${env.PORT}`);
  });

  startWorkers();

  const shutdown = async (signal) => {
    logger.info({ signal }, 'shutting down');
    stopWorkers();
    server.close(async () => {
      await closePool();
      logger.info('shutdown complete');
      process.exit(0);
    });
    // Force-exit if connections linger.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => logger.error({ reason }, 'unhandledRejection'));
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaughtException');
    process.exit(1);
  });
}

main().catch((err) => {
  logger.fatal({ err }, 'failed to start');
  process.exit(1);
});
