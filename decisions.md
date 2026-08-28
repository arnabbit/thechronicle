# Decisions — tickets 07, 08, 09, 11, 12, 13

One branch, `feature/app-v2-remainder`, off `origin/develop` at `7fd7910`. Nine commits, in
ticket order. Not merged, not pushed.

Read the **Unverified** and **Needs your call** sections first — everything else is here so you can
audit a decision rather than rediscover it.

---

## What shipped

| Ticket | Commit | What it is |
|---|---|---|
| — | `fd204a5` (part) | Audit fix: state screens against the design-18 prototypes |
| 07 | `fd204a5` | Bookmarks, share, the saved list, and the two degraded row states |
| 08 | `742f952` | Period navigator overlay, the sheet/popover split, period arithmetic |
| 09 | `14fe265` | The period route |
| 11 | `147c746` | End-of-feed slot and notifications |
| 12 | `901d5fe` | Update delivery |
| 13 | `b168e36` | SQLite cache on Android |
| — | `c779e19` | Period screen's own `missing` copy |
| — | `92fb67a` | Keeping `expo-sqlite` out of the web bundle |

Gates, on the final commit: **108 tests** (54 → 108), `tsc --noEmit` clean with strict typed
routes, `expo lint` clean, `expo export --platform web` clean with `_redirects` intact.

---

## Decisions you may want to reverse

### 1. The notice block moved. It affects every state screen in the app.

Auditing against `design-18/Offline.dc.html` and its siblings: **all four prototype boards centre
the notice on both axes over a 56 px rule**, and the build had shipped it left-aligned over a 48 px
one, hung off the top-left. The measure was 460 px against the prototype's 288.

Changed to match the prototypes. This is the one change in this branch that touches screens no
ticket named — every `offline`, `error`, `missing` and `empty` state moves. The slow-load notice
inside the skeleton deliberately did **not** move: it sits above feed-shaped rows and has to keep
their left margin, or the skeleton reads as two unrelated things stacked.

### 2. Saved rows use the app's type scale, not the prototype's.

`design-18/RowStates.dc.html` sets saved rows at 21 px headline / 15 px dek. The app ships 24 / 17,
and the prototype's *own* feed board (`design-17/Main.dc.html`) is 23 / 16. Three scales for one
row is worse than a 2 px difference from one board, so saved rows use `type.headline` and
`type.dek` like every other row. Everything else in that prototype — the structural distinction,
the copy, the Remove control's ruled-caps treatment, the Offline tag — was taken exactly.

### 3. `canCacheOffline` has been deleted.

It answered "is this platform online-only". Both platforms persist the cache now, so it was no
longer true, and after the store became a file split nothing read it either. A capability that is
unread *and* states a fact that has changed is worse than no capability. If you want the web to
stop persisting, that is a one-line change in `src/api/cacheStore.ts`, not a restored flag.

### 4. There is now a second platform file split, and ticket 08 said there would be one.

`src/api/cacheStore.ts` / `.native.ts`. Not a stylistic branch: importing `expo-sqlite` from any
module the web build reaches pulls its WASM worker into the web bundle, and Metro cannot resolve
`wa-sqlite.wasm`. Measured in the export output. A capability flag cannot fix it — the bundler
resolves imports statically and does not care which branch runs. The alternative was shipping an
unresolvable import on a build with no use for SQLite.

### 5. The archive's switcher opens the navigator rather than regrouping the archive in place.

Ticket 08 says the archive "hosts the same switcher at the top of its own screen, over its flat
edition list". Two readings: the archive grows a second mode that groups its own list, or the
switcher is an entry point to the one bucket list that already exists. Took the second — one bucket
list in one overlay, rather than an archive with two modes that have to be kept in step.

### 6. The navigator's buckets come from the archive index, not from the backend.

