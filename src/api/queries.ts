// Reads only. Writes and side effects (ticket 07's token registration) live in
// `src/store`, not here.
//
// Hooks take plain arguments, never route params — that keeps the data layer
// router-agnostic, puts the cache key at the call site, and lets ticket 07's
// push handler prefetch an edition with no router context.

import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  LATEST,
  fetchArticle,
  fetchEdition,
  fetchEditionArticles,
  fetchEditions,
} from '@/src/api/endpoints';
import type { EditionRow, FeedItem, Page } from '@/src/api/types';
import { STALE_IMMUTABLE, STALE_LATEST } from '@/src/api/queryClient';

export const queryKeys = {
  editions: () => ['editions'] as const,
  edition: (date: string) => ['edition', date] as const,
  editionArticles: (date: string, category: string) =>
    ['edition', date, 'articles', category] as const,
  article: (id: string) => ['article', id] as const,
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
