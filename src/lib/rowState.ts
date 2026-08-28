import { isNotFound } from '../api/errors.ts';

// The two ways one *row* in a rendered list can be degraded.
//
// A degraded row is not a degraded screen: content exists and some of it is
// missing, which the whole-screen `screenState` union structurally cannot
// express. Kept beside it rather than folded into it, because the two answer
// different questions and merging them would give five screen kinds a row
// meaning they do not have.
//
// The two are told apart *structurally*, never by shade — ticket 12's dark
// palette leaves no headroom below `secondary`, so dimming cannot carry a
// distinction. `dead` loses its category, its ink and its dek and gains a
// Remove control; `unavailableOffline` keeps category and ink at full strength
// and only replaces its dek.

export type RowStateKind = 'dead' | 'unavailableOffline';

export interface RowStateInput {
  /** Whether the full article record is in hand — cached or just fetched. */
  hasArticle: boolean;
  /** The revalidation's error, unwidened. A typed 404 is what "gone" means. */
  error: unknown;
  /** Whether the device believes it has a connection, read by the caller. */
  online: boolean;
  /** Query's `fetchStatus === 'paused'`, read by the caller beside `online`.
   *  A paused fetch has not failed and never will while the connection is
   *  gone, which is exactly the offline row. */
  paused: boolean;
}

/**
 * `null` means "render the row as it is" — either the article is in hand, or
 * what is missing is not something the reader needs told about.
 *
 * Deliberately no third kind for "the request failed while online". The row
 * still has whatever the cache holds, and a reader who is connected and
 * looking at a working list does not need a per-row apology for a refetch
 * that will succeed on the next entry. Only *gone* and *not on this device*
 * change what the row can honestly claim.
 */
export function rowState({ hasArticle, error, online, paused }: RowStateInput): RowStateKind | null {
  // Checked before `hasArticle`: a 404 on revalidation is the whole point of
  // revalidating, and a stale cached copy must not outvote it.
  if (isNotFound(error)) return 'dead';
  if (hasArticle) return null;
  if (paused || !online) return 'unavailableOffline';
  return null;
}
