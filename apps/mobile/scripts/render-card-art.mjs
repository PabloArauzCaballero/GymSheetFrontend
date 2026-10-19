#!/usr/bin/env node
/** Hoja de contactos de las ilustraciones: `node --experimental-strip-types scripts/render-card-art.mjs <dir>`. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ILLUSTRATION_KEYS, cardArtXml } from '../src/components/cards/art.ts';

const out = process.argv[2] ?? 'card-art';
mkdirSync(out, { recursive: true });
const COLS = 6;
const CELL = 150;
const rows = Math.ceil(ILLUSTRATION_KEYS.length / COLS);
let sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${COLS * CELL}" height="${rows * CELL}"><rect width="100%" height="100%" fill="#101522"/>`;
ILLUSTRATION_KEYS.forEach((key, index) => {
  const inner = cardArtXml(key).replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">', '').replace('</svg>', '');
  const x = (index % COLS) * CELL + 15;
  const y = Math.floor(index / COLS) * CELL + 8;
  sheet += `<g transform="translate(${x} ${y})">${inner.replaceAll('id="', `id="${index}-`).replaceAll('url(#', `url(#${index}-`)}</g><text x="${x + 60}" y="${y + 136}" fill="#9aa3b5" font-size="11" font-family="Helvetica" text-anchor="middle">${key}</text>`;
});
sheet += '</svg>';
writeFileSync(join(out, 'sheet.svg'), sheet);
execFileSync('rsvg-convert', ['-o', join(out, 'sheet.png'), join(out, 'sheet.svg')]);
console.log(join(out, 'sheet.png'));
