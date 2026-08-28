import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePeriodProse } from '../src/lib/periodProse.ts';

// The endpoint does not exist, so these tests are the only thing that has ever
// held this shape to anything. They are written against the payloads a wrong
// guess would actually produce, not against the happy one.

const full = {
  lede: 'The month was dominated by the land bill.',
  byCategory: [
    { slug: 'politics', name: 'Politics', text: 'The assembly reconvened twice.' },
    { slug: 'business', name: 'Business', text: 'Markets held steady.' },
  ],
  also: 'Also this month: two culture pieces and one obituary.',
};

test('a complete payload survives intact, in wire order', () => {
  const prose = parsePeriodProse(full);
  assert.ok(prose);
  assert.equal(prose.lede, 'The month was dominated by the land bill.');
  assert.equal(prose.also, 'Also this month: two culture pieces and one obituary.');
  assert.deepEqual(
    prose.byCategory.map((entry) => entry.slug),
    ['politics', 'business'],
  );
});

test('the ranking is never re-sorted — a thin category may still come first', () => {
  const prose = parsePeriodProse({
    lede: 'A quiet week.',
    byCategory: [
      { slug: 'zzz-last-alphabetically', name: 'Zoology', text: 'One piece, but the lead one.' },
      { slug: 'aaa-first-alphabetically', name: 'Assembly', text: 'Nine pieces.' },
    ],
  });
  assert.deepEqual(
    prose?.byCategory.map((entry) => entry.slug),
    ['zzz-last-alphabetically', 'aaa-first-alphabetically'],
  );
});

test('nothing renderable is null, not an empty shell', () => {
  for (const value of [
    null,
    undefined,
    {},
    { byCategory: [] },
    { lede: '', also: '', byCategory: [] },
    { lede: '   ', byCategory: [{ slug: 'politics', text: '  ' }] },
  ]) {
    assert.equal(parsePeriodProse(value), null, JSON.stringify(value) ?? 'undefined');
  }
});

test('a non-object is null rather than a throw', () => {
  for (const value of ['prose', 42, true, [], () => 'x']) {
    assert.equal(parsePeriodProse(value), null, String(value));
  }
});

test('byCategory of the wrong type degrades to the lede rather than throwing', () => {
  const prose = parsePeriodProse({ lede: 'A month.', byCategory: 'Politics: things happened.' });
  assert.ok(prose);
  assert.equal(prose.lede, 'A month.');
  assert.deepEqual(prose.byCategory, []);
});

test('one malformed paragraph does not take the others with it', () => {
  const prose = parsePeriodProse({
    lede: 'A month.',
    byCategory: [
      { slug: 'politics', name: 'Politics', text: 'Kept.' },
      null,
      'not an object',
      { name: 'No slug', text: 'Dropped — nothing to key or name it by.' },
      { slug: 'no-text', name: 'No text' },
      { slug: 'business', text: 'Kept, and it will fall back to a derived label.' },
    ],
  });
  assert.deepEqual(
    prose?.byCategory.map((entry) => entry.slug),
    ['politics', 'business'],
  );
});

test('a missing name is empty, not undefined — the screen falls back on it', () => {
  const prose = parsePeriodProse({ byCategory: [{ slug: 'business', text: 'Markets.' }] });
  assert.equal(prose?.byCategory[0].name, '');
  assert.equal(prose?.byCategory[0].slug, 'business');
});

test('a name of the wrong type is dropped, not rendered', () => {
  const prose = parsePeriodProse({
    byCategory: [{ slug: 'business', name: { en: 'Business' }, text: 'Markets.' }],
  });
  assert.equal(prose?.byCategory[0].name, '');
});

test('whitespace is trimmed everywhere, so a blank field cannot render as a gap', () => {
  const prose = parsePeriodProse({
    lede: '  A month.\n',
    byCategory: [{ slug: ' politics ', name: ' Politics ', text: '  Things.  ' }],
    also: '\tAlso this month: one obituary. ',
  });
  assert.equal(prose?.lede, 'A month.');
  assert.equal(prose?.also, 'Also this month: one obituary.');
  assert.deepEqual(prose?.byCategory[0], {
    slug: 'politics',
    name: 'Politics',
    text: 'Things.',
  });
});

test('an empty or absent fold-in line is null, never an empty string', () => {
  assert.equal(parsePeriodProse({ lede: 'A month.' })?.also, null);
  assert.equal(parsePeriodProse({ lede: 'A month.', also: '' })?.also, null);
  assert.equal(parsePeriodProse({ lede: 'A month.', also: 42 })?.also, null);
});

test('the prototype-shaped payload — paragraphs only, no lede, no fold — still renders', () => {
  // This is what the design board drew, and what the app modelled before the
  // ticket's round-3 answer was read. It must keep working: if the endpoint is
  // built to the board rather than the ticket, the screen degrades to the
  // paragraphs instead of showing nothing.
  const prose = parsePeriodProse({
    byCategory: [{ slug: 'politics', name: 'Politics', text: 'The land bill passed.' }],
  });
  assert.ok(prose);
  assert.equal(prose.lede, '');
  assert.equal(prose.also, null);
  assert.equal(prose.byCategory.length, 1);
});

test('a lede on its own is enough to render', () => {
  const prose = parsePeriodProse({ lede: 'A month with one story in it.' });
  assert.ok(prose);
  assert.deepEqual(prose.byCategory, []);
});

test('a fold-in line on its own is enough to render', () => {
  const prose = parsePeriodProse({ also: 'Also this week: one obituary.' });
  assert.ok(prose);
  assert.equal(prose.lede, '');
});

test('parsing is idempotent — the persisted copy re-parses to itself', () => {
  const once = parsePeriodProse(full);
  assert.deepEqual(parsePeriodProse(once), once);
});
