# 0001 — The period prose shape is inferred by the client, and parsed defensively

Date: 2026-08-28
Status: Accepted

## Context

`GET /api/v2/periods/:id` does not exist. Ticket 13 settled its response as
`{ id, kind, range, editionCount, articleCount, categories, timeline, prose, proseStatus }`,
but wrote the prose field as `prose: {...}` and never expanded it. Every other
wire type in `src/api/types.ts` was transcribed off a deployed endpoint; this
one had to be guessed at, because the period screen was built before the
endpoint that feeds it.

Two sources describe the prose, and **they disagree**:

- **Ticket 13's round-3 answer** specifies three parts: a short overall lede
  (2–3 sentences), then one paragraph per category with enough in it, ordered by
  article count, with one- and two-article categories folded into a single
  trailing "also this month" line.
- **`design-17/PeriodView.dc.html`** draws only the middle third — three
  per-category paragraphs, no lede, no fold-in line.

The app originally modelled the board: `{ byCategory: [{slug, name, text}] }`.
That is two of the contract's three parts missing.

A further complication: the backend has no period code at all, and its prose
half additionally waits on Render gaining an LLM key. So whatever the client
parses today is very likely what the endpoint will eventually be built to
produce — the inference is load-bearing, not provisional.

## Decision

**The ticket wins over the board.** `PeriodProse` is
`{ lede: string; byCategory: ProseCategory[]; also: string | null }`. Round 3 is
the later decision, and the board pre-dates it.

**The shape lives in `src/lib/periodProse.ts`, not in `src/api/types.ts`**, next
to `parsePeriodProse` and the tests that are currently the only thing holding it
to anything. `src/api/types.ts` re-exports the type.

**The payload is parsed at the fetch boundary**, in `fetchPeriod`, so the
normalised shape is what enters the cache and what the persister writes to disk.
Malformed entries are dropped individually; a shape with no lede, no paragraphs
and no fold-in line collapses to `null`, which is what `prose` already means
downstream (an open period, or one not yet summarised).

**Per-category `name` is carried on the prose entry** rather than joined to the
skeleton's `categories`, even though that duplicates it.

**`proseStatus: 'pending'` is not trusted to say whether the period is open.**
It means two things — still accumulating, and closed but not yet summarised —
so the screen derives closed-ness from `range.to` against today, the same
comparison `usePeriod` makes for staleness, and words the two cases separately.

## Consequences

- The skeleton is deliberately **not** parsed. It comes off a deterministic
  aggregate query, and if it is wrong the screen has nothing to fall back to.
- If the endpoint is built to the board instead of the ticket, nothing breaks:
  the parser accepts paragraphs-only and the screen renders paragraphs. A test
  pins that case.
- The client never re-sorts `byCategory`. Ticket 13 removed the headline list
  precisely because the data cannot supply a ranking, which makes the prose the
  ranking — so wire order is the judgement, and sorting would discard it.
- Carrying a duplicated `name` means a renamed category keeps, inside a frozen
  summary, the name it was written under. That is the point: prose is generated
  once and stored for ever, while the skeleton is recomputed on every read. The
  cost is that the two can differ on screen, which is correct rather than a bug.
- **This ADR is the contract the endpoint should be built to.** It is recorded
  in the consumer because that is where the inference was made; there is nothing
  to record in the backend repo until period code exists there.

## Alternatives rejected

- **Keep the board's shape.** Rejected: it silently drops a settled requirement,
  and the lede is the only place a period gets a sentence about itself.
- **Structural trust, no parser.** Rejected: this is the one type in the app that
  no endpoint has ever checked, and the screen's whole design is that prose is
  optional. Trusting a bad payload crashes inside a `.map`; dropping one costs a
  paragraph.
- **`text: string[]`.** Rejected: the contract says "one short paragraph", and
  an array invites the generator to fill it.
- **Slug-only entries, joined to `categories` for the label.** Rejected for the
  frozen-name reason above.
- **Wait for the endpoint before modelling anything.** Rejected: the screen was
  in scope and shipping it behind `hasPeriod` with no model would mean guessing
  later anyway, with the guess undocumented.
