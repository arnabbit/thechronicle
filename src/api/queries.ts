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
  FEED_PAGE_SIZE,
  LATEST,
  fetchArticle,
  fetchEdition,
  fetchEditionArticles,
  fetchEditions,
  fetchPeriod,
  fetchSearch,
} from '@/src/api/endpoints';
import type { EditionRow, FeedItem, Page } from '@/src/api/types';
import { STALE_IMMUTABLE, STALE_LATEST } from '@/src/api/queryClient';
import { parsePeriodId } from '@/src/lib/period';
import { isSearchable, normaliseQuery } from '@/src/lib/searchQuery';

export const queryKeys = {
  editions: () => ['editions'] as const,
  edition: (date: string) => ['edition', date] as const,
  editionArticles: (date: string, category: string) =>
    ['edition', date, 'articles', category] as const,
  article: (id: string) => ['article', id] as const,
  /**
   * `search` is deliberately *not* one of the durable prefixes.
   *
   * Ticket 06's `shouldDehydrateQuery` allowlists `edition`, `article` and
   * `period`; a search result set is cross-edition and grows daily, so it must
   * never reach the persisted cache. Keeping it under its own prefix — rather
   * than, say, `['edition', 'search', q]` — is what makes that true by
   * construction instead of by a rule someone has to remember. The persister
   * does not exist yet; when it lands, this key is already outside it.
   */
  search: (q: string) => ['search', q] as const,
  /** `period` is one of the durable prefixes, so a period a reader has opened
   *  survives a session the way an edition does. */
  period: (id: string) => ['period', id] as const,
};

/** A closed edition can never gain or lose an article, so it is worth nothing
 *  to revalidate. Anything reached through `latest` can change under a reader,
 *  and 5 minutes mirrors the server's own `max-age=300`. */
const staleFor = (date: string) => (date === LATEST ? STALE_LATEST : STALE_IMMUTABLE);

/**
 * `latest` is a pointer, not a copy.
 *
 * Both of the home screen's queries address the edition by the `latest`
 * sentinel — that is what keeps today's paper at one round trip each, in
 * parallel, rather than resolving a date first and then fetching with it. Once
 * a response names its real date, the result is mirrored onto the dated key, so
 * the durable cache is addressed by real date and navigating to
 * `/edition/<that date>` finds it already warm.
 *
 * Ticket 09's `shouldDehydrateQuery` must therefore skip `latest`-keyed
 * entries, or the persisted cache would hold two copies of one edition.
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
 * The inverse of the mirroring above, run once when the persisted cache has
 * been restored.
 *
 * The mirroring runs date-wards only, and the dehydration predicate skips
 * `latest`-keyed entries, so what survives a session is the edition addressed
 * by its real date and nothing addressed by the sentinel. That is correct —
 * two copies of one edition is exactly what the rule exists to prevent — but it
 * leaves the front page, which asks for `latest`, as the one screen that cannot
 * open in a tunnel. A reader with yesterday's whole paper on disk was being
 * shown "No connection" on the app's own front door. Measured on the device:
 * `/edition/2026-08-27` rendered in full from cache while `/` did not.
 *
 * So the newest dated edition is copied back onto the sentinel at boot. It is
 * never written back to disk — the predicate still refuses the key — so this
 * costs nothing in the persisted blob and cannot reintroduce the duplicate.
 *
 * The timestamp is carried over rather than stamped as now, which is what keeps
 * the seeded copy *stale*: an online reader's front page refetches on mount and
 * replaces it, and an offline reader's paused fetch leaves it standing. The
 * dateline names the edition's own date and never the word "today", so a reader
 * looking at Tuesday's paper on Thursday is already told which paper it is.
 */
export function seedLatestFromCache(client: QueryClient): void {
  const entries = client.getQueryCache().getAll();

  let newest: { date: string; data: unknown; updatedAt: number } | null = null;
  for (const entry of entries) {
    const [prefix, date, more] = entry.queryKey as unknown[];
    // The edition row itself: a two-element key, and never the sentinel's.
    if (prefix !== 'edition' || typeof date !== 'string') continue;
    if (date === LATEST || more !== undefined) continue;
    if (entry.state.status !== 'success' || entry.state.data === undefined) continue;
    if (!newest || date > newest.date) {
      newest = { date, data: entry.state.data, updatedAt: entry.state.dataUpdatedAt };
    }
  }
  if (!newest) return;

  const seed = (key: readonly unknown[], data: unknown, updatedAt: number) => {
    // Never over a live answer: restoring must not overwrite anything a query
    // that is already running has come back with.
    if (client.getQueryData(key) !== undefined) return;
    client.setQueryData(key, data, { updatedAt });
  };

  seed(queryKeys.edition(LATEST), newest.data, newest.updatedAt);

  // Its feed, per category the reader actually visited.
  for (const entry of entries) {
    const [prefix, date, articles, category] = entry.queryKey as unknown[];
    if (prefix !== 'edition' || date !== newest.date) continue;
    if (articles !== 'articles' || typeof category !== 'string') continue;
    if (entry.state.status !== 'success' || entry.state.data === undefined) continue;
    seed(
      queryKeys.editionArticles(LATEST, category),
      entry.state.data,
      entry.state.dataUpdatedAt,
    );
  }
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
    staleTime: STALE_IMMUTABLE,
  });
}

/** The edition row: the dateline's date, and that edition's category nav. */
export function useEdition(date: string) {
  const query = useQuery({
    queryKey: queryKeys.edition(date),
    queryFn: () => fetchEdition(date),
    staleTime: staleFor(date),
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
    staleTime: staleFor(date),
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
    staleTime: STALE_LATEST,
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
    staleTime: STALE_IMMUTABLE,
  });
}

