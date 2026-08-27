import test from 'node:test';
import assert from 'node:assert/strict';
import { PAPER, routeTitle } from '../src/lib/title.ts';

// Each screen carries its own title so tabs and history are distinguishable.
// The article route sets it from whatever it currently has — headline, state
// slug, or nothing while loading — so all three branches go through one call.

test('a subject is titled ahead of the paper', () => {
  assert.equal(routeTitle('Bridge reopens after two years'), `Bridge reopens after two years — ${PAPER}`);
});

test('no subject leaves the paper alone as the title', () => {
  assert.equal(routeTitle(), PAPER);
  assert.equal(routeTitle(undefined), PAPER);
  assert.equal(routeTitle(null), PAPER);
  assert.equal(routeTitle(''), PAPER);
  assert.equal(routeTitle('   '), PAPER);
});

test('a subject is trimmed rather than printed with its whitespace', () => {
  assert.equal(routeTitle('  Not in the paper\n'), `Not in the paper — ${PAPER}`);
});
