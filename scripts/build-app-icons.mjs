// Generates every launcher, splash and favicon asset from one geometry.
//
// The mark is C from the design-19 canvas — a hairline rule, a heavy rule
// beneath it, a dateline bar under that — the app's own furniture, so the icon
// and the header say the same thing. The design boards live in `.scratch`,
// which is gitignored and does not travel; the geometry is therefore carried
// here, in the repository that ships the assets, so a regeneration is always
// possible. Boards are for judging, this is for building.
//
//     node scripts/build-app-icons.mjs
//
// No image dependency: these are axis-aligned rectangles on a flat ground, so
// they are rasterised directly and PNG-encoded with node's own zlib. Nothing to
// install, nothing to keep in step with a native binary.

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'images');

// Permanent, and chosen once: a launcher tile cannot follow the app's theme.
const PAPER = '#fcf9f4';
const INK = '#000000';
const DARK_INK = '#f2ece0';

// The 108-unit adaptive tile. Every shape sits inside the central 66 units —
// x 21..87, y 21..87 — which is the only region Android's mask guarantees.
const TILE = 108;
const SAFE_MIN = (TILE - 66) / 2;
const SAFE_MAX = TILE - SAFE_MIN;

// Mark C, verbatim from the design-19 board: hairline, heavy rule, dateline.
const MARK_C = [
  { x: 22, y: 36, w: 64, h: 2.5 },
  { x: 22, y: 46, w: 64, h: 10 },
  { x: 36, y: 64, w: 36, h: 4 },
];

for (const r of MARK_C) {
  if (r.x < SAFE_MIN || r.y < SAFE_MIN || r.x + r.w > SAFE_MAX || r.y + r.h > SAFE_MAX) {
    throw new Error(`mark escapes the adaptive safe zone: ${JSON.stringify(r)}`);
  }
}

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Coverage is computed analytically rather than sampled: these are axis-aligned
// rectangles, so the overlap of a rect with a pixel is exact arithmetic, and an
// exact edge beats an 8x supersample at 32px.
function overlap(lo, hi, a, b) {
  return Math.max(0, Math.min(hi, b) - Math.max(lo, a));
}

// `ground` null means transparent — what an adaptive foreground and a splash
// image both need.
function render(size, ground, ink) {
  const px = new Uint8Array(size * size * 4);
  const scale = size / TILE;
  const [gr, gg, gb] = ground ? rgb(ground) : [0, 0, 0];
  const ga = ground ? 255 : 0;
  const [ir, ig, ib] = rgb(ink);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let cover = 0;
      for (const r of MARK_C) {
        const w = overlap(x, x + 1, r.x * scale, (r.x + r.w) * scale);
        const h = overlap(y, y + 1, r.y * scale, (r.y + r.h) * scale);
        cover += w * h;
      }
      cover = Math.min(1, cover);

      const i = (y * size + x) * 4;
      // Source-over onto the ground, premultiplied by nothing: both layers are
      // flat, so a straight lerp is the composite.
      const a = ga / 255 + cover * (1 - ga / 255);
      const blend = (g, k) => (a === 0 ? 0 : Math.round((k * cover + g * (ga / 255) * (1 - cover)) / a));
      px[i] = blend(gr, ir);
      px[i + 1] = blend(gg, ig);
      px[i + 2] = blend(gb, ib);
      px[i + 3] = Math.round(a * 255);
    }
  }
  return px;
}

const CRC = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return (buf) => {
    let c = -1;
    for (const b of buf) c = table[(c ^ b) & 255] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
})();

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(CRC(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

function png(size, px) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // RGBA
  // Filter type 0 on every scanline: flat colour compresses to nothing anyway,
  // and an unfiltered image is one less thing that can be subtly wrong.
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    Buffer.from(px.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function write(name, size, ground, ink) {
  const file = join(OUT, name);
  writeFileSync(file, png(size, render(size, ground, ink)));
  console.log(`${name}  ${size}x${size}  ${ground || 'transparent'} / ${ink}`);
}

// The launcher tile, opaque on paper — it sits on a wallpaper either way.
write('icon.png', 1024, PAPER, INK);
// Adaptive: a flat paper ground, the mark alone on the foreground, and the
// monochrome silhouette Android 13 tints for themed icons.
write('android-icon-background.png', 1024, PAPER, PAPER);
write('android-icon-foreground.png', 1024, null, INK);
write('android-icon-monochrome.png', 1024, null, INK);
// The splash DOES follow the OS theme, unlike the tile: two images, each on the
// ground `app.json` pairs it with.
write('splash-icon.png', 1024, null, INK);
write('splash-icon-dark.png', 1024, null, DARK_INK);
// The browser tab.
write('favicon.png', 32, PAPER, INK);
