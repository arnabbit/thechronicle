import Constants from 'expo-constants';
import { ApiError, NotFoundError } from '@/src/api/errors';

// One origin serves web and Android, so there is no platform branch here.
const FALLBACK_BASE = 'https://fayz-news-backend.onrender.com';

export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE ??
  (Constants.expoConfig?.extra?.apiBase as string | undefined) ??
  FALLBACK_BASE;

// The error types live in `errors.ts`, which imports nothing — that is what
// lets screen-state selection be tested without a renderer. Re-exported here
// so callers keep one import for the client and its failures.
export { ApiError, NotFoundError, isNotFound } from '@/src/api/errors';

/**
 * The cache-busting parameter, added to every read.
 *
 * The paper is read live: no response is ever served from a store between the
 * app and the backend. Headers alone do not guarantee that. `cache: 'no-store'`
 * is honoured by the browser's fetch and ignored by React Native's, which is a
 * polyfill over `XMLHttpRequest`, and `Cache-Control` is a request to whatever
 * sits in the middle rather than a rule it must obey. A parameter that differs
 * on every call cannot be ignored by any of them: the URL itself is new, so no
 * stored response can match it.
 *
 * The backend ignores unknown query parameters, so this is invisible to the
 * contract in `endpoints.ts`.
 */
const CACHE_BUST_PARAM = '_';

/** No-store on both sides of the call: the browser's own HTTP cache, and any
 *  proxy that reads request headers. */
const NO_STORE_HEADERS = {
  'Cache-Control': 'no-cache, no-store, max-age=0',
  Pragma: 'no-cache',
} as const;

/**
 * The one place a request leaves the app — except ticket 16's GitHub release
 * check, which deliberately does not go through here.
 *
 * No timeout: any timeout short enough to feel responsive would kill a
 * legitimate Render cold start, measured at 22.9 s.
 */
export async function request<T>(
  path: string,
  params?: Record<string, string | number | null | undefined>,
): Promise<T> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== null && value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  }
  // Last, so it never displaces a real parameter and always leaves a query.
  query.set(CACHE_BUST_PARAM, String(Date.now()));
  const response = await fetch(`${API_BASE}${path}?${query}`, {
    cache: 'no-store',
    headers: NO_STORE_HEADERS,
  });

  if (response.status === 404) throw new NotFoundError();
  if (!response.ok) {
    let code = 'unknown';
    let message = `Request failed with ${response.status}`;
    try {
      const payload = await response.json();
      if (payload?.error) {
        code = payload.error.code ?? code;
        message = payload.error.message ?? message;
      }
    } catch {
      // A non-JSON error body is still an error; the status is what matters.
    }
    throw new ApiError(response.status, code, message);
  }

  return (await response.json()) as T;
}
