// Reads only. Writes and side effects (ticket 07's token registration) live in
// `src/store`, not here.
//
// Hooks take plain arguments, never route params — that keeps the data layer
// router-agnostic, puts the cache key at the call site, and lets ticket 07's
// push handler prefetch an edition with no router context.

import {
  onlineManager,
  useInfiniteQuery,
  useQueries,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  LATEST,
  fetchArticle,
  fetchEdition,
  fetchEditionArticles,
  fetchEditions,
  fetchPeriod,
  fetchSearch,
} from '@/src/api/endpoints';
import type { EditionRow, FeedItem, Page } from '@/src/api/types';
import { parsePeriodId } from '@/src/lib/period';
import { isSearchable, normaliseQuery } from '@/src/lib/searchQuery';

export const queryKeys = {
  editions: () => ['editions'] as const,
  edition: (date: string) => ['edition', date] as const,
  editionArticles: (date: string, category: string) =>
    ['edition', date, 'articles', category] as const,
  article: (id: string) => ['article', id] as const,
  /** Its own prefix, never `['edition', 'search', q]`: a result set is
   *  cross-edition and belongs to no one edition. */
  search: (q: string) => ['search', q] as const,
  period: (id: string) => ['period', id] as const,
};

/**
 * `latest` is a pointer, not a copy.
 *
 * Both of the home screen's queries address the edition by the `latest`
 * sentinel — that is what keeps today's paper at one round trip each, in
 * parallel, rather than resolving a date first and then fetching with it. Once
 * a response names its real date, the result is mirrored onto the dated key, so
 * navigating to `/edition/<that date>` paints at once instead of showing a
 * skeleton. It is a copy in memory and nothing more: the dated screen refetches
 * on arrival like every other screen, and nothing is written to disk.
 */
function useMirrorToDate<T>(key: readonly unknown[] | null, data: T | undefined) {
  const client = useQueryClient();
  const serialised = key ? JSON.stringify(key) : null;
  useEffect(() => {
    if (!serialised || data === undefined) return;
    client.setQueryData(JSON.parse(serialised), data);
  }, [client, serialised, data]);
}

/**
 * The archive index, newest edition first, one cursor page at a time.
 *
 * `Infinity` rather than the 5 minutes `latest` gets: an edition that exists
 * can never gain or lose an article, so every row already on screen is final
 * and a reader who scrolls ten pages in and comes back must not pay for them
 * twice. The index only grows at its head, and the front page's own
 * `latest`-keyed queries are what notice that.
 */
export function useEditions() {
  return useInfiniteQuery({
    queryKey: queryKeys.editions(),
    queryFn: ({ pageParam }) => fetchEditions(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasNext ? last.nextCursor : undefined),
  });
}

/** The edition row: the dateline's date, and that edition's category nav. */
export function useEdition(date: string) {
  const query = useQuery({
    queryKey: queryKeys.edition(date),
    queryFn: () => fetchEdition(date),
  });
  const resolved = query.data?.date;
  useMirrorToDate<EditionRow>(
    date === LATEST && resolved ? queryKeys.edition(resolved) : null,
    query.data,
  );
  return query;
}

export function useEditionArticles(date: string, category: string) {
  const query = useInfiniteQuery({
    queryKey: queryKeys.editionArticles(date, category),
    queryFn: ({ pageParam }) => fetchEditionArticles(date, category, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasNext ? last.nextCursor : undefined),
  });
  // Every feed item carries its own `edition`, so the resolved date arrives
  // with the first page — no extra request to learn it.
  const resolved = query.data?.pages[0]?.items[0]?.edition;
  useMirrorToDate<InfiniteData<Page<FeedItem>, unknown>>(
    date === LATEST && resolved ? queryKeys.editionArticles(resolved, category) : null,
    query.data,
  );
  return query;
}

/**
 * Search across the whole archive, one cursor page at a time.
 *
 * Five minutes, not `Infinity`: the immutable-past rule does not apply here.
 * A search is cross-edition and the corpus grows every day the paper
 * publishes, so a result set held forever would silently stop including new
 * matches.
 *
 * Plain argument, never a route param — the query is normalised here so the
 * cache key is the string the endpoint actually saw, and the request is gated
 * on the endpoint's own bounds so an out-of-bounds query issues nothing at all
 * rather than being rejected server-side.
 */