/** Long enough to be after first paint and the reader's first scroll, short
 *  enough that a tunnel a minute away is still covered. */
const PREFETCH_DELAY_MS = 1200;

/**
 * The current edition's bodies, warmed after first paint.
 *
 * The dehydration predicate persists `['article', id]`, but only entries that
 * exist — and nothing puts an article in the cache until the reader opens it.
 * Without this, a reader who scrolled today's front page and then lost signal
 * would have the feed offline and not one article behind it. Roughly 29 KB for
 * a full edition, and every request it makes is one the reader was likely to
 * make anyway.
 *
 * One page's worth, sequentially, and it stops the moment the connection goes
 * — twenty parallel requests at a cold dyno would be a worse citizen than the
 * reader scrolling.
 */
export function usePrefetchBodies(items: readonly FeedItem[]) {
  const client = useQueryClient();
  // The effect depends on *which* articles, not on the array identity a
  // re-render hands back.
  const ids = items.slice(0, FEED_PAGE_SIZE).map((item) => item.id).join(',');

  useEffect(() => {
    if (!ids) return;
    let cancelled = false;

    const timer = setTimeout(async () => {
      for (const id of ids.split(',')) {
        if (cancelled || !onlineManager.isOnline()) return;
        // A no-op for anything already cached: these never go stale.
        await client.prefetchQuery({
          queryKey: queryKeys.article(id),
          queryFn: () => fetchArticle(id),
          staleTime: STALE_IMMUTABLE,
        });
      }
    }, PREFETCH_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [client, ids]);
}

/**
 * The archive index, warmed after first paint.
 *
 * Fired from the screen the reader is on *before* the archive, not from the
 * archive itself: the archive mounts the same query on arrival, so prefetching
 * it there would be a request the screen was making anyway. Here it is the
 * difference between the dateline opening a list and the dateline opening a
 * skeleton.
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
        staleTime: STALE_IMMUTABLE,
      });
    }, PREFETCH_DELAY_MS);

    return () => clearTimeout(timer);
  }, [client]);
}

/**
 * One period, aggregated.
 *
 * A *closed* period can never change — its editions are immutable and its
 * prose is stored for ever once written — so it is worth nothing to
 * revalidate. An *open* one is still accumulating, and gets the same five
 * minutes anything reached through `latest` gets: a period whose last day is in
 * the future, or is today, is still open.
 *
 * One correction to that rule, which cost nothing to state and would have cost a
 * reader their summary: a closed period is only immutable once its `proseStatus`
 * has stopped being `pending`. See the note on `staleTime` below.
 */
export function usePeriod(id: string, today: string) {
  const period = parsePeriodId(id);
  const closed = Boolean(period && period.range.to < today);
  return useQuery({
    queryKey: queryKeys.period(id),
    queryFn: () => fetchPeriod(id),
    // **A closed period is immutable only once its summary has settled.** The
    // skeleton is fixed the moment the period closes, but the prose is written
    // on first view and arrives *after* the response that triggered it — so the
    // reader who caused it to be written is exactly the reader whose cache would
    // otherwise hold "no summary yet" for ever, across sessions, because this
    // key is persisted and `Infinity` never revalidates.
    //
    // `pending` is the only status that moves. `ready` is final, and `none` means
    // the period is empty and never will be summarised.
    staleTime: (query) =>
      closed && query.state.data?.proseStatus !== 'pending' ? STALE_IMMUTABLE : STALE_LATEST,
    // A malformed id is refused here rather than sent: the server would 404 it
    // and the screen renders the same thing either way, one round trip later.
    enabled: Boolean(period),
  });
}

/**
 * The saved list's reads: one per kept id, revalidated on entry.
 *
 * **The one documented exception to the immutable-stale rule.** Every other
 * article read sits at `Infinity` because ticket 01 made an id's content fixed
 * for life — but "fixed for life" is not "exists for ever", and the saved list
 * is the only surface that has to notice a withdrawal. `staleTime: 0` here
 * refetches on mount and nowhere else; the detail screen's own observer keeps
 * its own `Infinity`, so opening an article still never refetches it.
 *
 * Offline, revalidation is skipped outright rather than left to pause: there
 * is nothing to learn, and every request would sit against a server with no
 * timeout. The cached copy still renders — `enabled: false` does not hide data
 * the cache already holds.
 */
export function useSavedArticles(ids: readonly string[]) {
  const online = onlineManager.isOnline();
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: queryKeys.article(id),
      queryFn: () => fetchArticle(id),
      staleTime: 0,
      // Entry to the screen is the trigger. Not focus, not an interval, and
      // not app open — a reader who never opens this screen never pays.
      refetchOnWindowFocus: false as const,
      refetchOnReconnect: false as const,
      enabled: online,
    })),
  });
}

/**
 * A kept article the durable cache never got the body of, described from
 * whatever else the cache holds.
 *
 * The store keeps only `{id, savedAt}`, so a row with no article record has no
 * headline of its own. It usually has one anyway: the reader saw this story in
 * a feed, and that feed page is persisted. Reading it back out of the cache is
 * free — no request, no second source of truth — and it is what lets an
 * offline row keep its category and headline at full ink while only its dek is
 * replaced.
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

/**
 * The body behind a bookmark, fetched once and not waited on.
 *
 * The offline cache prefetches only the *current* edition's bodies, so an
 * article bookmarked from a past edition — or from a search result — would
 * otherwise be a kept thing with nothing kept. About 1.2 KB, and it is the
 * request the reader was going to make anyway by opening it.
 */
export function prefetchArticleBody(client: QueryClient, id: string): void {
  if (!onlineManager.isOnline()) return;
  void client.prefetchQuery({
    queryKey: queryKeys.article(id),
    queryFn: () => fetchArticle(id),
    staleTime: STALE_IMMUTABLE,
  });
}
