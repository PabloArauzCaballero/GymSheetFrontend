#!/usr/bin/env node
/** Hoja de contactos de las arenas: `node --experimental-strip-types scripts/render-arena-art.mjs <dir>`. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ARENA_CODES } from '../src/theme/arenas.ts';
import { ARENA_ART_HEIGHT, ARENA_ART_WIDTH, ARENA_COUNT, arenaArtXml } from '../src/features/arena-road/arena-art.ts';

const out = process.argv[2] ?? 'arena-art';
mkdirSync(out, { recursive: true });
const COLS = 4;
const GAP = 12;
const rows = Math.ceil(ARENA_COUNT / COLS);
const width = COLS * (ARENA_ART_WIDTH + GAP) + GAP;
const height = rows * (ARENA_ART_HEIGHT + GAP) + GAP;
let sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#0b0f19"/>`;
for (let index = 0; index < ARENA_COUNT; index += 1) {
  const inner = arenaArtXml(ARENA_CODES[index] ?? "", index + 1).replace(/<svg[^>]*>/, '').replace('</svg>', '');
  const x = GAP + (index % COLS) * (ARENA_ART_WIDTH + GAP);
  const y = GAP + Math.floor(index / COLS) * (ARENA_ART_HEIGHT + GAP);
  sheet += `<svg x="${x}" y="${y}" width="${ARENA_ART_WIDTH}" height="${ARENA_ART_HEIGHT}" viewBox="0 0 ${ARENA_ART_WIDTH} ${ARENA_ART_HEIGHT}">${inner}</svg>`;
}
sheet += '</svg>';
writeFileSync(join(out, 'arenas.svg'), sheet);
execFileSync('rsvg-convert', ['-z', '2', '-o', join(out, 'arenas.png'), join(out, 'arenas.svg')]);
console.log(join(out, 'arenas.png'));
