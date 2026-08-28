import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bucketEditions,
  istDate,
  isWithin,
  parsePeriodId,
  periodIdFor,
  periodLabel,
  rangeLabel,
} from '../src/lib/period.ts';

// The highest-value tests in this suite. ISO week boundaries, quarter
// arithmetic and year edges are where an off-by-one survives review and then
// shows a reader the wrong month of the paper.

const range = (id: string) => parsePeriodId(id)?.range;

test('a month id covers its whole month, February included', () => {
  assert.deepEqual(range('2026-08'), { from: '2026-08-01', to: '2026-08-31' });
  assert.deepEqual(range('2026-02'), { from: '2026-02-01', to: '2026-02-28' });
  // 2024 is a leap year; 2100 is not, despite being divisible by four.
  assert.deepEqual(range('2024-02'), { from: '2024-02-01', to: '2024-02-29' });
  assert.deepEqual(range('2100-02'), { from: '2100-02-01', to: '2100-02-28' });
});

test('a quarter id covers three months and ends on a real day', () => {
  assert.deepEqual(range('2026-Q1'), { from: '2026-01-01', to: '2026-03-31' });
  assert.deepEqual(range('2026-Q2'), { from: '2026-04-01', to: '2026-06-30' });
  assert.deepEqual(range('2026-Q3'), { from: '2026-07-01', to: '2026-09-30' });
  assert.deepEqual(range('2026-Q4'), { from: '2026-10-01', to: '2026-12-31' });
});

test('a year id covers the year', () => {
  assert.deepEqual(range('2026'), { from: '2026-01-01', to: '2026-12-31' });
});

test('an ISO week runs Monday to Sunday', () => {
  // 2026-W35 is the week the spec quotes in its empty copy.
  assert.deepEqual(range('2026-W35'), { from: '2026-08-24', to: '2026-08-30' });
  assert.equal(periodIdFor('2026-08-24', 'week'), '2026-W35');
  assert.equal(periodIdFor('2026-08-30', 'week'), '2026-W35');
  // The days either side belong to the neighbouring weeks, not this one.
  assert.equal(periodIdFor('2026-08-23', 'week'), '2026-W34');
  assert.equal(periodIdFor('2026-08-31', 'week'), '2026-W36');
});

test('ISO week 1 is the week containing 4 January', () => {
  // 2026-01-01 is a Thursday, so its week reaches back into December 2025.
  assert.deepEqual(range('2026-W01'), { from: '2025-12-29', to: '2026-01-04' });
  assert.equal(periodIdFor('2025-12-29', 'week'), '2026-W01');
  assert.equal(periodIdFor('2026-01-04', 'week'), '2026-W01');
});

test('a date in early January can belong to the previous ISO year', () => {
  // 2027-01-01 is a Friday: its week began on Monday 28 December 2026 and is
  // the last week of ISO year 2026, not the first of 2027.
  assert.equal(periodIdFor('2027-01-01', 'week'), '2026-W53');
  assert.deepEqual(range('2026-W53'), { from: '2026-12-28', to: '2027-01-03' });
});

test('a date in late December can belong to the next ISO year', () => {
  // 2024-12-30 is a Monday, and its Thursday falls in 2025.
  assert.equal(periodIdFor('2024-12-30', 'week'), '2025-W01');
});

test('a year with only 52 ISO weeks refuses a 53rd', () => {
  // 2026 reaches W53; 2025 does not.
  assert.ok(parsePeriodId('2026-W53'));
  assert.equal(parsePeriodId('2025-W53'), null);
  assert.equal(parsePeriodId('2026-W54'), null);
  assert.equal(parsePeriodId('2026-W00'), null);
});

test('malformed ids are refused rather than guessed at', () => {
  for (const id of ['', '2026-W5', '2026-8', '2026-Q5', '2026-Q0', '2026-13', '2026-00', 'latest', '26-08', '2026-08-01x']) {
    assert.equal(parsePeriodId(id), null, `expected ${id} to be refused`);
  }
});

test('a full date is not a period id', () => {
  // `/period/2026-08-27` is a mistyped edition link, not a period.
  assert.equal(parsePeriodId('2026-08-27'), null);
});

test('out-of-range years are refused', () => {
  assert.equal(parsePeriodId('1899'), null);
  assert.equal(parsePeriodId('3000-01'), null);
  assert.ok(parsePeriodId('1900'));
  assert.ok(parsePeriodId('2999-12'));
});

test('a date maps to the period of each kind that contains it', () => {
  assert.equal(periodIdFor('2026-08-27', 'year'), '2026');
  assert.equal(periodIdFor('2026-08-27', 'month'), '2026-08');
  assert.equal(periodIdFor('2026-08-27', 'quarter'), '2026-Q3');
  assert.equal(periodIdFor('2026-01-01', 'quarter'), '2026-Q1');
  assert.equal(periodIdFor('2026-12-31', 'quarter'), '2026-Q4');
});

test('a date that is not a date maps to nothing', () => {
  assert.equal(periodIdFor('2026-02-31', 'month'), null);
  assert.equal(periodIdFor('not-a-date', 'week'), null);
  assert.equal(periodIdFor('latest', 'month'), null);
});

