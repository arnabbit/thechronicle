// Periods: the ids in `/period/:id`, the calendar ranges they cover, and the
// words that name them.
//
// The most error-prone new logic in this build, which is why it is pure and
// why it is tested from both sides of every boundary. ISO week numbering,
// quarter arithmetic and year edges are each a place where an off-by-one
// survives review and shows up as the wrong month of the paper.
//
// **Arithmetic on the calendar date, never a timezone conversion.** `Date.UTC`
// and the `getUTC*` readers are used the way `formatWeekday` already uses
// them: as day arithmetic on the digits themselves. Nothing here builds a Date
// from a string and reads it back in local time — that is the exact bug that
// filed a third of all late-night stories under the previous day, and cost a
// re-dating backfill of 310 documents and every affected article id.
//
// Imports stay relative and carry their extension: bare Node runs this.

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export type PeriodKind = 'week' | 'month' | 'quarter' | 'year';

export interface PeriodRange {
  /** YYYY-MM-DD, inclusive. */
  from: string;
  /** YYYY-MM-DD, inclusive. */
  to: string;
}

export interface Period {
  id: string;
  kind: PeriodKind;
  range: PeriodRange;
}

/** The paper cannot have published outside this, and an id outside it is a
 *  typo rather than a period. Wide enough never to be the reason something
 *  legitimate is refused. */
const MIN_YEAR = 1900;
const MAX_YEAR = 2999;

const DAY_MS = 86_400_000;

function daysInMonth(y: number, m: number): number {
  if (m === 2) return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28;
  return m === 4 || m === 6 || m === 9 || m === 11 ? 30 : 31;
}

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

/** A calendar date as a number of milliseconds. Arithmetic, not a conversion. */
const utc = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d);

function fromUtc(ms: number): { y: number; m: number; d: number } {
  const at = new Date(ms);
  return { y: at.getUTCFullYear(), m: at.getUTCMonth() + 1, d: at.getUTCDate() };
}

function isoDate(ms: number): string {
  const { y, m, d } = fromUtc(ms);
  return iso(y, m, d);
}

/** ISO weekday: Monday 1 through Sunday 7. */
function isoWeekday(y: number, m: number, d: number): number {
  const day = new Date(utc(y, m, d)).getUTCDay();
  return day === 0 ? 7 : day;
}

/** The Monday of ISO week 1 of a year — the week containing 4 January. */
function isoWeek1Monday(year: number): number {
  return utc(year, 1, 4) - (isoWeekday(year, 1, 4) - 1) * DAY_MS;
}

/** How many ISO weeks a year has: 52, or 53 when it reaches that far. */
function isoWeeksInYear(year: number): number {
  return Math.round((isoWeek1Monday(year + 1) - isoWeek1Monday(year)) / (7 * DAY_MS));
}

function parseDate(value: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > daysInMonth(y, m)) return null;
  return { y, m, d };
}

const inYearRange = (y: number) => y >= MIN_YEAR && y <= MAX_YEAR;

/**
 * `2026-W35` or `2026-08` or `2026-Q3` or `2026`, into a kind and an inclusive
 * calendar range. `null` for anything malformed or out of range — the screen
 * renders that as missing without asking the backend.
 *
 * Deliberately strict about shape: `2026-W5` and `2026-8` are refused rather
 * than guessed at. A lenient parser would let two different strings name one
 * period, and the cache would then hold it twice.
 */
export function parsePeriodId(id: string): Period | null {
  const week = /^(\d{4})-W(\d{2})$/.exec(id);
  if (week) {
    const y = Number(week[1]);
    const n = Number(week[2]);
    if (!inYearRange(y) || n < 1 || n > isoWeeksInYear(y)) return null;
    const monday = isoWeek1Monday(y) + (n - 1) * 7 * DAY_MS;
    return { id, kind: 'week', range: { from: isoDate(monday), to: isoDate(monday + 6 * DAY_MS) } };
  }

  const quarter = /^(\d{4})-Q([1-4])$/.exec(id);
  if (quarter) {
    const y = Number(quarter[1]);
    const q = Number(quarter[2]);
    if (!inYearRange(y)) return null;
    const first = q * 3 - 2;
    const last = q * 3;
    return {
      id,
      kind: 'quarter',
      range: { from: iso(y, first, 1), to: iso(y, last, daysInMonth(y, last)) },
    };
  }

  const month = /^(\d{4})-(\d{2})$/.exec(id);
  if (month) {
    const y = Number(month[1]);
    const m = Number(month[2]);
    if (!inYearRange(y) || m < 1 || m > 12) return null;
    return { id, kind: 'month', range: { from: iso(y, m, 1), to: iso(y, m, daysInMonth(y, m)) } };
  }

  const year = /^(\d{4})$/.exec(id);
  if (year) {
    const y = Number(year[1]);
    if (!inYearRange(y)) return null;
    return { id, kind: 'year', range: { from: iso(y, 1, 1), to: iso(y, 12, 31) } };
  }

  return null;
}

/**
 * Which period of a given kind a date falls in.
 *
 * This is what turns a list of edition dates into buckets without asking the
 * backend anything, so the navigator can group the archive it already holds.
 *
 * The week case is the one with a trap in it: a date in early January can
 * belong to the *previous* ISO year's last week, and one in late December to
 * the next ISO year's first. The Thursday of the date's own week decides,
 * which is the definition rather than a correction to it.
 */
