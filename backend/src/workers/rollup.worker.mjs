// Rollup worker (BACKEND-SCHEMA-API.md §11 worker 4).
// Recomputes metric_rollups_daily for today (nightly in production via cron;
// here on an interval). Idempotent — upserts by (day, metric, dimensions).
import { rollupDay } from '../services/analytics.service.mjs';
import { childLogger } from '../config/logger.mjs';

const log = childLogger('rollup.worker');

export async function rollupTick() {
  try {
    return await rollupDay();
  } catch (err) {
    log.error({ err }, 'rollup tick failed');
    return null;
  }
}
