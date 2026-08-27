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
