import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { formatDateline, formatLongDate, formatWeekday, isEditionDate } from '../src/lib/date.ts';

// `edition` is a YYYY-MM-DD calendar date in IST and is the only date on the
// wire. Formatting it must be arithmetic on those digits — never a Date parsed
// and read back in the host's zone. Getting that wrong on the backend filed a
// third of all late-night stories under the previous day and cost a re-dating
// backfill of 310 documents.

test('the dateline is the calendar date in the paper\'s own form', () => {
  assert.equal(formatDateline('2026-08-27'), '27 August 2026');
  assert.equal(formatDateline('2026-01-01'), '1 January 2026');
  assert.equal(formatDateline('2026-12-31'), '31 December 2026');
});

test('a leading zero in the day is dropped, not printed', () => {
  assert.equal(formatDateline('2026-03-05'), '5 March 2026');
});

test('the long date names the weekday', () => {
  assert.equal(formatLongDate('2026-08-27'), 'Thursday, 27 August 2026');
  assert.equal(formatLongDate('2024-02-29'), 'Thursday, 29 February 2024');
});

test('the weekday alone is the archive row\'s kicker', () => {
  assert.equal(formatWeekday('2026-08-27'), 'Thursday');
  assert.equal(formatWeekday('2026-03-25'), 'Wednesday');
  assert.equal(formatWeekday('2024-02-29'), 'Thursday');
});

test('a malformed or empty edition formats to nothing rather than "Invalid Date"', () => {
  for (const bad of ['', 'latest', '2026-8-27', '27-08-2026', '2026-08-27T00:00:00Z']) {
    assert.equal(formatDateline(bad), '', bad);
    assert.equal(formatLongDate(bad), '', bad);
    assert.equal(formatWeekday(bad), '', bad);
  }
});

test('an edition date is YYYY-MM-DD and a day that exists', () => {
  for (const good of ['2026-08-27', '2026-01-01', '2026-12-31', '2024-02-29', '2000-02-29']) {
    assert.equal(isEditionDate(good), true, good);
  }
});

test('a malformed or impossible date is not an edition date, so the route asks for nothing', () => {
  for (const bad of [
    '',
    undefined,
    null,
    'not-a-date',
    'latest',
    '2026-8-27',
    '27-08-2026',
    '2026-08-27T00:00:00Z',
    '2026-13-01',
    '2026-00-10',
    '2026-02-31',
    '2026-02-30',
    '2026-04-31',
    '2026-08-00',
    '2026-08-32',
    '2025-02-29',
    '1900-02-29',
  ]) {
    assert.equal(isEditionDate(bad), false, String(bad));
  }
});

test('every day of a leap year is an edition date, and one past each month end is not', () => {
  for (let m = 1; m <= 12; m += 1) {
    const mm = String(m).padStart(2, '0');
    let last = 0;
    for (let d = 1; d <= 31; d += 1) {
      if (isEditionDate(`2024-${mm}-${String(d).padStart(2, '0')}`)) last = d;
      else break;
    }
    assert.equal(last, [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1], mm);
    assert.equal(isEditionDate(`2024-${mm}-${String(last + 1).padStart(2, '0')}`), false, mm);
  }
});

/** Zeller's congruence — an independent weekday, so the test does not check
 *  Date arithmetic with the same Date arithmetic. Returns 0=Sunday. */
function weekdayOf(y: number, m: number, d: number): number {
  const yy = m < 3 ? y - 1 : y;
  const mm = m < 3 ? m + 12 : m;
  const k = yy % 100;
  const j = Math.floor(yy / 100);
  const h = (d + Math.floor((13 * (mm + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) + 5 * j) % 7;
  return (h + 6) % 7;
}

const NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

test('every day of a leap year formats to its own digits and its true weekday', () => {
  // The invariant a timezone conversion breaks: whatever comes out must name
  // the same day the string named. Run across a whole year so month ends,
  // the leap day and the year boundary are all covered, not sampled.
  const cursor = new Date(Date.UTC(2024, 0, 1));
  let days = 0;
  while (cursor.getUTCFullYear() === 2024) {
    const y = cursor.getUTCFullYear();
    const m = cursor.getUTCMonth() + 1;
    const d = cursor.getUTCDate();
    const edition = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    assert.equal(formatDateline(edition), `${d} ${MONTHS[m - 1]} ${y}`, edition);
    assert.equal(formatWeekday(edition), NAMES[weekdayOf(y, m, d)], edition);
    assert.equal(
      formatLongDate(edition),
      `${NAMES[weekdayOf(y, m, d)]}, ${d} ${MONTHS[m - 1]} ${y}`,
      edition,
    );

    cursor.setUTCDate(d + 1);
    days += 1;
  }
  assert.equal(days, 366);
});

test('the host timezone cannot change the output', (t) => {
  // The decisive check: same input, two runtimes fourteen hours apart. Skipped
  // rather than faked where the runtime ignores TZ — it does on Windows, and a
  // check that cannot fail is worse than none.
  const module = new URL('../src/lib/date.ts', import.meta.url).href;
  const run = (tz: string) =>
    execFileSync(
      process.execPath,
      [
        '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
        '--input-type=module',
        '-e',
        `const m = await import(${JSON.stringify(module)});
         process.stdout.write(JSON.stringify([
           new Date(2026, 0, 1).getTimezoneOffset(),
           m.formatDateline('2026-01-01'),
           m.formatLongDate('2026-01-01'),
           m.formatLongDate('2026-12-31'),
         ]));`,
      ],
      { env: { ...process.env, TZ: tz }, encoding: 'utf8' },
    );

  const [aheadOffset, ...ahead] = JSON.parse(run('Pacific/Kiritimati'));
  const [behindOffset, ...behind] = JSON.parse(run('Pacific/Midway'));

  if (aheadOffset === behindOffset) {
    t.skip('this runtime ignores TZ, so the two runs are not actually apart');
    return;
  }

  assert.deepEqual(ahead, behind);
  assert.deepEqual(ahead, ['1 January 2026', 'Thursday, 1 January 2026', 'Thursday, 31 December 2026']);
});
