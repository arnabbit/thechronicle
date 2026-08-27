import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, NotFoundError } from '../src/api/errors.ts';
import { screenState } from '../src/lib/screenState.ts';

// The selection every screen shares. Six screens make the same choice, and the
// branch that separates a dead connection from a dead server is the one worth
// pinning down: it reads connectivity, not just query status.

const online = { status: 'success' as const, error: null, online: true, count: 3 };

test('a pending query is loading, whatever else is true', () => {
  assert.equal(screenState({ ...online, status: 'pending', count: 0 }), 'loading');
  assert.equal(screenState({ ...online, status: 'pending', online: false }), 'loading');
});

test('a 404 is missing, not an error', () => {
  const state = screenState({ ...online, status: 'error', error: new NotFoundError(), count: 0 });
  assert.equal(state, 'missing');
});

test('a 404 while offline is still missing — the page does not exist either way', () => {
  const state = screenState({
    ...online,
    status: 'error',
    error: new NotFoundError(),
    online: false,
    count: 0,
  });
  assert.equal(state, 'missing');
});

test('only the typed error counts as missing, not anything shaped like a 404', () => {
  // A 404 the client did not classify is still a failed request. Duck-typing
  // this would let an unrelated `{ status: 404 }` suppress the retry action.
  const lookalike = { status: 404, message: 'Not found' };
  assert.equal(screenState({ ...online, status: 'error', error: lookalike, count: 0 }), 'error');
});

test('a failure while offline is offline, and the same failure online is an error', () => {
  const failure = new ApiError(500, 'internal', 'boom');
  assert.equal(
    screenState({ ...online, status: 'error', error: failure, online: false, count: 0 }),
    'offline',
  );
  assert.equal(
    screenState({ ...online, status: 'error', error: failure, online: true, count: 0 }),
    'error',
  );
});

test('a failure with rows already on screen still reports the failure', () => {
  // Count only decides the success branch. A refetch that fails after a good
  // first page must not be reported as content.
  const state = screenState({
    ...online,
    status: 'error',
    error: new Error('boom'),
    count: 12,
  });
  assert.equal(state, 'error');
});

test('a successful read of nothing is empty', () => {
  assert.equal(screenState({ ...online, count: 0 }), 'empty');
});

test('a successful read with rows has no state — there is content to render', () => {
  assert.equal(screenState({ ...online, count: 1 }), null);
  assert.equal(screenState({ ...online, count: 200 }), null);
});
