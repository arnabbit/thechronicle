# Context

The paper's own vocabulary. A glossary and nothing else — no implementation
detail, no decisions. Decisions live in `docs/adr/`.

## The paper

**Edition** — one day's paper, addressed by its IST date (`2026-08-27`) or by
the sentinel `latest`. An edition is immutable once published: a date names the
same set of articles for ever.

**Article** — one piece in one edition. Its id is derived from its content and
its edition's date key, so an id names fixed content for life. An article can
stop *existing* (withdrawal, hiding), but it cannot change.

**Withdrawn** — an article whose id used to resolve and now 404s. Distinct from
**hidden**, which is an article the backend excludes from every read; a reader
cannot tell the two apart and does not need to.

**Dek** — the standfirst under a headline. **Kicker** and **slug** are the small
ruled capitals above and beside things; **furniture** is the collective word for
all of it — datelines, counts, controls — as opposed to prose.

**Developments** — the running updates attached to an article.

## Time

**IST** — the paper's timezone, UTC+5:30, fixed. Every date in the app is an IST
calendar date, never a moment. "Today" means today in IST regardless of where
the reader is.

**Period** — a calendar interval over the archive: a **week** (ISO-8601,
`2026-W35`), a **month** (`2026-08`), a **quarter** (`2026-Q3`) or a **year**
(`2026`). A period always exists as an interval, whether or not any paper was
published inside it. Its four kinds are collectively its **kind**.

**Open period** — one whose last day is today or in the future; still
accumulating editions. **Closed period** — one whose last day has passed.
A closed period can never change, because a new article can never be given a
past date key.

**Empty period** — a valid, in-range period that contains no editions. This is
the commonest answer the period screen gives, not a failure. Distinct from a
period **outside the paper's run**, which does not resolve at all.

## A period view

**Skeleton** — the deterministic aggregate half of a period: edition count,
article count, per-category counts, and the day-by-day timeline. Always present,
always truthful, computable retroactively.

**Prose** — the synthesised half: written retrospective, generated once from the
period's headlines when a closed period is first viewed, then stored for ever.
A bonus the screen never waits for. Its three parts are the **lede** (a few
sentences about the period as a whole), one paragraph **per category**, and the
**fold-in line** — the single trailing sentence covering categories too thin to
earn a paragraph.

**Ranking** — prose *is* the ranking. There is no headline list in a period view
and nothing is sorted on the client, because the underlying data cannot supply
an ordering and the generated sentences can.

## States

**Screen state** — what a whole screen has to say when it cannot show content:
`loading`, `offline`, `error`, `empty`, `missing`. Absence of a screen state
means there is content.

**Row state** — how one row in a list is degraded while the screen around it is
fine: **dead** (the article is gone) or **unavailableOffline** (its body is not
on this device and the connection is). Told apart structurally, never by shade.

**Paused** — a fetch the query layer is holding rather than attempting, because
it believes there is no connection. A paused fetch has not failed and will not
while the connection is gone, so it is offline rather than loading.

## The reader's side

**Saved** — an article the reader kept. The store holds only an id and the time
it was kept; everything shown about it comes from the cache or a fresh read.

**Durable cache** — the query cache written to disk so the paper opens without a
connection. Backed by `localStorage` on the web and SQLite on Android; what is
kept is decided by one rule that never learns which store is underneath it.

**Hand-installed** — an Android build a reader side-loaded, which cannot update
itself. The web build is always current and is the alternative.

## Availability

**Backend surface** — whether an endpoint exists to call yet (search, periods).
A fact about the deployment.

**Capability** — whether *this platform* can do a thing (share sheet,
notifications). A fact about the device. The two are separate seams and are
never conflated: a surface can be missing on a platform that could use it.
