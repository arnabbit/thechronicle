import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_QUERY_LENGTH,
  MIN_QUERY_LENGTH,
  isSearchable,
  normaliseQuery,
  searchQueryState,
} from '../src/lib/searchQuery.ts';

// The endpoint's bounds, checked before a request leaves the device. Input in,
// output out: a raw URL param and the answer to "may this be sent".

test('a query is normalised the way the endpoint would see it', () => {
  assert.equal(normaliseQuery('  delhi  '), 'delhi');
  assert.equal(normaliseQuery('delhi'), 'delhi');
  assert.equal(normaliseQuery('   '), '');
  assert.equal(normaliseQuery(undefined), '');
  assert.equal(normaliseQuery(null), '');
});

test('an absent or blank query is blank, not short', () => {
  // Two different screens: a resting field, versus a search in progress.
  assert.equal(searchQueryState(undefined), 'blank');
  assert.equal(searchQueryState(''), 'blank');
  assert.equal(searchQueryState('   '), 'blank');
  assert.equal(searchQueryState('\n\t'), 'blank');
});

test('one character is short, two is the minimum the endpoint accepts', () => {
  assert.equal(searchQueryState('a'), 'short');
  assert.equal(searchQueryState('  a  '), 'short');
  assert.equal(searchQueryState('ai'), 'ready');
  assert.equal(MIN_QUERY_LENGTH, 2);
});

test('the length bound is measured after trimming, not before', () => {
  const atLimit = 'x'.repeat(MAX_QUERY_LENGTH);
  assert.equal(searchQueryState(atLimit), 'ready');
  assert.equal(searchQueryState(`   ${atLimit}   `), 'ready');
  assert.equal(searchQueryState(`${atLimit}x`), 'long');
  assert.equal(MAX_QUERY_LENGTH, 100);
});

test('only a query inside both bounds may be sent', () => {
  assert.equal(isSearchable('delhii'), true);
  assert.equal(isSearchable('air india crash report'), true);
  assert.equal(isSearchable(''), false);
  assert.equal(isSearchable('a'), false);
  assert.equal(isSearchable('x'.repeat(MAX_QUERY_LENGTH + 1)), false);
});
