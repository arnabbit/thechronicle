import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import type { Persister } from '@tanstack/react-query-persist-client';
import { isNotFound } from '@/src/api/client';
import { createSqlitePersister } from '@/src/api/sqlitePersister';
import { WIRE_CONTRACT_VERSION } from '@/src/api/types';
import { canCacheOffline } from '@/src/capabilities';
import { isPersistable } from '@/src/lib/persist';

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
        // navigation snappiness only; eviction happens at the dehydrate step.
        gcTime: GC_TIME,
        // A 404 means missing, unknown or hidden, and none of the three
        // improves on a retry.
        retry: (failureCount, error) => !isNotFound(error) && failureCount < 2,
        // No fetch timeout anywhere: a cold Render dyno was measured at 22.9 s,
        // and any timeout short enough to feel responsive would kill it.
        //
        // `refetchOnReconnect` keeps its default of `true`, which is what makes
        // "reconnecting refetches `latest`-keyed queries only" true without a
        // rule of its own: Query refetches a reconnected query when it is
        // *stale*, and every immutable read above already sits at `Infinity`.
        // Past editions, past articles and the archive index are therefore
        // never stale, never refetched, and the only queries that come back
        // over the wire are the front page's — plus whatever was paused
        // mid-flight when the connection went, which resumes rather than
        // refetches.
      },
    },
  });
}

/**
 * Where the persisted cache lives, and what busts it.
 *
 * The buster is the wire-contract version string, so a contract change
 * discards the stored blob rather than restoring it and mis-parsing it against
 * a shape that no longer exists.
 */
const CACHE_KEY = 'chronicle.query-cache';

/**
 * Two stores, one seam.
 *
 * **Android gets SQLite.** AsyncStorage there is a 6 MB database this managed
 * app cannot resize, and the persister writes the whole cache as one row —
 * which Android's 2 MB `CursorWindow` refuses to read back. See
 * `sqlitePersister.ts` for the measurements.
 *
 * **The web keeps AsyncStorage**, where it is `localStorage`: no
 * `CursorWindow`, no SQLite cap, and therefore none of the ceiling this split
 * exists to remove.
 *
 * The choice is made here and nowhere else. No screen, no hook and no route
 * file can tell which store is active, and `src/capabilities.ts` goes on
 * answering what the platform *can do* rather than which database it uses.
 */
function createPersister(): Persister {
  if (canCacheOffline) return createSqlitePersister();
  return createAsyncStoragePersister({
    storage: AsyncStorage,
    key: CACHE_KEY,
    throttleTime: 5000,
  });
}

/**
 * `maxAge: Infinity`, deliberately. The persister's own default is 24 hours,
 * which would throw the whole cache away between sessions and leave the tunnel
 * reader with nothing — the exact failure this cache exists to prevent. Age is
 * decided per query at the dehydrate step instead, where 90 days is the rule.
 */
export const persistOptions = {
  persister: createPersister(),
  maxAge: Infinity,
  buster: WIRE_CONTRACT_VERSION,
  dehydrateOptions: {
    // The one place eviction happens. The predicate is pure and under test;
    // this is the adapter that reads a live query into its three inputs.
    shouldDehydrateQuery: (query: {
      queryKey: readonly unknown[];
      state: { dataUpdatedAt: number; status: 'pending' | 'error' | 'success' };
    }) =>
      isPersistable(
        {
          queryKey: query.queryKey,
          dataUpdatedAt: query.state.dataUpdatedAt,
          status: query.state.status,
        },
        Date.now(),
      ),
  },
};