This is what makes the switcher *work* today with `hasPeriod` off. Grouping edition dates by week,
month, quarter or year is arithmetic, and the index is already in the cache. The counts are
therefore truthful about **what the app has loaded** — the first index page, 30 editions — not
about the whole archive. With the flag off a bucket is a line of information rather than a control,
and "All editions" is the way through, so nothing leads to a dead screen.

### 7. Prefetch reading, carried forward from ticket 06.

"On the archive screen the editions index prefetches" is built as the index being prefetched *for*
the archive, fired from the front page. Prefetching a query on the screen that already mounts it is
a no-op by construction. Unchanged from what ticket 06 recorded.

---

## Copy I wrote, that no approved table covers

Ticket 18's table has no line for any of these. All of it is in the paper's voice and none of it is
approved. **This is the shortest list of things to review.**

| Where | Copy |
|---|---|
| Notification offer | "When the paper lands — The Chronicle can tell you when a new edition is published. One notification a day at most, and never for a paper you are already reading." / *Notify me* · *Not now* |
| After declining | "Notifications are off — You can turn them on later in Android settings, under Apps, The Chronicle, Notifications." / *Understood* |
| Update notice | "A newer build — Version X is available. This build is installed by hand, so it does not update itself." / *Get it* · *Not now* |
| Period, malformed id | "Not in the paper — That is not a period this paper can show. A period is a week, a month, a quarter or a year — 2026-W35, 2026-08, 2026-Q3, or 2026." |
| Period, 404 | "This period is not available. It may be outside the paper's run, or the link may be wrong — we cannot tell which." |
| Period, open | "This period is still open. A written summary is added once it closes." |
| Period, no prose | "No written summary for this period." |
| Navigator | "Browse by period", "All editions →" |
| Period sections | "Publishing rhythm", "Sections that ran", "A month at a glance" |

The period 404 line exists because `missing`'s approved line says *"This article is not
available"* and a period is not an article. The spec already records that as an open copy question
inherited from ticket 18 — this is that question arriving.

Save and share have **no prototype at all**. The two controls are built from the paper's own
vocabulary — ruled standing caps at the dateline's weight, on the dateline's line, above the heavy
rule — so they read as masthead furniture rather than as an interruption between the headline and
the first paragraph, and so a reader can keep an article without scrolling it first.

---

## The Android pass — done

Ran on the physical device (M2004J19PI, Expo Go, SDK 54) on 2026-08-28. Device left as found: night
mode `no`, airplane mode off, `stayon false`, reverse rules removed, dev server killed, ports free.

**Verified on device:**

- **The bottom sheet** — the whole point of the platform split, and it had never rendered. Opens from
  the dateline caret, grabber above a "BROWSE BY PERIOD" head, the active segment inverts, and the
  bucket rows carry counts. **Week** gives `24–30 August` 4, `17–23 August` 7, `10–16 August` 1,
  `3–9 August` 2; **Month** gives August 14, July 5, May 1, April 10 — summing to the 30 loaded
  editions, the same arithmetic the web popover produced.
- **The back gesture dismisses it** and stays on the screen rather than popping the route.
- **The SQLite persister.** Killed the process with `am force-stop`, put the phone in airplane mode,
  cold-started: **the front page rendered the whole paper from disk** — dateline, category rail, four
  headlines with deks. `cacheStore.native.ts` is the only store in the Android bundle, so a cold
  restore with no network *is* that code working. It has now opened a database.
- **`seedLatestFromCache` on Android.** The same screen proves it: the front page addresses the
  edition by the `latest` sentinel, which is deliberately never persisted, so without the seeding
  this would have said "No connection". That ticket-06 fix had only ever been confirmed on web.
- **No restore flash** — the cold start showed content, never the skeleton.
- **Save, share and the saved list.** SAVE → SAVED; the control reads *Share* on Android and opens
  the system share sheet (cancelled without choosing a target); `/saved` lists the row; the bookmark
  survived a process kill, so the zustand persist works on Android.
- **The OFFLINE tag** on the saved list's section head, offline. The row correctly keeps category,
  ink and dek at full strength, because its body *is* cached — not `unavailableOffline`.
