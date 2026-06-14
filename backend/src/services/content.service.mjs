// Content read paths + regenerate gating. Generation orchestration lives in
// generation.service.mjs; this layer handles the home/today payload, history,
// single-entry fetch, and the credit/entitlement gate on "give me another".

import {
  promptsRepo,
  contentRepo,
  entitlementsRepo,
} from '../repositories/index.mjs';
import { regenerate as runRegenerate } from './generation.service.mjs';
import { spendRegenCredit } from './credit.service.mjs';
import { todayInTz } from '../lib/time.mjs';
import { notFound } from '../lib/errors.mjs';

export async function todayForUser(user) {
  const date = todayInTz(user.timezone ?? 'UTC');
  const entries = await contentRepo.todayForUser(user.id, date);
  return { date, entries };
}

export async function getContent(contentId, userId) {
  const content = await contentRepo.findOwned(contentId, userId);
  if (!content) throw notFound('Content not found');
  return content;
}

export async function history(promptId, userId, { from, to } = {}) {
  const prompt = await promptsRepo.findOwned(promptId, userId);
  if (!prompt) throw notFound('Prompt not found');
  return contentRepo.history(promptId, { from, to });
}

export async function softDelete(contentId, userId) {
  const content = await contentRepo.findOwned(contentId, userId);
  if (!content) throw notFound('Content not found');
  await contentRepo.softDelete(contentId);
  return { ok: true };
}

/**
 * Regenerate a day's content. Daily Plus users regenerate freely; free users
 * spend a credit (402 if none left — enforced in spendRegenCredit).
 */
export async function regenerate(contentId, user) {
  const content = await contentRepo.findOwned(contentId, user.id);
  if (!content) throw notFound('Content not found');

  const isPlus = await entitlementsRepo.hasDailyPlus(user.id);
  if (!isPlus) {
    await spendRegenCredit(user.id, content.id); // throws paymentRequired if empty
  }
  return runRegenerate({ contentId, userId: user.id });
}
