# 0004 — The period story is a ranked list of stories

Date: 2026-09-25
Status: Accepted. Supersedes ADR 0003's section layout; the rest of ADR 0003
still holds.

## Context

ADR 0003 laid the period story out as dated sections, one per run, each a list
of new, update and correction entries, with "Continued from" links between
them. In use it produced about 90 entries a month. The same story came back day
after day under a new date, and the reader had to follow links backwards to
read one story whole. The layout was rejected.

The backend now serves a **ranked list** of about 20 big stories per month.
`GET /api/v2/periods/:id` answers:

```
{ id, kind, range, editionCount, articleCount, categories, timeline,   ← skeleton, unchanged
  story: { stories: [{ threadId, headline,
                       parts: [{ date, kind, paragraphs, articleIds }] }] },
  storyStatus: 'none' | 'writing' | 'ready' }
```

`kind` is `backstory`, `update` or `correction`. Stories come most important
first. Parts come in date order.

## Decision

**One story is one thread, told in one place.** A headline, then its parts in
date order: the backstory first, then each update and correction appended
under it. There are no date dividers, no "Continued from" and no scrolling to
a section.

**The parse is defensive, one level at a time.** It stays in
`src/lib/periodStory.ts`, at the fetch boundary.

- A part drops alone when its date is not an edition date, its `kind` is
  unknown, or it has no non-empty paragraph. The rest of its story renders.
- A story drops when its headline is empty or none of its parts survive.
- `articleIds` may be empty. The backend removes hidden articles' ids and still
  serves the text.
- `parsePeriodStory` always returns a story. Anything unreadable is a story
  with no stories in it, never `null`.
- An unknown `storyStatus` reads as `ready`.

**Wire order is the reading order, and nothing sorts it.** Stories by rank,
parts by date. The rank can change between runs and a story can drop out; the
screen shows the list as it was served.

**The screen** is a numbered list: the rank, the headline, then the parts. A
backstory is its paragraphs. An update carries a small date label ("9
September") before its paragraphs, so it reads as appended. A correction is
marked "Correction" and set quieter, never hidden. Each part opens its first
article and lists the rest as numbered reports, as before.

**The status wording is unchanged.**

| State | What the reader sees |
|---|---|
| `none` | the existing empty-period state |
| `writing`, no stories | "This period’s story is being written." |
| `writing`, stories | the stories, then "More is being written." |
| `ready`, no stories | "Nothing in this period passed the test for an important story." |
| `ready`, stories | the stories |

**`WIRE_CONTRACT_VERSION` is `v3-stories`.** A period stored on disk in the
section shape is discarded rather than hydrated. As with ADR 0003, the bump
discards the whole persisted cache, not only periods.

**Still as ADR 0003 decided:** the skeleton is not parsed; only the named
fields are kept; every period is stale after five minutes; the screen reads
`storyStatus` and nothing else to choose its words.

## Consequences

- A month reads as about 20 stories, not about 90 entries, and each story is
  read whole in one place.
- The rank can change between two visits. A reader who comes back may find a
  story higher, lower, or gone. Accepted: the rank is the editor's current
  judgement, and an old rank would be a stale one.
- A story that drops out and later returns keeps its text; that is the
  backend's rule, and the screen does nothing for it.
- The upgrade clears the whole persisted cache once, as the ADR 0003 upgrade
  did. The first launch after it needs the network.
- A part whose articles were all hidden keeps its text and loses its links.
- `sectionDateLabel` is removed. The update label uses `formatDayMonth`.

## Alternatives rejected

- **Keep the sections and group entries by thread on the client.** Rejected:
  it is a client-side re-sort of what the backend ranks, and the backend now
  serves the grouping itself.
- **Sort stories or parts on the client.** Rejected: the story order is the
  ranking and the part order is the date order. Both come from the wire.
- **Drop a whole story when one part is bad.** Rejected: one bad item should
  cost one item.
- **Date every part, the backstory too.** Rejected: the backstory is the start
  of the story, and a date on it reads as one more update.