- **A saved article read offline**, cold: full body, developments and sources, from disk.
- **Reconnect.** Airplane off, then `/period/2026-08`: the paused fetch resumed, the request went
  out, the non-existent endpoint 404'd, and the screen rendered `missing` rather than sitting in
  `loading`.
- **The centred notice block** (decision 1) on device, on the period screen's own 404 copy.
- **The notification offer**, at the end of the feed: "WHEN THE PAPER LANDS", left-aligned with the
  rows above it as an inline prompt should be, NOTIFY ME / NOT NOW in ruled caps. **`NOT NOW` cleared
  it** and the feed ended with the closing rule and "END OF DAILY EDITION" alone — one slot, at most
  one prompt, and a decline that does not ask twice.
- **Both palettes, swept numerically rather than eyeballed.** Every pixel of the full-screen captures
  classified against `src/theme/tokens.ts`, counting a pixel on-palette only if it lies on the
  segment between two named roles (antialiased type blends): **light 0 off-palette of 2,397,600**;
  **dark 2,540, all of them Android's own gesture-nav home pill** at `y=2319..2326, x=381..697`.
  So **0 app pixels off-palette in either palette**, and no `rgb(242,242,242)` anywhere.

## Still unverified, and why

**Expo Go cannot do remote push.** SDK 53 removed it, and the device logged exactly that on every
launch, from `expo-notifications`' own auto-registration module. So these need a **development
build**, not another device session:

- the **accept** path — NOTIFY ME → OS permission dialog → `getExpoPushTokenAsync` → token POST.
- the **"Notifications are off"** decline line. It renders only when the OS prompt is *refused*,
  which requires reaching that prompt.
- both **delivery** paths: foreground invalidating `latest`, and a tap prefetching the named edition
  before pushing `/`.

**The update notice** could not be reached either, because `arnabbit/thechronicle` has no published
release: `latestRelease()` answers `null` and the slot correctly says nothing. What the device *does*
confirm is the quiet-failure half — the slot rendered the offer and then nothing, with no error state
and no retry storm. The notice itself is unproven.

**`unavailableOffline`** is still verified nowhere. It needs a saved article whose body is absent
while its feed row is cached *and* the device offline. Bookmarking prefetches the body, so the state
cannot be reached by ordinary use on a healthy install; on web I forced `dead` by seeding a withdrawn
id, but Expo Go is not debuggable (`run-as: package not debuggable`) so nothing can be seeded on the
phone. It needs the same development build.

The `dead`-with-cached-headline path remains reasoned, not observed.

**Nothing that blocks the merge is left.** The two pieces where "it compiles and the web is fine"
said least — the sheet and the SQLite persister — are both now observed working on the phone.

**Verified on web**, in both palettes, every route from a pasted URL, colours swept against
`src/theme/tokens.ts` rather than eyeballed — 0 off-palette, no `rgb(242,242,242)`:

- the navigator opens from the dateline, switches scale (`24–30 August`, `August 2026`, `Q3 2026`,
  `2026`), and dismisses on Escape. Bucket counts sum to the 30 loaded editions.
- save → `SAVED`, persisted as `{id, savedAt}` version 1; the row appears in `/saved`; the share
  control reads *Copy link* on a browser with no share sheet.
- `/saved` empty carries the web-only second line; the `dead` row renders with Remove.
- `/period/nonsense` is refused client-side with **zero** requests; `/period/2026-08` makes exactly
  one and renders the period-worded missing state.

**Verified nowhere:** the `unavailableOffline` row state. I could force `dead` by seeding a
withdrawn id, but `unavailableOffline` needs a saved article whose body is absent while its feed row
is cached *and* the device offline — which is a device test.

One thing the `dead` test did show: seeded with an id that was never cached, the row renders with
no headline at all, because the store keeps only `{id, savedAt}`. In practice bookmarking prefetches
the body and Query keeps cached data alongside a later error, so a genuinely-withdrawn article
should keep its headline in `secondary`. **That path is reasoned, not observed.**

