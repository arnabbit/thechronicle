import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { darkPalette, lightPalette } from '../src/theme/tokens.ts';
import { webShellHtml } from '../src/lib/webShell.ts';

// The shell paints the paper before any JavaScript runs, which means its two
// background values are the one pair of colours in the app that cannot be read
// from the theme at render time. They still have to *come* from it. So the file
// is generated, and this is the check that the committed copy has not drifted
// from the tokens it was generated out of.
//
// Equality alone would not be enough — a template that put the light value in
// the dark branch would still round-trip — so the structure is asserted too.

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const committed = readFileSync(resolve(ROOT, 'public/index.html'), 'utf8');

test('the committed shell is what the generator produces from the tokens', () => {
  assert.equal(
    committed,
    webShellHtml(),
    'public/index.html is stale — run `npm run build:web-shell`',
  );
});

test('the light paper colour is the default paint', () => {
  const beforeDarkQuery = committed.split('@media (prefers-color-scheme: dark)')[0];
  assert.ok(
    beforeDarkQuery.includes(`background-color: ${lightPalette.background};`),
    'the light background is not painted outside the dark query',
  );
});

test("the dark paper colour is painted inside the shell's own prefers-color-scheme query", () => {
  const darkQuery = committed.split('@media (prefers-color-scheme: dark)')[1];
  assert.ok(darkQuery, 'the shell carries no prefers-color-scheme query of its own');
  assert.ok(
    darkQuery.includes(`background-color: ${darkPalette.background};`),
    'the dark background is not painted inside the dark query',
  );
});

test('neither background is a colour the palettes do not name', () => {
  const backgrounds = [...committed.matchAll(/background-color:\s*([^;]+);/g)].map((m) => m[1].trim());
  assert.ok(backgrounds.length >= 2, 'expected the shell to paint both grounds');
  for (const value of backgrounds) {
    assert.ok(
      value === lightPalette.background || value === darkPalette.background,
      `the shell paints ${value}, which is neither palette's background`,
    );
  }
});

test('the shell keeps the placeholders the web build fills in', () => {
  // Expo resolves `public/index.html` ahead of its own template and substitutes
  // these two. Losing them would ship a literal placeholder as the tab title.
  assert.ok(committed.includes('%LANG_ISO_CODE%'));
  assert.ok(committed.includes('%WEB_TITLE%'));
  // And the root element react-native-web mounts into.
  assert.ok(committed.includes('id="root"'));
});
