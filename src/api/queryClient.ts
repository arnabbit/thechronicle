import { QueryClient } from '@tanstack/react-query';
import { isNotFound } from '@/src/api/client';

/**
 * Nothing in this app is read from a store.
 *
 * Every query is stale the moment it lands, so every mount, every reconnect
 * and every return to the window goes back to the server. The paper used to
 * hold past editions and articles at `Infinity` because an article id names
 * fixed content for life — true, but it is not the whole question. An edition
 * can gain a late article, an article can be withdrawn or hidden, and a
 * period's story is re-ranked on every run. A reader who is told a stale
 * answer has no way to ask for a fresh one.
 */
export const STALE_ALWAYS = 0;

/**
 * How long an answer stays in memory after the last screen stops watching it.
 *
 * Not a cache the reader can read from across sessions — there is no durable
 * cache any more, and this one dies with the process. It exists so that going
 * back a screen paints the list you were just looking at while its refetch is
 * in flight, instead of a skeleton. Short, because a longer window buys
 * nothing: the copy is refetched on arrival either way.
 */
const GC_TIME = 5 * 60 * 1000;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_ALWAYS,
        gcTime: GC_TIME,
        // `'always'` rather than `true`: `true` refetches a *stale* query, and
        // although everything here is stale by the rule above, saying it
        // outright is what stops a per-query `staleTime` quietly reintroducing
        // a served-from-memory read.
        refetchOnMount: 'always',
        refetchOnReconnect: 'always',
        refetchOnWindowFocus: 'always',
        // A 404 means missing, unknown or hidden, and none of the three
        // improves on a retry.
        retry: (failureCount, error) => !isNotFound(error) && failureCount < 2,
        // No fetch timeout anywhere: a cold Render dyno was measured at 22.9 s,
        // and any timeout short enough to feel responsive would kill it.
      },
    },
  });
}
