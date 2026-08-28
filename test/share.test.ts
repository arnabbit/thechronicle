import test from 'node:test';
import assert from 'node:assert/strict';
import { WEB_ORIGIN, articleUrl, shareMessage } from '../src/lib/share.ts';

// What lands in someone else's chat window. The link has to be the web link,
// because the person receiving it does not have the app.

test('an article URL is the web build\'s own route', () => {
  assert.equal(articleUrl('a1b2c3'), `${WEB_ORIGIN}/article/a1b2c3`);
});

test('an id with URL-significant characters is encoded', () => {
  assert.equal(articleUrl('a/b?c'), `${WEB_ORIGIN}/article/a%2Fb%3Fc`);
});

test('the message is the headline then the link', () => {
  assert.equal(
    shareMessage('Sugar prices rise by Re 1 per kg', 'x1'),
    `Sugar prices rise by Re 1 per kg\n${WEB_ORIGIN}/article/x1`,
  );
});

test('a headline that is only whitespace leaves the link to speak for itself', () => {
  assert.equal(shareMessage('   ', 'x1'), `${WEB_ORIGIN}/article/x1`);
  assert.equal(shareMessage('', 'x1'), `${WEB_ORIGIN}/article/x1`);
});

test('a headline is trimmed rather than carried with its whitespace', () => {
  assert.equal(shareMessage('  Held  ', 'x1'), `Held\n${WEB_ORIGIN}/article/x1`);
});
