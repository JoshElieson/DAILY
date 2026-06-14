// Structured logging via pino. One shared root logger; modules create child
// loggers with a `mod` binding. Request-scoped logging is wired in
// middleware/requestContext.mjs (pino-http) so every log line inside a request
// carries the request id.

import pino from 'pino';
import { env } from './env.mjs';

const isPretty = env.NODE_ENV !== 'production' && !env.flags.isTest;

export const logger = pino({
  level: env.flags.isTest ? 'silent' : env.LOG_LEVEL,
  base: { service: 'daily-backend' },
  redact: {
    // Never log secrets or raw user intent text.
    paths: [
      'req.headers.authorization',
      'authorization',
      'intent',
      'body.intent',
      'ANTHROPIC_API_KEY',
      '*.ANTHROPIC_API_KEY',
      'refresh_token',
      'access_token',
    ],
    censor: '[redacted]',
  },
  ...(isPretty
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname,service' },
        },
      }
    : {}),
});

/** Create a module-scoped child logger: `const log = childLogger('prompt.service')`. */
export function childLogger(mod, bindings = {}) {
  return logger.child({ mod, ...bindings });
}