test('every period id a date produces parses back, for all four kinds', () => {
  // Round trip: the id a date maps to must contain that date again.
  for (const date of ['2026-01-01', '2026-02-28', '2026-08-27', '2026-12-31', '2024-02-29']) {
    for (const kind of ['week', 'month', 'quarter', 'year'] as const) {
      const id = periodIdFor(date, kind);
      assert.ok(id, `${date} ${kind} produced no id`);
      const parsed = parsePeriodId(id);
      assert.ok(parsed, `${id} did not parse back`);
      assert.ok(isWithin(date, parsed.range), `${id} does not contain ${date}`);
      assert.equal(parsed.kind, kind);
    }
  }
});

test('a period is named the way a reader would say it', () => {
  assert.equal(periodLabel('2026-08'), 'August 2026');
  assert.equal(periodLabel('2026-Q3'), 'Q3 2026');
  assert.equal(periodLabel('2026'), '2026');
  assert.equal(periodLabel('2026-W35'), '24–30 August');
});

test('a week spanning two months or two years names both', () => {
  assert.equal(periodLabel('2026-W36'), '31 August – 6 September');
  assert.equal(periodLabel('2026-W53'), '28 December 2026 – 3 January 2027');
});

test('an unparseable id has no name rather than a wrong one', () => {
  assert.equal(periodLabel('2026-W99'), '');
  assert.equal(periodLabel('nonsense'), '');
});

test('the range label completes the empty sentence', () => {
  // "No paper was published between 24 and 30 August."
  assert.equal(rangeLabel({ from: '2026-08-24', to: '2026-08-30' }), '24 and 30 August');
  assert.equal(rangeLabel({ from: '2026-08-31', to: '2026-09-06' }), '31 August and 6 September');
  assert.equal(
    rangeLabel({ from: '2026-12-28', to: '2027-01-03' }),
    '28 December 2026 and 3 January 2027',
  );
});

test('containment is inclusive at both ends', () => {
  const august = { from: '2026-08-01', to: '2026-08-31' };
  assert.equal(isWithin('2026-08-01', august), true);
  assert.equal(isWithin('2026-08-31', august), true);
  assert.equal(isWithin('2026-07-31', august), false);
  assert.equal(isWithin('2026-09-01', august), false);
});

// Grouping the archive the app already holds, so the navigator can show the
// shape of it before the period endpoint exists.

const ARCHIVE = [
  { date: '2026-08-27', count: 19 },
  { date: '2026-08-26', count: 35 },
  { date: '2026-08-24', count: 12 },
  { date: '2026-07-30', count: 4 },
  { date: '2025-12-31', count: 2 },
];

test('editions group into buckets with summed counts, newest first', () => {
  const months = bucketEditions(ARCHIVE, 'month');
  assert.deepEqual(
    months.map((bucket) => [bucket.id, bucket.editionCount, bucket.articleCount]),
    [
      ['2026-08', 3, 66],
      ['2026-07', 1, 4],
      ['2025-12', 1, 2],
    ],
  );
});

test('buckets are newest first for every kind, including across a year edge', () => {
  for (const kind of ['week', 'month', 'quarter', 'year'] as const) {
    const ids = bucketEditions(ARCHIVE, kind).map((bucket) => bucket.id);
    assert.deepEqual([...ids].sort().reverse(), ids, `${kind} came back out of order`);
  }
});

test('a bucket carries the name a reader would say', () => {
  assert.equal(bucketEditions(ARCHIVE, 'month')[0].label, 'August 2026');
  assert.equal(bucketEditions(ARCHIVE, 'quarter')[0].label, 'Q3 2026');
  assert.equal(bucketEditions(ARCHIVE, 'year')[0].label, '2026');
});

test('a date that is not a date is dropped rather than bucketed as nothing', () => {
  const buckets = bucketEditions([{ date: 'latest', count: 3 }, { date: '2026-08-27', count: 1 }], 'month');
  assert.deepEqual(buckets.map((bucket) => bucket.id), ['2026-08']);
});

test('an empty archive produces no buckets rather than an empty one', () => {
  assert.deepEqual(bucketEditions([], 'month'), []);
});

// The paper's own day, which is not the host's.

test('the IST date is five and a half hours ahead of UTC', () => {
  // 18:29 UTC on the 27th is still the 27th in Delhi; 18:30 is the 28th.
  assert.equal(istDate(Date.UTC(2026, 7, 27, 18, 29, 59)), '2026-08-27');
  assert.equal(istDate(Date.UTC(2026, 7, 27, 18, 30, 0)), '2026-08-28');
});

test('the IST date rolls the month and the year at the right instant', () => {
  assert.equal(istDate(Date.UTC(2026, 7, 31, 18, 30, 0)), '2026-09-01');
  assert.equal(istDate(Date.UTC(2026, 11, 31, 18, 30, 0)), '2027-01-01');
  // Midnight UTC is half past five in the morning in Delhi, same day.
  assert.equal(istDate(Date.UTC(2026, 0, 1, 0, 0, 0)), '2026-01-01');
});
