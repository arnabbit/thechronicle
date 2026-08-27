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
