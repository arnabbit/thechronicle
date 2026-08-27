import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceHost, sourceLabel } from '../src/lib/source.ts';

// A source link must read as the outlet that reported the story. The wire
// makes `sourceHeadline` optional, so the fallback is the part of this worth
// testing — including the malformed URLs, which must degrade rather than throw.

test('a source with a headline shows the headline', () => {
  assert.equal(
    sourceLabel({ postUrl: 'https://example.com/a?utm_source=x', sourceHeadline: 'Bridge reopens' }),
    'Bridge reopens',
  );
});

test('a source with no usable headline falls back to its host, not the URL', () => {
  assert.equal(sourceLabel({ postUrl: 'https://www.thehindu.com/news/national/x.html' }), 'thehindu.com');
  assert.equal(sourceLabel({ postUrl: 'https://example.com/a', sourceHeadline: '' }), 'example.com');
  assert.equal(sourceLabel({ postUrl: 'https://example.com/a', sourceHeadline: '   ' }), 'example.com');
});

test('the host is the host, with port, credentials and www stripped', () => {
  assert.equal(sourceHost('https://www.example.com/a/b?c=d#e'), 'example.com');
  assert.equal(sourceHost('http://example.com:8080/a'), 'example.com');
  assert.equal(sourceHost('https://user:pass@example.com/a'), 'example.com');
  assert.equal(sourceHost('https://news.example.co.uk'), 'news.example.co.uk');
});

test('a URL with no scheme still yields its host', () => {
  assert.equal(sourceHost('example.com/a/b'), 'example.com');
  assert.equal(sourceHost('//example.com/a'), 'example.com');
});

test('a malformed URL degrades to itself rather than throwing', () => {
  assert.equal(sourceHost(''), '');
  assert.equal(sourceHost('not a url'), 'not a url');
  assert.equal(sourceLabel({ postUrl: 'not a url' }), 'not a url');
});
