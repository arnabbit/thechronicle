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
  const suffix = query.toString() ? `?${query}` : '';
  const response = await fetch(`${API_BASE}${path}${suffix}`);

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
