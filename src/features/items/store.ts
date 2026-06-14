/**
 * Store selector. The hooks/screens talk to one async `store` interface; this
 * picks the local AsyncStorage-backed mock store (Phase 1 / offline) or the
 * backend-backed remote store based on `env.useMocks` (set by
 * EXPO_PUBLIC_USE_MOCKS / whether a backend URL is configured).
 *
 * This is the seam the local store anticipated ("a versioned implementation can
 * replace it later without touching the hooks/UI").
 */
import { env } from '@/lib/env';
import { itemStore } from './itemStore';
import { remoteStore } from './remoteStore';

export const store = (env.useMocks ? itemStore : remoteStore) as typeof itemStore;
