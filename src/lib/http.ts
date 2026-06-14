/**
 * Minimal fetch wrapper for talking to the backend proxy. Attaches the shared
 * client token as a Bearer header and adds a small timeout + single retry.
 * (Mirrors forge's client-token gate — PLANNING.md §3.2.)
 *
 * Phase 1 runs on mocks, so this is currently only exercised by
 * `claudeClient` when a backend URL is configured.
 */
import { env } from './env';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

type PostOptions = {
  timeoutMs?: number;
  retries?: number;
};

export async function postJson<TReq, TRes>(
  path: string,
  body: TReq,
  { timeoutMs = 15000, retries = 1 }: PostOptions = {},
): Promise<TRes> {
  if (!env.backendUrl) {
    throw new HttpError(0, 'No backend configured');
  }

  const url = `${env.backendUrl.replace(/\/$/, '')}${path}`;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.clientToken}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        // 5xx is retryable; 4xx is not.
        if (res.status >= 500 && attempt < retries) {
          lastError = new HttpError(res.status, `Server error ${res.status}`);
          continue;
        }
        throw new HttpError(res.status, `Request failed (${res.status})`);
      }

      return (await res.json()) as TRes;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      if (attempt >= retries) break;
    }
  }
  throw lastError instanceof Error ? lastError : new HttpError(0, 'Network error');
}
