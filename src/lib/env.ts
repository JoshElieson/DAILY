/**
 * Reads EXPO_PUBLIC_* config. These values ship in the client bundle and are
 * NOT secret (PLANNING.md §3.7). The Anthropic key never appears here.
 */

const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';
const clientToken = process.env.EXPO_PUBLIC_BACKEND_CLIENT_TOKEN ?? '';

// Use mocks when explicitly requested OR whenever the backend is not configured.
const useMocksFlag = process.env.EXPO_PUBLIC_USE_MOCKS;
const useMocks =
  useMocksFlag === 'true' || useMocksFlag == null || backendUrl.length === 0;

export const env = {
  backendUrl,
  clientToken,
  /** When true the app runs entirely on mock data (Phase 1 default). */
  useMocks,
} as const;
