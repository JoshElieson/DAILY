// Claude prompt catalog: the server-side system prompt (prompt-cached),
// per-content-type instructions, and the structured-output JSON schema.
// Mirrors PLANNING.md §4.2–4.3. Lives server-side only; the client never sees it.

export const SYSTEM_PROMPT = `You are Daily, a generator of short, high-quality daily content.
You produce ONE piece of content for ONE day based on the user's intent and content type.

Rules:
- Keep it concise and self-contained: a person reads this in under 60 seconds.
- Match the requested TYPE (reflection, motivation, habit nudge, micro-story, journaling prompt, learning drip).
- Be specific and fresh; never repeat generic filler. Vary phrasing day to day.
- Warm but not saccharine. No emoji unless the type clearly calls for it.
- Never give medical, legal, financial, or crisis advice. If the intent implies
  self-harm or crisis, return gentle, non-clinical encouragement plus a note to
  reach out to a professional or hotline.
- Output ONLY the structured fields requested. No preamble.`;

/** Per-type guidance appended to the user turn. */
export const TYPE_INSTRUCTIONS = {
  reflection: 'Produce a thoughtful reflection or contemplative prompt to sit with today.',
  motivation: 'Produce one short, non-cheesy motivational line. No clichés.',
  habit: 'Produce a fresh nudge toward the habit — varied wording, never nagging.',
  story: 'Produce a single self-contained micro-story (one short paragraph).',
  journal: 'Produce one specific, open-ended journaling prompt.',
  learning:
    'Produce one bite-sized lesson. Put the teachable item in `structured` (e.g. {phrase, translation, example}).',
  custom: 'Follow the user intent literally; keep it short and high quality.',
};

// JSON schema for structured output via `output_config.format` (PLANNING §4.3).
// Per the structured-outputs constraints, every object must declare
// `additionalProperties: false` and there is no support for open/arbitrary
// property maps — so the type-specific `structured` jsonb is NOT part of the
// constrained schema. The mock generator and the Claude prompt may still emit
// type-specific data; the generation service extracts it best-effort into the
// `structured` column.
export const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Short label for the card (optional).' },
    body: { type: 'string', description: 'The main content the user reads.' },
    tone: { type: 'string', description: 'One-word tone descriptor (optional).' },
  },
  required: ['body'],
  additionalProperties: false,
};

/** Build the user-turn text for a generation request. */
export function buildUserPrompt({ type, intent, date, tz }) {
  const guidance = TYPE_INSTRUCTIONS[type] ?? TYPE_INSTRUCTIONS.custom;
  return [
    `TYPE: ${type}`,
    `DATE: ${date}${tz ? ` (${tz})` : ''}`,
    `USER INTENT: ${intent}`,
    '',
    guidance,
    'Make today distinct from other days — use the date as a seed for variety.',
  ].join('\n');
}