export function useSearch(q: string) {
  const query = normaliseQuery(q);
  return useInfiniteQuery({
    queryKey: queryKeys.search(query),
    queryFn: ({ pageParam }) => fetchSearch(query, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasNext ? last.nextCursor : undefined),
    enabled: isSearchable(query),
  });
}

/** Ticket 01 made an article id's content fixed for life, which is what makes
 *  `Infinity` here safe rather than optimistic. `/saved`'s revalidation is the
 *  one documented exception and overrides it deliberately. */
export function useArticle(id: string) {
  return useQuery({
    queryKey: queryKeys.article(id),
    queryFn: () => fetchArticle(id),
  });
}

/** Long enough to be after first paint and the reader's first scroll. */
const PREFETCH_DELAY_MS = 1200;

/**
 * The archive index, warmed after first paint.
 *
 * Fired from the screen the reader is on *before* the archive, not from the
 * archive itself. The archive refetches on arrival like every other screen, so
 * this does not save the request — it decides whether the dateline opens a
 * list that is being revalidated or a skeleton.
 */
export function usePrefetchEditions() {
  const client = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!onlineManager.isOnline()) return;
      client.prefetchInfiniteQuery({
        queryKey: queryKeys.editions(),
        queryFn: ({ pageParam }) => fetchEditions(pageParam as string | null),
        initialPageParam: null as string | null,
      });
    }, PREFETCH_DELAY_MS);

    return () => clearTimeout(timer);
  }, [client]);
}

/**
 * One period, aggregated.
 *
 * Every period gets the same five minutes `latest` gets, closed or not. Its
 * story grows while it is open, during the grace window after it closes, and
 * when an edition is filed late — so no period is ever immutable here, and a
 * reader who reopens one sees a newly added section within five minutes.
 */
export function usePeriod(id: string) {
  const period = parsePeriodId(id);
  return useQuery({
    queryKey: queryKeys.period(id),
    queryFn: () => fetchPeriod(id),
    // A malformed id is refused here rather than sent: the server would 404 it
    // and the screen renders the same thing either way, one round trip later.
    enabled: Boolean(period),
  });
}

/**
 * The saved list's reads: one per kept id, read on entry.
 *
 * The list has to notice a withdrawal — "fixed for life" is not "exists for
 * ever" — and a 404 here is what turns a row dead.
 *
 * Offline, the read is skipped outright rather than left to pause: there is
 * nothing to learn, and every request would sit against a server with no
 * timeout. Whatever this session already holds still renders — `enabled: false`
 * does not hide data the cache already has.
 */
export function useSavedArticles(ids: readonly string[]) {
  const online = onlineManager.isOnline();
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: queryKeys.article(id),
      queryFn: () => fetchArticle(id),
      // Entry to the screen is the trigger. Not focus, not an interval, and
      // not app open — a reader who never opens this screen never pays.
      refetchOnWindowFocus: false as const,
      refetchOnReconnect: false as const,
      enabled: online,
    })),
  });
}

/**
 * A kept article with no body in hand, described from whatever else this
 * session's cache holds.
 *
 * The store keeps only `{id, savedAt}`, so a row with no article record has no
 * headline of its own. It may have one anyway: if the reader saw this story in
 * a feed in this session, that feed page is still in memory. Reading it back
 * out is free — no request, no second source of truth — and it is what lets a
 * row keep its category and headline at full ink while only its dek is
 * replaced. Across sessions there is nothing to find, and the row degrades to
 * its id, which is what `rowState` is for.
 */
export function findCachedFeedItem(client: QueryClient, id: string): FeedItem | undefined {
  for (const entry of client.getQueryCache().getAll()) {
    const [prefix, , articles] = entry.queryKey as unknown[];
    if (prefix !== 'edition' || articles !== 'articles') continue;
    const data = entry.state.data as InfiniteData<Page<FeedItem>, unknown> | undefined;
    if (!data) continue;
    for (const page of data.pages) {
      const found = page.items.find((item) => item.id === id);
      if (found) return found;
    }
  }
  return undefined;
}
