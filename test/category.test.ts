import test from 'node:test';
import assert from 'node:assert/strict';
import { categoryLabel } from '../src/lib/category.ts';

// The fallback label for a row rendered before the edition's category list is
// loaded. It mirrors what the backend does server-side for a slug it does not
// recognise: title-case it rather than drop it.

test('a single-word slug is title-cased', () => {
  assert.equal(categoryLabel('politics'), 'Politics');
  assert.equal(categoryLabel('home'), 'Home');
});

test('a hyphenated slug becomes spaced words', () => {
  assert.equal(categoryLabel('human-interest'), 'Human Interest');
  assert.equal(categoryLabel('law-and-order'), 'Law And Order');
});

test('an unknown slug is title-cased rather than dropped', () => {
  // No allow-list here: a category the client has never heard of still has to
  // render, because the backend invents them from the source material.
  assert.equal(categoryLabel('agriculture'), 'Agriculture');
  assert.equal(categoryLabel('space-and-science'), 'Space And Science');
});

test('an empty slug is an empty label, not "Undefined"', () => {
  assert.equal(categoryLabel(''), '');
});

test('labelling is stable — a label fed back in is unchanged in shape', () => {
  for (const slug of ['politics', 'human-interest', 'agriculture']) {
    const label = categoryLabel(slug);
    assert.equal(categoryLabel(label.toLowerCase().split(' ').join('-')), label);
  }
});
