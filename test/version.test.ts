import test from 'node:test';
import assert from 'node:assert/strict';
import { isNewerVersion, updateLine } from '../src/lib/version.ts';

// Whether to nag a reader about a new build. Wrong in the permissive
// direction is a notice on every launch about a build that is not newer, so
// every uncertain case is expected to answer no.

test('a later version is newer', () => {
  assert.equal(isNewerVersion('1.0.1', '1.0.0'), true);
  assert.equal(isNewerVersion('1.1.0', '1.0.9'), true);
  assert.equal(isNewerVersion('2.0.0', '1.9.9'), true);
});

test('the same version is not newer', () => {
  assert.equal(isNewerVersion('1.0.0', '1.0.0'), false);
});

test('an earlier version is not newer', () => {
  assert.equal(isNewerVersion('1.0.0', '1.0.1'), false);
  assert.equal(isNewerVersion('1.9.9', '2.0.0'), false);
});

test('a leading v is a tag convention, not part of the version', () => {
  assert.equal(isNewerVersion('v1.0.1', '1.0.0'), true);
  assert.equal(isNewerVersion('V1.0.0', '1.0.0'), false);
});

test('parts compare as numbers, not as strings', () => {
  // The string comparison every hand-rolled version check gets wrong.
  assert.equal(isNewerVersion('1.10.0', '1.9.0'), true);
  assert.equal(isNewerVersion('1.9.0', '1.10.0'), false);
  assert.equal(isNewerVersion('0.100.0', '0.99.0'), true);
});

test('a missing part is a zero', () => {
  assert.equal(isNewerVersion('1.2', '1.2.0'), false);
  assert.equal(isNewerVersion('1.2.0', '1.2'), false);
  assert.equal(isNewerVersion('1.2.1', '1.2'), true);
  assert.equal(isNewerVersion('2', '1.9.9'), true);
});

test('anything that is not a dotted number answers no', () => {
  // A pre-release tag, a branch name, a blank release, a nightly. None of
  // them is a comparison this can make, and guessing would nag.
  for (const odd of ['', '1.0.0-beta', 'latest', 'v', '1.0.0.', 'main', '1,0,0']) {
    assert.equal(isNewerVersion(odd, '1.0.0'), false, `${odd} should not be newer`);
    assert.equal(isNewerVersion('9.9.9', odd), false, `${odd} should not be comparable`);
  }
});

test('surrounding whitespace is not a version difference', () => {
  assert.equal(isNewerVersion('  1.0.1  ', '1.0.0'), true);
  assert.equal(isNewerVersion(' 1.0.0 ', '1.0.0'), false);
});

test('the notice names the version without its tag prefix', () => {
  assert.ok(updateLine('v1.2.0').startsWith('Version 1.2.0 is available.'));
  assert.ok(updateLine('1.2.0').startsWith('Version 1.2.0 is available.'));
});
