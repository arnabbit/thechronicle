// Every call the app makes to its own backend, and a direct transcription of
// ticket 04's closed contract:
//
//   GET /api/v2/editions                  ?cursor= &limit=    default 30, max 100
//   GET /api/v2/editions/:date            YYYY-MM-DD (IST) | "latest"
//   GET /api/v2/editions/:date/articles   ?category= &cursor= &limit=  default 20, max 50
//   GET /api/v2/articles/:id
//
// Cursors only — no page, no skip, no `total`. `latest` is a valid `:date`
// sentinel, so resolving today's paper costs one round trip and not two.
// Search, periods and the push registry are additive and land with their own
// tickets.

import { request } from '@/src/api/client';
import type { Article, EditionRow, FeedItem, Page } from '@/src/api/types';

export const FEED_PAGE_SIZE = 20;
export const EDITIONS_PAGE_SIZE = 30;

/** The sentinel that means "today's paper" without a round trip to resolve it. */
export const LATEST = 'latest';

interface Envelope<T> {
  has_next: boolean;
  next_cursor: string | null;
  editions?: T[];
  articles?: T[];
}

function toPage<T>(envelope: Envelope<T>): Page<T> {
  return {
    items: envelope.editions ?? envelope.articles ?? [],
    hasNext: envelope.has_next,
    nextCursor: envelope.next_cursor,
  };
}

/** The archive index: a paginated list of editions, newest first. */
export async function fetchEditions(cursor: string | null): Promise<Page<EditionRow>> {
  return toPage(
    await request<Envelope<EditionRow>>('/api/v2/editions', {
      limit: EDITIONS_PAGE_SIZE,
      cursor,
    }),
  );
}

/** One edition row — date, article count, and that day's categories. */
export async function fetchEdition(date: string): Promise<EditionRow> {
  return request<EditionRow>(`/api/v2/editions/${encodeURIComponent(date)}`);
}

/** One page of an edition's feed items. `category` of `home` carries no filter. */
export async function fetchEditionArticles(
  date: string,
  category: string,
  cursor: string | null,
): Promise<Page<FeedItem>> {
  return toPage(
    await request<Envelope<FeedItem>>(`/api/v2/editions/${encodeURIComponent(date)}/articles`, {
      limit: FEED_PAGE_SIZE,
      category: category === 'home' ? null : category,
      cursor,
    }),
  );
}

/** The full article. 404 for withdrawn, unknown and hidden alike. */
export async function fetchArticle(id: string): Promise<Article> {
  return request<Article>(`/api/v2/articles/${encodeURIComponent(id)}`);
}
