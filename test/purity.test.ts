import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// The condition under which this suite exists at all: it stays pure. A module
// that cannot be imported without pulling in React Native is out of the suite
// by definition, and this is the check that keeps it that way as later tickets
// add their own modules — the dehydration predicate, the period arithmetic,
// the end-of-feed slot ordering.
//
// The suite passing under bare Node is already evidence, since React Native's
// entry point is untranspiled Flow. This makes the rule explicit and names the
// offending file when someone crosses it.

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

/** Anything that reaches, or drags in, the renderer. */
const RENDERER = [
  'react',
  'react-dom',
  'react-native',
  'react-native-web',
  'expo',
  'expo-router',
  'expo-constants',
  '@expo/vector-icons',
  '@react-navigation/native',
  '@tanstack/react-query',
  'zustand',
];

function isRenderer(specifier: string): boolean {
  return RENDERER.some((name) => specifier === name || specifier.startsWith(`${name}/`));
}

function importsOf(source: string): string[] {
  // Type-only imports are erased before anything runs, so they cannot pull a
  // module in. Everything else counts, side-effect imports included.
  const code = source.replace(/^\s*(?:import|export)\s+type\s[\s\S]*?from\s*['"][^'"]+['"];?$/gm, '');
  const found = new Set<string>();
  for (const match of code.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)) found.add(match[1]);
  for (const match of code.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) found.add(match[1]);
  for (const match of code.matchAll(/^\s*import\s*['"]([^'"]+)['"]/gm)) found.add(match[1]);
  return [...found];
}

test('nothing the suite imports reaches React Native, directly or transitively', () => {
  const entries = readdirSync(HERE)
    .filter((name) => name.endsWith('.test.ts'))
    .map((name) => resolve(HERE, name));
  assert.ok(entries.length >= 4, 'expected the suite to have test files to scan');

  const seen = new Set<string>();
  const queue = [...entries];
  const visited: string[] = [];

  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    visited.push(relative(ROOT, file).split(sep).join('/'));

    for (const specifier of importsOf(readFileSync(file, 'utf8'))) {
      if (specifier.startsWith('node:')) continue;
      if (specifier.startsWith('.')) {
        queue.push(resolve(dirname(file), specifier));
        continue;
      }
      assert.ok(
        !isRenderer(specifier),
        `${relative(ROOT, file)} imports "${specifier}", which reaches the renderer`,
      );
      assert.fail(`${relative(ROOT, file)} imports "${specifier}" — the suite has no third-party dependencies`);
    }
  }

  // Guard against a scan that walked nothing and passed by default.
  for (const expected of [
    'src/lib/screenState.ts',
    'src/lib/date.ts',
    'src/lib/category.ts',
    'src/lib/source.ts',
    'src/lib/title.ts',
    'src/lib/searchQuery.ts',
    'src/lib/persist.ts',
    'src/lib/share.ts',
    'src/lib/rowState.ts',
    'src/lib/period.ts',
    'src/lib/feedSlot.ts',
    'src/lib/webShell.ts',
    'src/theme/tokens.ts',
    'src/api/errors.ts',
  ]) {
    assert.ok(visited.includes(expected), `expected the scan to reach ${expected}, walked ${visited.join(', ')}`);
  }
});
