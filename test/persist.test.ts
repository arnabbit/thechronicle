import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_PERSIST_AGE_MS, isPersistable, type PersistCandidate } from '../src/lib/persist.ts';

// The durable cache's only eviction step. Three rules decide what survives a
// session, and each of the three fails silently when wrong: an unbounded blob,
// a cache full of things no screen reads, or two copies of every edition.

const NOW = Date.UTC(2026, 7, 27, 6, 0, 0);
const fresh: Omit<PersistCandidate, 'queryKey'> = {
  dataUpdatedAt: NOW - 1000,
  status: 'success',
};

const at = (
  queryKey: readonly unknown[],
  over: Partial<Omit<PersistCandidate, 'queryKey'>> = {},
) => isPersistable({ ...fresh, ...over, queryKey }, NOW);

test('a durable key persists', () => {
  assert.equal(at(['edition', '2026-08-26']), true);
  assert.equal(at(['edition', '2026-08-26', 'articles', 'home']), true);
  assert.equal(at(['article', 'a1b2c3']), true);
  assert.equal(at(['period', '2026-W35']), true);
});

test('an unknown prefix does not persist', () => {
  assert.equal(at(['search', 'delhi']), false);
  assert.equal(at(['bookmarks']), false);
  assert.equal(at([]), false);
  assert.equal(at([{ edition: '2026-08-26' }]), false);
});

test('the archive index is not one of the three durable entities', () => {
  // `['editions']` is a different key from `['edition', date]`. A prefix test
  // written as `startsWith` would sweep it in, and the index grows at its head
  // every day the paper publishes.
  assert.equal(at(['editions']), false);
});

test('data older than 90 days does not persist, and 90 days exactly still does', () => {
  assert.equal(at(['article', 'a1'], { dataUpdatedAt: NOW - MAX_PERSIST_AGE_MS }), true);
  assert.equal(at(['article', 'a1'], { dataUpdatedAt: NOW - MAX_PERSIST_AGE_MS - 1 }), false);
});

test('a latest-keyed entry never persists, however durable its prefix', () => {
  // The front page addresses the edition by sentinel and mirrors it onto the
  // resolved date. Persisting both would store two copies of one edition.
  assert.equal(at(['edition', 'latest']), false);
  assert.equal(at(['edition', 'latest', 'articles', 'home']), false);
  assert.equal(at(['edition', 'latest', 'articles', 'politics']), false);
});

test('a date that merely contains the word does not count as the sentinel', () => {
  // Whole-element match. A category or id spelling out the sentinel inside a
  // longer string is not the sentinel.
  assert.equal(at(['article', 'latest-developments']), true);
});

test('only a successful read is worth keeping', () => {
  assert.equal(at(['edition', '2026-08-26'], { status: 'pending' }), false);
  assert.equal(at(['edition', '2026-08-26'], { status: 'error' }), false);
});

test('an entry that has never been updated has no data to keep', () => {
  assert.equal(at(['article', 'a1'], { dataUpdatedAt: 0 }), false);
});
