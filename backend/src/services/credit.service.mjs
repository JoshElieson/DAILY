// Regeneration-credit ledger (BACKEND-SCHEMA-API.md §7). Free users get a daily
// grant of N regeneration credits; each "give me another" spends one. Append-only
// ledger — balance is derived, never mutated in place.

import { creditLedgerRepo } from '../repositories/index.mjs';
import { env } from '../config/env.mjs';
import { todayInTz } from '../lib/time.mjs';
import { paymentRequired } from '../lib/errors.mjs';
import { childLogger } from '../config/logger.mjs';

const log = childLogger('credit.service');

export async function getBalance(userId) {
  return creditLedgerRepo.balance(userId);
}

export async function listLedger(userId) {
  return creditLedgerRepo.listByUser(userId);
}

/** Grant today's daily credits once per day (idempotent per UTC day). */
export async function ensureDailyGrant(userId, timezone = 'UTC') {
  if (env.FREE_DAILY_REGEN_CREDITS <= 0) return creditLedgerRepo.balance(userId);
  const day = todayInTz(timezone);
  const already = await creditLedgerRepo.grantedOn(userId, day);
  if (already) return creditLedgerRepo.balance(userId);
  const entry = await creditLedgerRepo.append(userId, {
    delta: env.FREE_DAILY_REGEN_CREDITS,
    reason: 'daily_grant',
  });
  log.info({ userId, granted: env.FREE_DAILY_REGEN_CREDITS }, 'daily regen credits granted');
  return entry.balance_after;
}

/** Spend one regeneration credit; 402 if the balance is empty. */
export async function spendRegenCredit(userId, refContentId = null) {
  await ensureDailyGrant(userId);
  const balance = await creditLedgerRepo.balance(userId);
  if (balance <= 0) {
    throw paymentRequired('Out of regeneration credits for today. Upgrade to Daily Plus for unlimited.', {
      balance: 0,
    });
  }
  const entry = await creditLedgerRepo.append(userId, {
    delta: -1,
    reason: 'regenerate_spend',
    ref_content_id: refContentId,
  });
  return entry.balance_after;
}
