# Context

The paper's own vocabulary. A glossary and nothing else — no implementation
detail, no decisions. Decisions live in `docs/adr/`.

A term that also appears in the backend's own `CONTEXT.md` means the same thing
on both sides. When it changes, it changes in both files.

## The paper

**Edition** — one day's paper, addressed by its IST date (`2026-08-27`) or by
the sentinel `latest`. An edition can still gain articles after it is published,
when the publisher files a late one into its date.

**Article** — one piece in one edition. Its id is derived from its content and
its edition's date key, so an id names fixed content for life. An article can
stop *existing* (withdrawal, hiding), but it cannot change.

**Withdrawn** — an article whose id used to resolve and now 404s. Distinct from
**hidden**, which is an article the backend excludes from every read; a reader
cannot tell the two apart and does not need to.

**Dek** — the standfirst under a headline. **Kicker** and **slug** are the small
ruled capitals above and beside things; **furniture** is the collective word for
all of it — datelines, counts, controls — as opposed to headlines and body text.

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
accumulating editions. **Closed period** — one whose last day has passed. It is
normally settled but can still change: its story grows through the grace
window, and a late article filed into one of its editions is new evidence for
it.

**Empty period** — a valid, in-range period that contains no editions. This is
the commonest answer the period screen gives, not a failure. Distinct from a
period **outside the paper's run**, which does not resolve at all.

## A period view

**Skeleton** — the deterministic half: edition count, article count,
per-category counts, and the day-by-day timeline. Always present, always
truthful, computable retroactively.

**Thread** — one running story across editions ("the ceasefire talks"). Global
and shared by every period, so a week and a year agree on what one story is.
Every article belongs to exactly one.

**Important story** — a thread that passes four checks inside a given period:
**verified**, **material change**, **consequences** and **lasting**. Judged over
the period's evidence to date, never within one day, and against that period's
own range, so a story can be important in its week and not in its year.

**Period story** — the growing article for one period, telling only its
important stories. It grows at the end, one section at a time; what is already
written stays as written. The screen never waits for it.

**Section** — one dated part of a period story, written by one run for one
edition date. Frozen once its date has passed; only a section dated today can
still be rewritten. A run that finds nothing important writes no section.

**Entry** — one item in a section. **New**: an important story told for the
first time, from its start in the period. **Update**: only what is new in an
admitted story since its last entry. **Correction**: what an earlier entry got
wrong, appended; the earlier text is not edited.

**Admitted** — a thread that has a new entry in a period story. Only an
admitted thread gets updates or corrections. Admission is per period.

**Grace window** — the 3 days after a period's last day. Editions inside it are
evidence for the period and can still admit stories that happened inside it;
they are never cited, and a run inside it only admits.

**Ranking** — the story order is the ranking. Sections read by date, and entries
within a section in the editor's order of importance. A period view has no
headline list and nothing re-sorts the story downstream: the order it is stored
in is the order it means.

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
