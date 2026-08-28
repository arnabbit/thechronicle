// The one wire shape in this app that was inferred rather than transcribed,
// and therefore the one place a payload will disagree with its type.
//
// Ticket 13 writes the field as `prose: {...}` and never expands it. Its
// round-3 answer does describe the *reading*: a short overall lede, then one
// paragraph per category that has enough in it, ordered by article count, with
// one- and two-article categories folded into a single trailing "also this
// month" line. `design-17/PeriodView.dc.html` drew only the middle third — the
// board pre-dates that answer — so the shape here follows the ticket and the
// screen renders all three parts.
//
// **Why this is parsed at all**, when nothing else in the app is: every other
// type was copied off a deployed endpoint and is checked by the endpoint
// existing. This one describes an endpoint that has never been written, whose
// prose half is LLM output on the far side of a backend that does not have an
// LLM key yet. The screen's entire design is that prose is a bonus it never
// waits for, so the honest failure mode is "a paragraph is missing", never a
// crash inside a `.map` over something that turned out not to be an array.
//
// Pure by construction: no imports, so the bare-Node suite can reach it.

/** One category's paragraph, in the period's own ranking. */
export interface ProseCategory {
  slug: string;
  /** The label the summary was *written* under. See `parsePeriodProse`. */
  name: string;
  text: string;
}

export interface PeriodProse {
  /** Two or three sentences about the period as a whole. */
  lede: string;
  /**
   * Ordered by the generator, never re-sorted here. The prose is where ranking
   * happens — ticket 13 settled that there is no headline list precisely
   * because the data cannot supply a ranking — so wire order *is* the ranking
   * and a client-side sort would overwrite the judgement it was asked for.
   */
  byCategory: ProseCategory[];
  /** The fold-in line for categories too thin for a paragraph, or nothing. */
  also: string | null;
}

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseCategory(value: unknown): ProseCategory | null {
  if (typeof value !== 'object' || value === null) return null;
  const entry = value as Record<string, unknown>;
  const slug = cleanString(entry.slug);
  const text = cleanString(entry.text);
  // A paragraph with no text is not a paragraph, and one with no slug has no
  // key to render under and no category to name.
  if (!slug || !text) return null;
  // `name` is carried alongside `slug` rather than joined to the skeleton's
  // categories on purpose. Prose is generated once and frozen; the skeleton is
  // recomputed on every read. If a category is ever renamed, a frozen summary
  // should keep the name it was written under instead of quietly acquiring a
  // new one. Empty is allowed — the screen falls back to `categoryLabel`.
  return { slug, name: cleanString(entry.name), text };
}

/**
 * `null` for anything with nothing to render — a missing field, a wrong type, a
 * shape that parses to no lede, no paragraphs and no fold-in line.
 *
 * `null` is what `prose` already means everywhere downstream: an open period,
 * or one whose summary has not been generated. Collapsing "malformed" into it
 * costs the screen no extra branch, and the branch it would have needed is the
 * one that cannot be worded honestly — a reader has no use for "the summary
 * arrived in a shape this build did not expect".
 *
 * Malformed *entries* are dropped individually, so one bad paragraph does not
 * take the other five with it.
 */
export function parsePeriodProse(value: unknown): PeriodProse | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;

  const lede = cleanString(raw.lede);
  const also = cleanString(raw.also);
  const byCategory = Array.isArray(raw.byCategory)
    ? raw.byCategory.map(parseCategory).filter((entry): entry is ProseCategory => entry !== null)
    : [];

  if (!lede && !also && byCategory.length === 0) return null;
  return { lede, byCategory, also: also || null };
}
