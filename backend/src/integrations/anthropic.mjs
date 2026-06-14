// Anthropic / Claude integration.
//
// When ANTHROPIC_API_KEY is set we call the real Messages API via the official
// @anthropic-ai/sdk (model ids per the claude-api reference: workhorse
// claude-haiku-4-5, premium claude-sonnet-4-6). When it is unset we run a
// deterministic MOCK generator so the entire generation pipeline — jobs,
// persistence, cost tracking, notifications — is exercisable offline with no
// network and no spend.
//
// Both paths return the same shape:
//   { content: { title?, body, tone?, structured? }, meta: { model, input_tokens,
//     output_tokens, cost_micros, latency_ms, stop_reason } }

import { env } from '../config/env.mjs';
import { childLogger } from '../config/logger.mjs';
import { upstreamError } from '../lib/errors.mjs';
import { SYSTEM_PROMPT, OUTPUT_SCHEMA, buildUserPrompt } from '../services/prompts.catalog.mjs';

const log = childLogger('anthropic');

// USD per 1M tokens (claude-api reference, 2026-06). Used to compute cost_micros.
const PRICING = {
  'claude-haiku-4-5': { input: 1.0, output: 5.0 },
  'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
};

function costMicros(model, inputTokens, outputTokens) {
  const p = PRICING[model] ?? PRICING['claude-haiku-4-5'];
  // micros = USD millionths. price is $/1M tok → per-token USD = price/1e6.
  const usd = (inputTokens * p.input + outputTokens * p.output) / 1e6;
  return Math.round(usd * 1e6);
}

/** Resolve which model to use from a prompt's model_pref + entitlement. */
export function resolveModel(modelPref, { isPlus } = {}) {
  if (modelPref === 'sonnet') return env.ANTHROPIC_MODEL_PREMIUM;
  if (modelPref === 'haiku') return env.ANTHROPIC_MODEL;
  // 'auto' → premium for Plus users, workhorse otherwise (PLANNING §4)
  return isPlus ? env.ANTHROPIC_MODEL_PREMIUM : env.ANTHROPIC_MODEL;
}

let sdkClient = null;
async function getClient() {
  if (sdkClient) return sdkClient;
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  sdkClient = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return sdkClient;
}

/**
 * Generate one piece of daily content.
 * @param {object} req { type, intent, date, tz, model }
 */
export async function generateContent({ type, intent, date, tz, model }) {
  const started = Date.now();
  const trimmedIntent = String(intent).slice(0, env.GENERATION_INTENT_MAX_CHARS);

  if (env.flags.usingMockAnthropic) {
    return mockGenerate({ type, intent: trimmedIntent, date, tz, model, started });
  }

  try {
    const client = await getClient();
    const response = await client.messages.create({
      model,
      max_tokens: env.ANTHROPIC_MAX_TOKENS,
      system: [
        // Prompt-cached prefix: stable system prompt hits the cache on repeat
        // daily calls (~0.1x input cost). See shared/prompt-caching.md.
        { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      output_config: { format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
      messages: [{ role: 'user', content: buildUserPrompt({ type, intent: trimmedIntent, date, tz }) }],
    });

    const latency_ms = Date.now() - started;

    // Safety: classifiers may decline (HTTP 200 + stop_reason 'refusal').
    // Check before reading content (claude-api reference).
    if (response.stop_reason === 'refusal') {
      log.warn({ type, model }, 'generation refused by safety classifier');
      return {
        refusal: true,
        content: { body: friendlyFallback(type) },
        meta: {
          model: response.model || model,
          input_tokens: response.usage?.input_tokens ?? 0,
          output_tokens: response.usage?.output_tokens ?? 0,
          cost_micros: costMicros(model, response.usage?.input_tokens ?? 0, response.usage?.output_tokens ?? 0),
          latency_ms,
          stop_reason: 'refusal',
        },
      };
    }

    const textBlock = response.content.find((b) => b.type === 'text');
    const parsed = safeParse(textBlock?.text) ?? { body: friendlyFallback(type) };
    const usage = response.usage ?? {};

    return {
      refusal: false,
      content: { title: parsed.title, body: parsed.body, tone: parsed.tone, structured: parsed.structured ?? null },
      meta: {
        model: response.model || model,
        input_tokens: usage.input_tokens ?? 0,
        output_tokens: usage.output_tokens ?? 0,
        cost_micros: costMicros(model, usage.input_tokens ?? 0, usage.output_tokens ?? 0),
        latency_ms,
        stop_reason: response.stop_reason ?? 'end_turn',
      },
    };
  } catch (err) {
    log.error({ err, type, model }, 'anthropic request failed');
    throw upstreamError('Content generation failed', { provider: 'anthropic' });
  }
}

function safeParse(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function friendlyFallback() {
  return "Today's a good day to pause, breathe, and be kind to yourself. If things feel heavy, reaching out to someone you trust can help.";
}

// ── Deterministic mock generator ────────────────────────────────────────────
// Produces varied, type-appropriate content seeded by (type, intent, date) so
// the same request is stable but different days/intents differ. No network.

const MOCK_TEMPLATES = {
  reflection: (intent, date) => ({
    title: 'A moment to reflect',
    body: `Consider this today: ${capitalize(intent)}. What is one small truth about it you hadn't noticed before ${date}? Sit with it for a breath.`,
    tone: 'contemplative',
  }),
  motivation: (intent) => ({
    title: 'Today',
    body: `${capitalize(intent)} — start before you feel ready. Momentum is built, not found.`,
    tone: 'direct',
  }),
  habit: (intent, date) => ({
    title: 'Gentle nudge',
    body: `A fresh take for ${date}: ${lower(intent)}. Make it the easiest version of itself, just once.`,
    tone: 'warm',
  }),
  story: (intent) => ({
    title: 'One paragraph',
    body: `She kept a jar of ${lower(intent)} on the windowsill. Each morning it held a little more light than the day before — until one day the light spilled out and followed her to work.`,
    tone: 'whimsical',
  }),
  journal: (intent) => ({
    title: 'Prompt',
    body: `Write about ${lower(intent)}: when did you last feel it clearly, and what was true in that moment?`,
    tone: 'open',
  }),
  learning: (intent, date) => ({
    title: 'One thing today',
    body: `Today's ${lower(intent)} lesson (${date}): a small piece you can use right away.`,
    tone: 'clear',
    structured: { topic: lower(intent), example: `An example for ${date}.` },
  }),
  custom: (intent, date) => ({
    title: 'Daily',
    body: `${capitalize(intent)} — your note for ${date}.`,
    tone: 'neutral',
  }),
};

function mockGenerate({ type, intent, date, tz, model, started }) {
  const make = MOCK_TEMPLATES[type] ?? MOCK_TEMPLATES.custom;
  const content = make(intent || 'today', date, tz);
  // Pseudo token accounting so cost dashboards have realistic numbers.
  const input_tokens = 40 + Math.min(intent?.length ?? 0, env.GENERATION_INTENT_MAX_CHARS) / 4 | 0;
  const output_tokens = 20 + Math.floor((content.body?.length ?? 0) / 4);
  return {
    refusal: false,
    content: { structured: null, ...content },
    meta: {
      model: `${model} (mock)`,
      input_tokens,
      output_tokens,
      cost_micros: costMicros(model, input_tokens, output_tokens),
      latency_ms: Date.now() - started,
      stop_reason: 'end_turn',
    },
  };
}

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const lower = (s) => (s ? s.toLowerCase() : s);
