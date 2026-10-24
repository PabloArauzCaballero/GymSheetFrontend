#!/usr/bin/env node
/**
 * Repi en PNG: `node --experimental-strip-types scripts/render-mascot.mjs [dir]`.
 *
 * Sin argumento escribe los PNG que empaqueta la app para los widgets
 * (`assets/mascot/<ánimo>.png`, 360 px = 120 pt @3x). Con un directorio escribe
 * además la hoja de contactos `sheet.png` para revisarlos de un vistazo.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MASCOT_MOODS, mascotXml } from '../src/features/nudge/mascot.ts';

const assets = new URL('../assets/mascot/', import.meta.url).pathname;
mkdirSync(assets, { recursive: true });
for (const mood of MASCOT_MOODS) {
  const svg = join(assets, `${mood}.svg`);
  writeFileSync(svg, mascotXml(mood));
  execFileSync('rsvg-convert', ['-w', '360', '-h', '360', '-o', join(assets, `${mood}.png`), svg]);
  execFileSync('rm', [svg]);
}

const out = process.argv[2];
if (out) {
  mkdirSync(out, { recursive: true });
  const CELL = 200;
  let sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${MASCOT_MOODS.length * CELL}" height="${CELL + 30}"><rect width="100%" height="100%" fill="#0F172A"/>`;
  MASCOT_MOODS.forEach((mood, index) => {
    const inner = mascotXml(mood).replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">', '').replace('</svg>', '');
    const x = index * CELL + 10;
    sheet += `<g transform="translate(${x} 10) scale(1.5)">${inner.replaceAll('id="', `id="${index}-`).replaceAll('url(#', `url(#${index}-`)}</g><text x="${x + 90}" y="${CELL + 16}" fill="#C1CCD6" font-size="15" font-family="Helvetica" text-anchor="middle">${mood}</text>`;
  });
  writeFileSync(join(out, 'sheet.svg'), `${sheet}</svg>`);
  execFileSync('rsvg-convert', ['-o', join(out, 'sheet.png'), join(out, 'sheet.svg')]);
  console.log(join(out, 'sheet.png'));
}
