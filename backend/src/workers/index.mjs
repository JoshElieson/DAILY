// Background worker supervisor. Runs the four workers on independent intervals
// (BACKEND-SCHEMA-API.md §11). In production these would be separate processes
// or a real queue (BullMQ/pg-boss); for the MVP/self-contained build they run
// in-process as guarded setInterval loops with overlap protection.

import { env } from '../config/env.mjs';
import { childLogger } from '../config/logger.mjs';
import { generationTick } from './generation.worker.mjs';
import { notificationTick } from './notification.worker.mjs';
import { entitlementTick } from './entitlement.worker.mjs';
import { rollupTick } from './rollup.worker.mjs';

const log = childLogger('workers');
const timers = [];

/** Wrap a tick so overlapping runs can't pile up and errors never crash the loop. */
function loop(name, fn, intervalMs) {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await fn();
    } catch (err) {
      log.error({ err, worker: name }, 'worker tick threw');
    } finally {
      running = false;
    }
  };
  const t = setInterval(tick, intervalMs);
  if (t.unref) t.unref(); // don't keep the process alive solely for workers
  timers.push(t);
  log.info({ worker: name, intervalMs }, 'worker started');
}

export function startWorkers() {
  if (!env.WORKERS_ENABLED) {
    log.warn('WORKERS_ENABLED=false — background workers not started');
    return;
  }
  loop('generation', generationTick, env.GENERATION_TICK_MS);
  loop('notification', notificationTick, env.NOTIFICATION_TICK_MS);
  loop('entitlement', entitlementTick, env.NOTIFICATION_TICK_MS);
  loop('rollup', rollupTick, env.ROLLUP_TICK_MS);
}

export function stopWorkers() {
  for (const t of timers) clearInterval(t);
  timers.length = 0;
}

// Exposed for tests / the smoke script to drive ticks deterministically.
export const ticks = { generationTick, notificationTick, entitlementTick, rollupTick };
