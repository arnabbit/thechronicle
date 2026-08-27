import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, NotFoundError } from '../src/api/errors.ts';
import { rowState } from '../src/lib/rowState.ts';

// One row in a rendered list, not a whole screen. The distinction under test
// is "the article is gone" versus "the article is fine and you are not
// connected" — two different things to tell a reader, and the row says which.

const held = { hasArticle: true, error: null, online: true, paused: false };

test('an article in hand needs no row state', () => {
  assert.equal(rowState(held), null);
});

test('a typed 404 is dead, even with a cached copy still in hand', () => {
  // Revalidation exists to find this out. A stale copy must not outvote it.
  assert.equal(rowState({ ...held, error: new NotFoundError() }), 'dead');
});

test('a 404 while offline is still dead — the article is gone either way', () => {
  const state = rowState({ ...held, error: new NotFoundError(), online: false, paused: true });
  assert.equal(state, 'dead');
});

test('nothing in hand while offline is unavailable offline, not dead', () => {
  assert.equal(rowState({ ...held, hasArticle: false, online: false }), 'unavailableOffline');
});

test('nothing in hand with a paused fetch is unavailable offline', () => {
  // Query pauses rather than fails when it believes it is offline, so paused
  // is the signal that arrives first.
  assert.equal(rowState({ ...held, hasArticle: false, paused: true }), 'unavailableOffline');
});

test('a failure while online is not a row state — the row renders what it has', () => {
  // No third kind. "Not saved for offline reading" would be a lie to a
  // connected reader, and "no longer available" would be a guess.
  const state = rowState({ ...held, hasArticle: false, error: new ApiError(500, 'x', 'boom') });
  assert.equal(state, null);
});

test('only the typed error counts as dead, not anything shaped like a 404', () => {
  const lookalike = { status: 404, message: 'Not found' };
  assert.equal(rowState({ ...held, hasArticle: false, error: lookalike }), null);
});
