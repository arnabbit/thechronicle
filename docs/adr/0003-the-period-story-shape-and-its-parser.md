# 0003 — The period story's shape, and the parser that defends it

Date: 2026-09-25
Status: Superseded by ADR 0004 (the section layout; the rest still holds). Supersedes ADR 0001.

## Context

The period view's written half used to be **prose** — a lede, one paragraph per
category and a fold-in line — whose shape ADR 0001 had to infer, because the
screen was built before the endpoint. Backend ADR 0005 replaced prose with the
**period story**: one growing article per period, telling only its important
stories, a dated section per run, grown at the end and never rewritten.

This time the shape is not inferred. The backend was built first, and
`GET /api/v2/periods/:id` now answers:

```
{ id, kind, range, editionCount, articleCount, categories, timeline,   ← skeleton, unchanged
  story: { sections: [{ date, entries: [{ threadId, kind, headline, paragraphs,
                                          articleIds, continuesFrom }] }] },
  storyStatus: 'none' | 'writing' | 'ready' }
```

`kind` is `new`, `update` or `correction`. `prose` and `proseStatus` are gone,
in the same release as this change (backend ADR 0005, D11).

What ADR 0001 got right still holds: the text is LLM output, so it is the one
part of the app's wire that must be parsed rather than trusted.

## Decision

**The shape lives in `src/lib/periodStory.ts`**, next to `parsePeriodStory`,
`parseStoryStatus` and the tests in `test/period-story.test.ts`. `src/api/types.ts`
re-exports the types. `src/lib/periodProse.ts`, its tests and `PeriodProse` are
removed.

**The payload is parsed at the fetch boundary**, in `fetchPeriod`, so the
normalised shape is what enters the cache and what the persister writes to
disk. Only the named fields are kept, so a field the wire drops cannot ride
along into the cache.

**The parse is defensive, one level at a time.**

- An entry drops alone when its `kind` is unknown, its headline is empty, or it
  has no non-empty paragraph. The rest of its section renders.
- A section drops when its date is not an edition date or none of its entries
  survive.
- `continuesFrom` that is not an edition date becomes `null`.
- `articleIds` may be empty. The backend removes hidden articles' ids and still
  serves the text, which was written and frozen.
- **`parsePeriodStory` always returns a story.** Anything unreadable is a story
  with no sections, never `null` — `storyStatus` says why there is nothing, so
  the story itself does not have to.
- An unknown `storyStatus` reads as `ready`: the screen shows what arrived and
  does not promise more.

**Wire order is the reading order, and nothing sorts it.** Sections by date,
entries in the editor's order of importance. The story order is the ranking.

**The screen reads `storyStatus` and nothing else to choose its words.**

| State | What the reader sees |
|---|---|
| `none` | the existing empty-period state |
| `writing`, no sections | "This period’s story is being written." |
| `writing`, sections | the sections, then "More is being written." |
| `ready`, no sections | "Nothing in this period passed the test for an important story." |
| `ready`, sections | the sections |

ADR 0001's rule — derive closed-ness from `range.to` because `pending` meant two
things — is gone with `pending`. None of the three statuses is ambiguous.

**An `update` names the section it continues.** "Continued from <date>" scrolls
to that section when it is in this story, and is plain text when it is not. A
`correction` is marked and set quieter, never hidden. Each entry opens its first
article, and lists the rest as numbered reports, because the wire carries ids
and not headlines.

**Every period is stale after five minutes**, the same as `latest`, closed or
not. A story grows while its period is open, through the three-day grace window
after it closes, and when an edition is filed late — so no period is immutable,
and a reopened period shows a newly added section within five minutes.

**`WIRE_CONTRACT_VERSION` is `v2-story`.** It is the persisted cache's buster, so
a period stored on disk in the prose shape is discarded rather than hydrated
into a screen that reads a story. Without the bump, a cached period has no
`story` and the screen crashes on it. The buster is one value for the whole
persisted cache, so the bump discards all of it, not only periods.

## Consequences

- The skeleton is still deliberately **not** parsed. It comes off a
  deterministic aggregate, and if it is wrong the screen has nothing to fall
  back to.
- An install still running the previous bundle finds no `prose` and renders
  the skeleton with no written half until it updates. Accepted: both sides ship
  together, and the skeleton renders either way.
- A backend deployed without its model key reports `writing` for every period
  with articles, so the screen says the story is being written, for as long as
  the key is missing. That is true of the backend's state, not of the story.
- **The upgrade clears the whole persisted cache**: every edition and article
  saved for offline reading, not only periods. The first launch after it needs
  the network to show anything, and until the reader opens them again nothing
  is available offline. Accepted: it happens once, and the other way is a
  crash on every cached period.
- An entry whose articles were all hidden keeps its text and loses its links.
- Frozen sections mean a reader who reopens a period can read on from where
  they stopped: nothing dated before today has moved.

## Alternatives rejected

- **Keep ADR 0001's shape and parser beside the new one.** Rejected: the wire
  no longer carries prose, and a parser for a field nobody sends is a test of
  nothing.
- **Structural trust, no parser.** Rejected for the reason ADR 0001 gave, and it
  is stronger now: the story is written by a model on every run, not once per
  period.
- **Drop a whole section when one entry is bad.** Rejected: the other entries
  were validated on the backend and are the story; one bad item should cost one
  item.
- **`null` for "no story".** Rejected: it would say the same thing as a status
  and could disagree with it.
- **Sort on the client** — by kind, by category, by thread. Rejected: the order
  is the editor's judgement of importance, and sorting would discard it.
- **Keep closed, settled periods at `Infinity`.** Rejected: the grace window and
  late filings mean a closed period's story still grows.
- **Name the other articles on an entry.** Rejected for now: it needs a headline
  per id, and the wire carries ids only. A read per id to label a link is not
  worth it.