---

## Your calls — answered

All seven answered. Three needed code; each got its own commit.

| # | The call | Answer | Commit |
|---|---|---|---|
| 1 | Android pass before merge | **Yes**, before merge | — (done; see The Android pass) |
| 2 | The notice block moving | **Keep** it centred | — (already as shipped in `fd204a5`) |
| 3 | Nine pieces of unapproved copy | **Keep as written**, no rewording pass | — |
| 4 | `prose` shape is inferred | **Grilled it** — the ticket beat the board | `34e626a`, `7623b0d`, `eda7856` |
| 5 | Client-derived period skeleton | **No** — wait for the endpoint | — |
| 6 | A size cap on the persisted cache | **No cap** | — |
| 7 | 08 and 09 gated together | **Fine** | — |

### What the grill on item 4 turned up

The inference was worse than recorded. **Ticket 13's round-3 answer specifies three parts** — a short
overall lede, one paragraph per category with enough in it, and a trailing line folding in the
categories too thin for their own paragraph. **`design-17/PeriodView.dc.html` drew only the middle
third**, and the app had modelled the board, so two of the three parts were missing entirely. The
board pre-dates that answer, so the ticket wins.

Also settled, and now written into `docs/adr/0001-period-prose-shape-is-client-inferred.md`:

- The shape lives in `src/lib/periodProse.ts`, with a pure `parsePeriodProse` and 14 tests — the only
  thing that has ever held it to anything. Parsed at the fetch boundary, so the normalised shape is
  what enters the cache and what the persister writes. The skeleton is deliberately **not** parsed.
- A paragraphs-only payload still renders, pinned by a test. If the endpoint is built to the board
  rather than the ticket, the screen degrades rather than breaks.
- `byCategory` is never re-sorted. The prose *is* the ranking.
- Per-category `name` stays duplicated on the prose entry, so a frozen summary keeps the label it was
  written under even if the category is later renamed.

**And it found a defect neither of us had listed.** `proseStatus: 'pending'` means two things — a
period still accumulating, and a closed one not yet summarised — and the screen said *"This period is
still open"* for both. False for the second, and the second is the common case the moment the
endpoint ships before its LLM key. Now derived from `range.to`, the same comparison `usePeriod`
already makes for staleness. This is a copy *addition* rather than the rewording item 3 declined:
one of the two sentences was simply wrong.

`CONTEXT.md` is also new — the glossary neither repo had.

---

## Dependencies added

`expo-clipboard`, `expo-notifications`, `expo-updates`, `expo-sqlite`. No Metro resolution alias
was needed for any of them. `expo-sqlite` needed the file split above; the other three bundle on
web without complaint. All installed through `expo install`, so they match the SDK.

Note the standing caution: the native runtime version is a fingerprint, so these four bumps mean an
existing sideloaded install cannot run this JS bundle. That is ticket 16's territory, not this
branch's, but it is now true.

---

# finish-the-revamp

The five root tickets that were never built, plus the app-side flips that were waiting on them.
Tickets in `.scratch/finish-the-revamp/issues/F01..F15`; F-numbers are their own sequence and do not
line up with the root or app-set numbering.

## F03 — the release is not published, and the update notice stays unverifiable

`gh` on this machine is authenticated read-only on `arnabbit/thechronicle` and cannot create a
release there, so **nothing was published**: no release, no draft, no tag, and no write attempted.
Publishing waits for a session with the owner present.

The consequence is written down rather than left silent. With no published release,
`latestRelease()` returns `null`, so **the end-of-feed update notice can never appear and remains
unverifiable** — exactly as it has been since it was written. That is the specified behaviour for
"nothing to announce", not a defect, and it was deliberately *not* faked with a stub, a fixture or a
throwaway release to make the notice render: a check that has only ever been exercised against a
forged answer has not been exercised.

F02's build was run, so an artifact exists; its URL is recorded below rather than uploaded anywhere.