export function periodIdFor(date: string, kind: PeriodKind): string | null {
  const p = parseDate(date);
  if (!p || !inYearRange(p.y)) return null;

  if (kind === 'year') return String(p.y);
  if (kind === 'month') return `${p.y}-${pad(p.m)}`;
  if (kind === 'quarter') return `${p.y}-Q${Math.floor((p.m - 1) / 3) + 1}`;

  const thursday = utc(p.y, p.m, p.d) + (4 - isoWeekday(p.y, p.m, p.d)) * DAY_MS;
  const isoYear = fromUtc(thursday).y;
  const week = Math.round((thursday - isoWeek1Monday(isoYear)) / (7 * DAY_MS)) + 1;
  return `${isoYear}-W${pad(week)}`;
}

/**
 * What a period is called in a list: "24-30 August", "August 2026", "Q3 2026",
 * "2026".
 *
 * A week is named by its days rather than its number, because `2026-W35` is a
 * machine's name for a week and no reader has ever thought in one.
 */
export function periodLabel(id: string): string {
  const period = parsePeriodId(id);
  if (!period) return '';
  const from = parseDate(period.range.from);
  const to = parseDate(period.range.to);
  if (!from || !to) return '';

  if (period.kind === 'year') return String(from.y);
  if (period.kind === 'month') return `${MONTHS[from.m - 1]} ${from.y}`;
  if (period.kind === 'quarter') return `Q${Math.floor((from.m - 1) / 3) + 1} ${from.y}`;

  // A week that stays inside one month names the month once.
  if (from.y === to.y && from.m === to.m) {
    return `${from.d}–${to.d} ${MONTHS[from.m - 1]}`;
  }
  if (from.y === to.y) {
    return `${from.d} ${MONTHS[from.m - 1]} – ${to.d} ${MONTHS[to.m - 1]}`;
  }
  return `${from.d} ${MONTHS[from.m - 1]} ${from.y} – ${to.d} ${MONTHS[to.m - 1]} ${to.y}`;
}

/**
 * The half-sentence the empty copy needs: "No paper was published between
 * **24 and 30 August**."
 *
 * Shares nothing with `periodLabel` on purpose — one names a period in a list,
 * the other completes a sentence, and the two want the month repeated
 * differently.
 */
export function rangeLabel(range: PeriodRange): string {
  const from = parseDate(range.from);
  const to = parseDate(range.to);
  if (!from || !to) return '';

  if (from.y !== to.y) {
    return `${from.d} ${MONTHS[from.m - 1]} ${from.y} and ${to.d} ${MONTHS[to.m - 1]} ${to.y}`;
  }
  if (from.m !== to.m) {
    return `${from.d} ${MONTHS[from.m - 1]} and ${to.d} ${MONTHS[to.m - 1]}`;
  }
  return `${from.d} and ${to.d} ${MONTHS[from.m - 1]}`;
}

/** Whether a date falls inside a period. ISO dates sort lexicographically,
 *  which is the cheapest correct comparison there is. */
export function isWithin(date: string, range: PeriodRange): boolean {
  return date >= range.from && date <= range.to;
}

export interface PeriodBucket {
  id: string;
  /** What the row says: "August 2026", "24–30 August". */
  label: string;
  editionCount: number;
  articleCount: number;
}

/**
 * A list of editions, grouped into the periods of one kind, newest first.
 *
 * This is what lets the navigator show the shape of the archive without the
 * period endpoint existing: the archive index is already in the cache, every
 * row carries its date and its article count, and grouping them is arithmetic.
 * The counts are therefore truthful about *what the app has loaded* rather
 * than about the whole archive — which is the honest thing a client can say
 * before ticket 09's endpoint ships.
 *
 * Sorted by id descending, which is newest-first for all four kinds: every id
 * shape here begins with its year and pads its parts, so they sort as strings
 * exactly as they sort in time.
 */
export function bucketEditions(
  editions: readonly { date: string; count: number }[],
  kind: PeriodKind,
): PeriodBucket[] {
  const buckets = new Map<string, PeriodBucket>();

  for (const edition of editions) {
    const id = periodIdFor(edition.date, kind);
    if (!id) continue;
    const found = buckets.get(id);
    if (found) {
      found.editionCount += 1;
      found.articleCount += edition.count;
      continue;
    }
    buckets.set(id, {
      id,
      label: periodLabel(id),
      editionCount: 1,
      articleCount: edition.count,
    });
  }

  return [...buckets.values()].sort((a, b) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
}

/** IST is UTC+5:30 with no daylight saving, ever. A fixed offset is
 *  arithmetic, not the timezone conversion the house rule forbids — what that
 *  rule bans is reading a *date string* back through the host's zone. */
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/**
 * Today's calendar date in the paper's own timezone, from an instant handed in.
 *
 * `now` is a parameter for the same reason `isPersistable` takes one: the
 * boundary is the interesting part, and a function that reads the clock itself
 * can only be tested at whatever time the suite happens to run. The caller
 * reads `Date.now()`; this decides what day that is in Delhi.
 */
export function istDate(now: number): string {
  const { y, m, d } = fromUtc(now + IST_OFFSET_MS);
  return iso(y, m, d);
}
