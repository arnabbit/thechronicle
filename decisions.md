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

## Unverified

**Everything on the device.** The phone was locked when I got to it — 3:12 AM on its clock,
personal notifications on the lock screen, and `screencap` returning empty because the keyguard is
secure. I stopped rather than try to get past a lock on your personal phone. So **nothing in this
branch has run on Android.** Specifically unverified:

- the bottom sheet — the whole point of the platform split. The web popover is verified; the phone
  half has never rendered.
- the back gesture dismissing the sheet.
- the notification offer, the decline line, and both notification paths. `canPush` is false on web,
  so the end-of-feed slot has never rendered a prompt anywhere.
- the SQLite persister. It has never opened a database. The web keeps working on AsyncStorage,
  which is verified, but the Android store is code that has not run.
- the update notice — also `canPush`-gated, so also web-invisible.
- both palettes on the device.

I would not merge this without an Android pass. The SQLite persister and the sheet are the two
pieces where "it compiles and the web is fine" says least.

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

## Needs your call

1. **Android pass before merge.** Yes, or merge on the web evidence?
2. **The notice block moving** touches every state screen. Keep, or revert to left-aligned?
3. **Nine pieces of unapproved copy**, above.
4. **`prose` shape is inferred.** Ticket 13 writes `prose: {...}`; the design prototype renders one
   paragraph per category, so `PeriodProse` is modelled as `{ byCategory: [{slug, name, text}] }`.
   The endpoint does not exist, so nothing has ever validated this.
5. **The period screen could work today.** Its skeleton — counts, timeline, editions — is derivable
   from the archive index exactly as the navigator's buckets are. I did not build that, because the
   ticket says the endpoint is the source and two sources for one screen would disagree. Say the
   word if you would rather have it live before the endpoint ships.
6. **A size cap on the persisted cache** is still not built. Ticket 13 deliberately excluded it; it
   would be a fourth rule in `isPersistable`. The SQLite store removes the ceiling that made it
   urgent, so this is now a choice rather than a fix.
7. **Ticket 08 and 09 were gated together**, not each in isolation — the navigator's bucket rows
   address the period route, so 08 alone does not typecheck under strict typed routes.

---

## Dependencies added

`expo-clipboard`, `expo-notifications`, `expo-updates`, `expo-sqlite`. No Metro resolution alias
was needed for any of them. `expo-sqlite` needed the file split above; the other three bundle on
web without complaint. All installed through `expo install`, so they match the SDK.

Note the standing caution: the native runtime version is a fingerprint, so these four bumps mean an
existing sideloaded install cannot run this JS bundle. That is ticket 16's territory, not this
branch's, but it is now true.
