import { QueryClient } from '@tanstack/react-query';
import { isNotFound } from '@/src/api/client';

/** 5 minutes — mirrors ticket 04's `max-age=300` on anything resolved through
 *  `latest`, which is the only shape that can change under a reader. */
export const STALE_LATEST = 5 * 60 * 1000;

/** Past editions, articles and closed periods are immutable (tickets 02, 13),
 *  and ticket 01 made an article id's content fixed for life. Revalidating any
 *  of them is pure waste. `/saved`'s bookmark revalidation is the one
 *  documented exception — it must be able to observe a 404. */
export const STALE_IMMUTABLE = Infinity;

const GC_TIME = 24 * 60 * 60 * 1000;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_LATEST,
        // Not an eviction mechanism — its timers restart on every cache
        // restore and sessions are minutes long. This is here for in-session
        // navigation snappiness only; ticket 09 evicts at the dehydrate step.
        gcTime: GC_TIME,
        // A 404 means missing, unknown or hidden, and none of the three
        // improves on a retry.
        retry: (failureCount, error) => !isNotFound(error) && failureCount < 2,
        // No fetch timeout anywhere: a cold Render dyno was measured at 22.9 s,
        // and any timeout short enough to feel responsive would kill it.
      },
    },
  });
}
