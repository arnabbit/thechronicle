// The search endpoint's own bounds, applied before a request rather than after
// a 400. Ticket 08 settled validation instead of throttling: `q` length 2..100.
// Both numbers are the server's, restated here so a query the server would
// reject never leaves the device — every keystroke would otherwise be a round
// trip, and the first one is always a single character.
//
// Pure by construction: no React, no router, no query client. The screen reads
// the URL and hands the raw string in. Imports carry their file extension and
// stay relative — bare Node resolves neither the @/ alias nor an extensionless
// TS path, and running under bare Node is the point.

/** Below this a query is not sent. Ticket 08: minimum length 2. */
export const MIN_QUERY_LENGTH = 2;

/** Above this the server rejects. Ticket 08: reject queries over ~100 chars. */
export const MAX_QUERY_LENGTH = 100;

/**
 * Why a query is not being sent, or `ready` when it is.
 *
 * `blank` is told apart from `short` because the two are different screens: an
 * empty field is the route's resting state, while one character is a search in
 * progress. Neither issues a request.
 */
export type SearchQueryState = 'blank' | 'short' | 'long' | 'ready';

/**
 * The query as the endpoint would see it. Leading and trailing whitespace is
 * not a search term, and it is what makes a pasted `?q=%20delhi%20` the same
 * search as `?q=delhi` rather than a second cache entry for one result set.
 */
export function normaliseQuery(raw: string | null | undefined): string {
  return (raw ?? '').trim();
}

/** The bound that was crossed, measured on the normalised query. */
export function searchQueryState(raw: string | null | undefined): SearchQueryState {
  const q = normaliseQuery(raw);
  if (q.length === 0) return 'blank';
  if (q.length < MIN_QUERY_LENGTH) return 'short';
  if (q.length > MAX_QUERY_LENGTH) return 'long';
  return 'ready';
}

/** Whether a request may be issued at all. The only gate the screen needs. */
export function isSearchable(raw: string | null | undefined): boolean {
  return searchQueryState(raw) === 'ready';
}
