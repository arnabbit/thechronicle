// Writes public/index.html from the theme tokens.
//
// The shell's background values are not allowed to be hand-typed colours — see
// src/lib/webShell.ts for why — so the file is generated and committed, and
// test/web-shell.test.ts fails if the two ever diverge.
//
// Run: npm run build:web-shell

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webShellHtml } from '../src/lib/webShell.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(ROOT, 'public/index.html');

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, webShellHtml(), 'utf8');
console.log(`wrote ${target}`);
