# 0006 — The paper is read live

Date: 2026-11-01
Status: Accepted. Supersedes the durable-cache decision behind tickets 06 and
09.

## Context

The app kept a durable query cache: the answer to every edition, article and
period read was written to disk — `localStorage` on the web, SQLite on Android
— and restored at boot, so the paper opened in a tunnel. Past editions and
articles sat at `staleTime: Infinity` on the reasoning that an article id names
fixed content for life, and only `latest`-keyed reads were revalidated, at five
minutes.

That reasoning was true about an article's *text* and wrong about the paper. An
edition gains a late article filed into its date. An article is withdrawn or
hidden. A period's ranked list is re-ranked on every run and grows through the
grace window. A reader holding a cached copy of any of them had no way to ask
for a newer one, and would not have known to.

The second cost was invisible: a reader was being shown yesterday's paper on
the front page, correctly dated and perfectly stale, with no request in flight.

## Decision

**Every read goes to the server, every time.**

- `staleTime` is `0` everywhere, and `refetchOnMount`, `refetchOnReconnect` and
  `refetchOnWindowFocus` are all `'always'`. No per-query override reintroduces
  a served-from-memory read.
- Every request through the API client carries a cache-busting `_` parameter
  and `no-store` headers. The parameter is what makes this true rather than
  requested: `cache: 'no-store'` is ignored by React Native's fetch, which is a
  polyfill over `XMLHttpRequest`, and `Cache-Control` is a request to whatever
  sits in the middle.
- **There is no durable cache.** `src/api/cacheStore.ts`, its Android half, the
  dehydration predicate in `src/lib/persist.ts` and the restore gate at the
  root are gone, along with `expo-sqlite` and both persister packages.
- The prefetches whose only job was warming that cache are gone too: the
  current edition's bodies, and a bookmarked article's body. The archive index
  prefetch stays, because its job was always the first paint of the archive and
  not the tunnel.

What stays: the in-memory cache for the life of the process, with a five-minute
`gcTime`, so going back a screen paints the list you were just looking at while
its refetch is in flight.

**Offline detection stays and means what it says.** The `offline` screen state,
the `unavailableOffline` row state and the NetInfo binding are untouched. A
reader with no connection is told so — which is now the whole of the answer,
where before it was the fallback behind a cached copy.

## Consequences

The paper does not open without a connection. On the front page that is honest
and was already nearly true; on `/saved` it is a real loss, because a kept
article read in an earlier session now shows as `unavailableOffline` rather
than from disk. Only the bookmarks, the theme and the prompt counters survive a
restart.

Every screen entry is a request, so the reader pays a round trip where they
used to pay none — against a Render dyno that can be cold. The loading skeleton
is seen more often, and the in-memory cache is what keeps backwards navigation
from showing it.
