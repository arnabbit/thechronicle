// All date formatting is the client's job: ticket 04 dropped `published_date`
// and sends `edition` (YYYY-MM-DD, IST) as the only date on the wire.
//
// These format an already-IST date string. They must never construct a Date
// from it and read it back in local time — that is the exact bug that filed a
// third of all late-night stories under the previous day on the backend.

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parts(edition: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(edition);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

/** Days in a month, by calendar arithmetic — no Date, so nothing can convert. */
function daysInMonth(y: number, m: number): number {
  if (m === 2) return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28;
  return m === 4 || m === 6 || m === 9 || m === 11 ? 30 : 31;
}

/**
 * Whether a string is a date the paper could have printed: YYYY-MM-DD and a
 * real calendar day.
 *
 * The `/edition/:date` route validates its param with this before asking for
 * anything, so `/edition/not-a-date` costs no request. The regex alone is not
 * enough — `2026-02-31` is well-formed and is not a day.
 */
export function isEditionDate(value: string | undefined | null): boolean {
  const p = parts(value ?? '');
  if (!p) return false;
  if (p.m < 1 || p.m > 12) return false;
  return p.d >= 1 && p.d <= daysInMonth(p.y, p.m);
}

/** "27 August 2026" — the dateline under the masthead. */
export function formatDateline(edition: string): string {
  const p = parts(edition);
  if (!p) return '';
  return `${p.d} ${MONTHS[p.m - 1]} ${p.y}`;
}

/** "Thursday" — the archive row's kicker, where the date sits in the headline
 *  slot and the weekday is what tells a Saturday paper from a Tuesday one. */
export function formatWeekday(edition: string): string {
  const p = parts(edition);
  if (!p) return '';
  // Date.UTC + getUTCDay is arithmetic on the calendar date itself, not a
  // timezone conversion, so the weekday cannot drift with the host clock.
  return WEEKDAYS[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()];
}

/** "Thursday, 27 August 2026". */
export function formatLongDate(edition: string): string {
  const p = parts(edition);
  if (!p) return '';
  return `${formatWeekday(edition)}, ${p.d} ${MONTHS[p.m - 1]} ${p.y}`;
}
