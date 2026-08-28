// The v2 wire contract (ticket 04), hand-written. No codegen, no zod: there is
// no OpenAPI spec, and ticket 04 made the *server* responsible for every
// invariant the client leans on (`dek` never null, `category` always a slug,
// `hidden` filtered everywhere). Validating twice would only add a second place
// for the contract to drift.
//
// The app talks v2 and only v2: the v1 adapter that stood here during the
// restructure is gone, along with its client-side dek truncation. The server
// owns that fallback now, permanently, so there is exactly one implementation
// of it.
//
// The one exception, and the reason there is an import below at all: the period
// prose shape is *inferred*, not transcribed off a deployed endpoint, so it
// lives with the parser that defends it. See ADR 0001.

import type { PeriodProse } from '@/src/lib/periodProse';

/** The string identifying a wire-contract generation. Ticket 09 pins the
 *  persisted cache's `buster` to this, so a v1-shaped cache cannot hydrate into
 *  v2 screens at cutover. Bump it whenever a payload shape changes. */
export const WIRE_CONTRACT_VERSION = 'v2';

export interface Category {
  slug: string;
  name: string;
}

export interface EditionRow {
  /** YYYY-MM-DD, IST. */
  date: string;
  count: number;
  categories: Category[];
}

/** No body. Ticket 03 split the payload in two so a feed row never carries prose. */
export interface FeedItem {
  id: string;
  headline: string;
  /** Lowercase slug. */
  category: string;
  /** Never null — the server owns the fallback, permanently. */
  dek: string;
  /** YYYY-MM-DD, IST. The only date on the wire. */
  edition: string;
  developmentCount: number;
  sourceCount: number;
}

export interface Article extends FeedItem {
  body: string[];
  developments: { summary: string }[];
  sourcePosts: { postUrl: string; sourceHeadline?: string }[];
}

export interface Page<T> {
  items: T[];
  hasNext: boolean;
  nextCursor: string | null;
}

/**
 * A stretch of the paper, aggregated. Ticket 13's consolidated contract.
 *
 * The **skeleton** — counts, categories, timeline — is a deterministic
 * aggregate and is always present, so the screen renders it unconditionally.
 * The **prose** is synthesised once, on first view of a *closed* period, and
 * stored for ever; an open period is skeleton-only. Prose is therefore a bonus
 * the screen treats as optional, never a thing it waits for.
 *
 * Not deployed. Built against the contract behind `hasPeriod`.
 */
export interface PeriodCategory extends Category {
  count: number;
}

export interface PeriodDay {
  /** YYYY-MM-DD, IST. */
  date: string;
  count: number;
}

/**
 * The one shape in this file that is inferred rather than transcribed, so it
 * lives in `src/lib/periodProse.ts` with the parser that defends it and the
 * tests that are the only thing holding it to anything. See ADR 0001.
 */
export type { PeriodProse, ProseCategory } from '@/src/lib/periodProse';

export interface PeriodView {
  id: string;
  kind: 'week' | 'month' | 'quarter' | 'year';
  range: { from: string; to: string };
  editionCount: number;
  articleCount: number;
  categories: PeriodCategory[];
  timeline: PeriodDay[];
  prose: PeriodProse | null;
  /** `ready` when prose exists, `pending` while a closed period has not been
   *  summarised yet or the period is still open, `none` when there was nothing
   *  to summarise. The screen says which — it never implies prose is coming
   *  when it is not. */
  proseStatus: 'ready' | 'pending' | 'none';
}
