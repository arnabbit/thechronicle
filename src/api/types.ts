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
// story is LLM output, so its shape lives with the parser that defends it.

import type { PeriodStory, StoryStatus } from '@/src/lib/periodStory';

/** The string identifying a wire-contract generation. Ticket 09 pins the
 *  persisted cache's `buster` to this, so a v1-shaped cache cannot hydrate into
 *  v2 screens at cutover. Bump it whenever a payload shape changes. The period
 *  view's summary became its story, so a persisted period without one must not
 *  hydrate. */
export const WIRE_CONTRACT_VERSION = 'v2-story';

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
 * A stretch of the paper, aggregated.
 *
 * The **skeleton** — counts, categories, timeline — is a deterministic
 * aggregate and is always present, so the screen renders it unconditionally.
 * The **story** grows by one dated section per run, while the period is open
 * and for a short grace window after it closes. The screen never waits for it.
 */
export interface PeriodCategory extends Category {
  count: number;
}

export interface PeriodDay {
  /** YYYY-MM-DD, IST. */
  date: string;
  count: number;
}

/** The story's shape lives in `src/lib/periodStory.ts`, with its parser. */
export type {
  PeriodStory,
  StoryEntry,
  StoryEntryKind,
  StorySection,
  StoryStatus,
} from '@/src/lib/periodStory';

export interface PeriodView {
  id: string;
  kind: 'week' | 'month' | 'quarter' | 'year';
  range: { from: string; to: string };
  editionCount: number;
  articleCount: number;
  categories: PeriodCategory[];
  timeline: PeriodDay[];
  /** Sections and entries in wire order, which is the ranking. */
  story: PeriodStory;
  /** `none` when the period has nothing visible in it, `writing` while a run
   *  is due or queued, `ready` when caught up — possibly with no sections. */
  storyStatus: StoryStatus;
}
