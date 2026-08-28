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

## F02 — the APK that was built

EAS generated and holds the keystore; no key material was handled here. Exporting a copy into a
password manager remains a human step.

```
build      811e75b5-ebee-45be-bacd-99b93f877bba   profile apk, channel production
artifact   https://expo.dev/artifacts/eas/X5PzcqP5UOWTBOf9kBrT1AFlGg6CZzHVTNFZhpSRDrg.apk
package    io.github.arnabbit.thechronicle        versionCode 1
runtime    fingerprint 9ccb4d7179ebdbd819d4a4302cd97d137b8fb890
```

Built from the tree at F01/F02, so it does **not** carry F05's registration payload or the F10/F13
flag flips. It is the artifact F02 asked for, not a release candidate.

`eas.json` deliberately has no development profile: one fails at build time without
`expo-dev-client`, and adding that dependency is a change no ticket asked for — it also moves the
native fingerprint and so cuts existing installs off from JS updates.

## What is verified, and what is not

Verified for real, against a local MongoDB 7.0 seeded with the committed 1122-article backup:

- **F04** — an unauthenticated valid token 200s, a malformed one 400s, three posts of one token leave
  one row with `createdAt` behind `lastSeen`, and the stored document has exactly the six fields.
- **F06** — the first push into a new date key notified; a second push the same day sent nothing. The
  send went to Expo's real push API with a fabricated token, so nothing reached a device.
- **F07** — a `DeviceNotRegistered` ticket deleted that token; with sending gated off, a 100-day-old
  token was swept while an 89-day-old and a fresh one survived; `explain()` shows `IXSCAN` on
  `lastSeen_1`; a pruned device that re-registers is stored again.
- **F08 / F09** — the index carries the specced weights and excludes `sourcePosts`; 133 matches for
  "court" walked end to end through `next_cursor` as 133 unique ids with no repeat and no gap;
  newest first; a hidden article absent; a word only in `sourcePosts` returns nothing; `q` of 0, 1
  and 101 characters refused; `limit=500` capped to 50.
- **F11** — 630 ids and 1461 dates compared against the app's own module, in the suite.
- **F12** — all four kinds with every specced field; an empty January and an empty 2020 return zero
  counts rather than 404; `2026-W5`, `2026-13`, `1899`, `3000`, `2025-W53` and a full date all 404; a
  closed July caches for a day while the open August caches for five minutes; hiding one article
  dropped the period count, the timeline day and the edition count together.
- **F14** — with no key: no call, no throw, `pending`, skeleton intact. An open period never
  generates; an empty one stays `none`; a stored summary reads back as `ready` in the ADR shape with
  no model call. A dry run over July's 115 headlines shows the prompt carries headlines only.

**Not verified, with the reason:**

- **The live OpenRouter call** (F14). There is no `OPENROUTER_API_KEY` in this environment and none
  was requested. Everything either side of the call is verified; the call itself is not.
- **Every device-side path in F04–F07** — a real token being issued, a notification arriving, the tap
  routing, the foreground suppression. Expo Go dropped remote push in SDK 53, and a development
  build needs `expo-dev-client`, which is not installed.
- **F01 on a device** — the launcher tile, the monochrome themed icon and the cold-launch splash need
  the APK installed. The artifact exists; installing it is the reader's call.
- **F03's update notice** — permanently unverifiable until a release is published, as above.
- **F10 and F13's offline and paging criteria.** Search's offline state and its second page, and the
  navigator's bucket rows now that they lead somewhere, were not exercised.
- **That a malformed period id makes no request.** The refusal renders correctly, but the browser
  pane's network recorder captured nothing at all, so the "no request" half rests on the unit tests
  rather than on observation.

## F10 and F13, verified in a running app against the live backend

Driven on web against the deployed endpoints, not against a stub:

- All four period kinds render their skeleton from real data — week 5 editions / 94 articles, month
  15 / 458, quarter 15 / 435, year 41 / 1130 — with the publishing rhythm and the sections that ran.
- **The closed July says a written summary has not been added yet; the open August says the period is
  still open.** This is the defect the previous branch's grill turned up, now confirmed correct
  against a real `proseStatus: "pending"` from a backend with no LLM key — which is precisely the
  case that used to read "still open" for both.
- Empty January gives "No paper was published between 1 and 31 January."
- A malformed id (`2026-W5`) and an out-of-range year (`1899`) both render the period-worded missing
  state naming the four shapes.
- Search is reachable from the masthead, returns live results newest-first with each row carrying its
  edition date, shows a bare field for an empty query, and gives `NO MATCHES` naming the query with
  the "Search matches whole words" sub for one that matches nothing.

## Known and unfixed, carried in deliberately

An adversarial review pass found these. They were reported before the merge and the merge went ahead
anyway; they are written down here rather than left as a surprise.

1. **The period endpoint `await`s the model call inline**, with a 90-second timeout. A first view of a
   closed period can therefore gateway-timeout and return **no skeleton** — the one thing that
   endpoint is supposed to always manage. Only bites once per period, and only when a key is set.
2. **No unique index on `periodProse.periodId` or `pushTokens.token`.** An upsert is only atomic
   against a unique index, so N concurrent first views of a period mean N paid model calls, and two
   racing registrations of one device can leave two rows — that device is then notified twice. A
   generation that fails is also retried on every later view, for ever: there is no negative cache.
3. **The Expo send never checks `response.ok`** before `response.json()`. A 502 HTML body throws, so
   the remaining batches are never sent *and* the `.then(pruneTokens)` chain is skipped, taking both
   prune signals with it. The success log also counts every token as notified, including tickets that
   came back as errors.
4. **`token` has no length cap** on a deliberately unauthenticated endpoint, where `platform` and both
   version axes are capped. A 100 KB token-shaped string is a valid row for ninety days.
5. **A legacy row with a null `category`** makes the whole period response 500 on the first count tie,
   because `a.slug.localeCompare(b.slug)` is called on `null`. Writes have defaulted to `world` for a
   while, so this needs a pre-backfill document.
6. **`appVersion` cannot answer the question it was added for.** `Constants.expoConfig` is the running
   *manifest's* config, so after an OTA it reports the bundle's declared `versionCode`, not the
   installed native build's — the same axis `updateId` already covers. And with `versionCode`
   hardcoded to 1 and `appVersionSource: local`, it is the constant `"1"` until someone edits it.
   `Updates.runtimeVersion` is the value that would actually answer it, and is the one not sent.
7. **`validateProse` re-sorts `byCategory` by article count**, which is derivable from the skeleton the
   client already holds — so the stored order is not carrying the information the comment and ADR
   0003 claim it carries. Either the sort is wrong or the justification is.
