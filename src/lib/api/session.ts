/**
 * API session: JWT lifecycle for the Daily backend `/v1` API.
 *
 * The app is anonymous-first (PLANNING.md §3.6): on first use we bootstrap an
 * anonymous user (`POST /v1/auth/anonymous`) and persist the access + refresh
 * tokens in AsyncStorage. `apiFetch` injects the Bearer access token, parses the
 * standard error envelope, and on a 401 transparently refreshes (or re-bootstraps)
 * once and retries. The Anthropic key never reaches the client — all generation
 * goes through this backend.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { timezone } from '@/lib/date';
import { env } from '@/lib/env';
import type { AuthBundle, Tokens, UserDTO } from './types';

const STORAGE_KEY = 'daily.api.session';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type Session = { tokens: Tokens; user: UserDTO };

let session: Session | null = null;
let hydrated = false;
let inflightBootstrap: Promise<Session> | null = null;

function baseUrl(): string {
  if (!env.backendUrl) throw new ApiError(0, 'no_backend', 'No backend URL configured');
  return env.backendUrl.replace(/\/$/, '');
}

async function hydrate(): Promise<void> {
  if (hydrated) return;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) session = JSON.parse(raw) as Session;
  } catch {
    session = null;
  }
  hydrated = true;
}

async function persist(next: Session | null): Promise<void> {
  session = next;
  try {
    if (next) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    /* best-effort */
  }
}

async function rawJson<T>(path: string, init: RequestInit, timeoutMs = 15000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${baseUrl()}${path}`, { ...init, signal: controller.signal });
  } catch (err) {
    clearTimeout(timer);
    throw new ApiError(0, 'network_error', err instanceof Error ? err.message : 'Network error');
  }
  clearTimeout(timer);

  const text = await res.text();
  const json = text ? safeParse(text) : null;
  if (!res.ok) {
    const envelope = (json as { error?: { code?: string; message?: string; details?: unknown } })?.error;
    throw new ApiError(
      res.status,
      envelope?.code ?? 'http_error',
      envelope?.message ?? `Request failed (${res.status})`,
      envelope?.details,
    );
  }
  return json as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Create a fresh anonymous session (deduped if called concurrently). */
async function bootstrapAnonymous(): Promise<Session> {
  if (inflightBootstrap) return inflightBootstrap;
  inflightBootstrap = (async () => {
    const bundle = await rawJson<AuthBundle>('/v1/auth/anonymous', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timezone: timezone() }),
    });
    const next: Session = { tokens: bundle.tokens, user: bundle.user };
    await persist(next);
    return next;
  })();
  try {
    return await inflightBootstrap;
  } finally {
    inflightBootstrap = null;
  }
}

async function ensureSession(): Promise<Session> {
  await hydrate();
  if (session) return session;
  return bootstrapAnonymous();
}

/** Rotate via refresh token; falls back to a fresh anonymous bootstrap. */
async function refreshSession(): Promise<Session> {
  if (!session) return bootstrapAnonymous();
  try {
    const tokens = await rawJson<Tokens>('/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: session.tokens.refresh_token }),
    });
    const next: Session = { tokens, user: session.user };
    await persist(next);
    return next;
  } catch {
    await persist(null);
    return bootstrapAnonymous();
  }
}

export type ApiFetchOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  timeoutMs?: number;
};

/** Authenticated request against `/v1`. Refreshes + retries once on 401. */
export async function apiFetch<T>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  let current = await ensureSession();

  const run = (s: Session) =>
    rawJson<T>(path, {
      method: opts.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${s.tokens.access_token}`,
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    }, opts.timeoutMs);

  try {
    return await run(current);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      current = await refreshSession();
      return run(current);
    }
    throw err;
  }
}

// ── Session control (backend `/v1` auth lifecycle) ──────────────────────────

export async function initSession(): Promise<UserDTO> {
  const s = await ensureSession();
  return s.user;
}

export async function currentUser(): Promise<UserDTO | null> {
  await hydrate();
  return session?.user ?? null;
}

/** Replace the local session (e.g. after a provider claim) and persist. */
export async function setSession(bundle: AuthBundle): Promise<void> {
  await persist({ tokens: bundle.tokens, user: bundle.user });
}

/** Clear tokens; the next request bootstraps a fresh anonymous session. */
export async function clearSession(): Promise<void> {
  // Best-effort server-side revoke.
  try {
    if (session) {
      await rawJson('/v1/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: session.tokens.refresh_token }),
      });
    }
  } catch {
    /* ignore */
  }
  await persist(null);
}
