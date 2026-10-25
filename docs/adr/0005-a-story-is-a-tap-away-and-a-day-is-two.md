# 0005 — A story is a tap away, and a day is two

Date: 2026-10-25
Status: Accepted. Supersedes ADR 0004's screen section; the rest of ADR 0004
still holds.

## Context

Two complaints about reading the past.

**The period story read as a wall.** ADR 0004 printed every story whole on the
period screen: headline, backstory, each update and correction. A month holds
about 20 stories, and the reader scrolled through all of their parts to find
the one they wanted. The daily feed already solved this: a headline and a dek,
with the article one tap behind them.

**An earlier day was four taps away.** The dateline opened the navigator, and
the navigator offered only weeks, months, quarters and years. A day's paper was
reached through "All editions", then the archive, then a scroll, then a tap.

Mockups were reviewed on 2026-10-25. Of three layouts per problem, the ranked
list (2A) and the navigator that opens on days (1C) were chosen.

## Decision

**The period screen lists stories; it does not print them.** Each row is the
rank, the headline, the story's **summary** — the first paragraph of its first
part, cut at three lines — and one line of what followed: "2 updates · 1
correction · latest 29 August", or "Backstory only · 21 August". The list leads
the screen; the publishing rhythm and the sections follow it.

**The story is its own screen,** `/period/:id/:story`. It shows the period and
the rank ("August 2026 · No. 1 of 20"), the headline, the span of its parts,
then every part as ADR 0004 drew them. At its foot: the next story, and the way
back to the list. Moving to the next story replaces the screen, so back is
still the list.

**A story is addressed by its thread id,** so a re-rank between two visits
still finds it. A story with no thread id is addressed by its rank
(`no-3`), as a fallback. A story that has left the list says so; it is not
shown from memory.

**The navigator opens on Day.** Day leads the switcher and is its default. It
lists the editions the index holds under their months, newest first. The newest
opens the front page; any other opens that day's edition. Older days are one
"Earlier editions" press on, a page of the index at a time. The archive's own
switcher does not offer Day: the archive is the list of days.

## Consequences

- Any day the index holds is two taps from any dateline.
- A month's period screen shows its stories in about one screen of headlines
  rather than twenty screens of text.
- A link to a story names its period too. The story screen fetches the whole
  period; arriving from the list, it is already cached.
- The period route moved from `app/period/[id].tsx` to
  `app/period/[id]/index.tsx`. Its URL is unchanged.
- With five segments, the switcher in the navigator labels Quarter "Qtr". Its
  accessibility label still says Quarter.

## Alternatives rejected

- **Earlier and later arrows on the dateline (1A).** One tap to the next day,
  but no way to jump. Not chosen at review.
- **A strip of recent dates under the masthead (1B).** A second row that
  scrolls sideways above the categories, paid for on every screen.
- **Expanding a story in place (2C).** It keeps the reader on the list, but the
  page grows under them and the story has no address to share.
- **A lead story over a compact list (2B).** It gives the rank a visual weight,
  but every story below the first lost its summary.
