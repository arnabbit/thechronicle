// What the durable cache keeps, and for how long.
//
// Eviction happens here and nowhere else. `gcTime` is not an eviction
// mechanism: its timers restart on every cache restore and a session is
// minutes long, so a longer window would only grow the persisted blob without
// bound. This predicate runs at the dehydrate step, once per query, and its
// answer is the whole policy.
//
// Pure by construction — no React, no React Native, no query client. The
// caller hands in the query's key, its timestamp and the current time, exactly
// as `screenState` is handed connectivity. That is what puts three rules that
// silently produce either an unbounded cache or a double-stored edition under
// a test instead of under a manual check that could never reveal them.
//
// Imports inside this suite carry their file extension and stay relative. This
// module has none at all.

/**
 * Key prefixes naming a durable entity.
 *
 * Exact first-element match, not a prefix-of-a-string test: `['editions']` —
 * the archive index — is a different key from `['edition', date]`, and a
 * `startsWith` would quietly sweep it in. The index grows at its head every
 * day the paper publishes and is not one of the three entities this ticket
 * names, so it stays out.
 *
 * `search` is absent deliberately: a result set is cross-edition and grows
 * daily, so a persisted copy would silently stop including new matches.
 */
export const DURABLE_PREFIXES: readonly string[] = ['edition', 'article', 'period'];

/**
 * The sentinel that addresses today's paper without a round trip.
 *
 * Declared here rather than imported because `src/api/endpoints.ts`, where the
 * wire constant lives, reaches the API client and therefore React Native — and
 * this module has to run under bare Node. `src/api/queryClient.ts` carries a
 * type-level guard that stops compiling if the two ever drift apart.
 */
export const LATEST_SENTINEL = 'latest';

/** 90 days. Past that, a reader is not coming back to it. */
export const MAX_PERSIST_AGE_MS = 90 * 24 * 60 * 60 * 1000;

export interface PersistCandidate {
  /** The query's key, as the cache holds it. */
  queryKey: readonly unknown[];
  /** Epoch ms of the query's last *successful* update. */
  dataUpdatedAt: number;
  /** TanStack Query's `status`. Only a successful read is worth keeping. */
  status: 'pending' | 'error' | 'success';
}

/**
 * Three rules, all of which must hold.
 *
 * 1. The key names a durable entity.
 * 2. Its data is within 90 days — measured from when the entry was last
 *    *fetched*, not from any date inside the key. An article key carries no
 *    date at all (`['article', id]`), so entry age is the only measure the
 *    rule can apply to all three prefixes alike.
 * 3. **It is not addressed by the `latest` sentinel.** Not optional: the front
 *    page addresses the edition by sentinel and mirrors the result onto the
 *    resolved date, so persisting both would store two copies of one edition
 *    and the cache would grow a duplicate per day. The sentinel is looked for
 *    anywhere in the key, because both `['edition', 'latest']` and
 *    `['edition', 'latest', 'articles', category]` are addressed by it.
 *
 * `now` is a parameter rather than a `Date.now()` call, which is what keeps
 * the 90-day boundary testable from both sides.
 */
export function isPersistable(
  { queryKey, dataUpdatedAt, status }: PersistCandidate,
  now: number,
): boolean {
  if (status !== 'success') return false;

  const [prefix] = queryKey;
  if (typeof prefix !== 'string' || !DURABLE_PREFIXES.includes(prefix)) return false;

  if (queryKey.includes(LATEST_SENTINEL)) return false;

  // A never-updated entry has no data to keep. Clock skew that puts the stamp
  // in the future reads as fresh, which is the harmless direction.
  if (!dataUpdatedAt) return false;
  return now - dataUpdatedAt <= MAX_PERSIST_AGE_MS;
}
