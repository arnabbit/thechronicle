# 0002 — The masthead follows design-17, not the launcher mark

**Status:** accepted

Supersedes the masthead structure introduced by root ticket 19.

## Context

Root ticket 17 chose Candidate C: the dateline under the masthead is the period
control. Its boards — `design-17/Main.dc.html` at phone width and
`WebHome.dc.html` at web width — drew that masthead precisely, and they agree
with each other:

- **no rule above the wordmark**
- the wordmark at 30px
- the date **underlined**, in ink, at 11px/600, with a drawn chevron beside it
- one 1px ink rule closing the header
- the only 2px rule in the block is the active category tab's top border

17 explicitly deferred the placement of Search and Saved to ticket 11, which
answered "two quiet icons flanking the masthead". `WebHome` drew them instead as
a right-aligned utility row above the masthead, at web width only. No board ever
drew them at phone width.

Root ticket 19 then chose **Mark C** for the launcher icon — a hairline rule, a
heavy rule beneath it, a dateline bar under that — arguing that "the mark is the
app's own furniture". The masthead that shipped acquired exactly that silhouette:
a 1px grey hairline above the wordmark and a full-width 2px ink rule between the
wordmark and the date. **Neither appears on any board.** The masthead was
reshaped to match the icon rather than the icon derived from the masthead, and
in the process the date lost its underline and its chevron, keeping only a `▾`
character appended after two spaces in 10px meta grey.

Search and Saved shipped as words absolutely positioned at the wordmark's left
and right.

## Decision

**The drawing is the masthead.** Restore design-17's structure: no rule above
the wordmark, the wordmark at 30px, the date underlined in ink at 11px/600 with
a chevron, and one 1px ink rule closing the block. The full-width 2px rule is
removed.

**Search and Saved are a utility row above the masthead, at every width** —
`WebHome`'s arrangement, extended to phone rather than left as a web-only
treatment.

## Why the utility row, and not ticket 11's flanking icons

Measured with the shipping faces rather than estimated. `THE CHRONICLE` is 264px
at 30px; a 320px viewport leaves 272px between the 24pt insets.

| Arrangement | Width | 320px |
| --- | --- | --- |
| Words flanking the wordmark | 375px | overflows by 103px |
| Icons flanking the wordmark | 328px | overflows by 56px |
| Utility row | 115px | fits, unchanged from 390px |

**Nothing fits beside the wordmark on a small phone.** Icons clear it at 390px
but not at 320px, so ticket 11's answer would require the wordmark to step down
at narrow widths — two masthead sizes to maintain for one band of vertical
space. The utility row's width does not depend on the wordmark's, so it needs no
breakpoint, no type scaling, and no second set of numbers.

This also explains why 17 drew the row only at web width and handed the phone
case to 11: the phone case has no comfortable answer on that line, and 11
answered it without measuring.

## The defect this fixes

The absolute positioning concealed the overflow by letting the words overlap the
wordmark instead of pushing it. Measured overlap of `SEARCH` against the
wordmark's text box:

```
320px  50px     360px  30px     375px  22px     390px  15px     414px  clears
```

Every phone width was affected. It had only ever been looked at in a desktop
browser.

## Alternatives rejected

**Keep the mark's silhouette and leave the masthead alone.** The launcher icon
would keep agreeing with the masthead, which was 19's whole argument. Rejected
because the agreement was achieved by changing the wrong one of the two: the
masthead is what a reader looks at every day, the icon is what they tap once.
`scripts/build-app-icons.mjs` still emits marks D–G, so re-deriving the icon
from the restored masthead is a one-line change rather than a redesign.

**Icons flanking, with a responsive wordmark.** See the table. Two sizes of the
paper's name, forever, to avoid one row.

**Words flanking, with a responsive wordmark.** Words need 111px of the 272px
available at 320. Not recoverable by scaling.

**Search and Saved on the dateline row.** There is room — 318px of 342 at 390 —
but only two of the seven screens that render the masthead pass an `edition`, so
five of them have no dateline row for the affordances to live on.

**Adding `react-native-svg` for the chevron.** It would move the native
fingerprint, and under the `fingerprint` runtime policy (ADR-adjacent, F02) that
cuts every existing install off from JS updates. A 6px glyph is not worth that;
the chevron is two borders on a rotated view.

## Consequences

`type.masthead` drops from 32px to 30px and `letterSpacing` from −1.5 to −1.
The 32px size was itself over the 320px budget — 276px in a 272px box — so this
is a correctness change as much as a fidelity one.

A fifth Public Sans weight (600) is loaded, used by the dateline alone. The
paper has no other 600, and substituting the 500 or 700 already present would
restyle the one control on the front page to save one font file.

**An untappable dateline gets no underline and no chevron.** They are the
affordance; drawing them on inert furniture would be a lie. So the dateline now
looks materially different on `/` and `/edition/[date]` (where it opens the
period navigator) from everywhere else — which is correct, and was not visible
before because it looked inert everywhere.

The launcher mark and the masthead **no longer draw the same silhouette.** That
is a real cost, knowingly taken, and it reopens root ticket 19's icon choice as
a follow-up rather than settling it here.
