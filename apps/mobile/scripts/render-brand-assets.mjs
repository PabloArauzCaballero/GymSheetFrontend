#!/usr/bin/env node
/**
 * Icono, icono adaptable, pantalla de arranque y favicon de REPP a partir del
 * signo vectorial (`src/components/brand/mark.ts`) y del acento del catálogo.
 *
 * Uso: `node --experimental-strip-types scripts/render-brand-assets.mjs` (necesita `rsvg-convert`).
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gymsheetTenant } from '../../../packages/design-tokens/src/tenants.ts';
import { REPP_MARK_BODY, REPP_MARK_TICK } from '../src/components/brand/mark.ts';

const assets = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
const work = mkdtempSync(join(tmpdir(), 'repp-brand-'));
const { accentGradient, accentContrast } = gymsheetTenant.colors;
const STAGE = '#050505';

/** El signo, centrado en un lienzo `size`, ocupando `ratio` de su lado. */
function mark(size, ratio, ink) {
  const side = size * ratio;
  const scale = side / 100;
  // El dibujo ocupa x 22–84, y 16–92 del lienzo de 100: se centra por su caja, no por el lienzo.
  const dx = size / 2 - 53 * scale;
  const dy = size / 2 - 54 * scale;
  return `<g transform="translate(${dx} ${dy}) scale(${scale})"><path d="${REPP_MARK_BODY}" fill="${ink}" fill-rule="evenodd"/><path d="${REPP_MARK_TICK}" fill="${ink}"/></g>`;
}
const gradient = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${accentGradient[0]}"/><stop offset="1" stop-color="${accentGradient[1]}"/></linearGradient></defs>`;
const svg = (size, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${body}</svg>`;

const files = {
  // iOS recorta la esquina: el relleno va a sangre.
  'icon.png': svg(1024, `${gradient}<rect width="1024" height="1024" fill="url(#g)"/>${mark(1024, 0.6, accentContrast)}`),
  // Android: primer plano transparente dentro de la zona segura (66 %); el fondo lo pone app.json.
  'adaptive-icon.png': svg(1024, mark(1024, 0.42, accentContrast)),
  // Arranque: la misma ficha que abre la cortinilla animada, sobre su mismo fondo.
  'splash.png': svg(1024, `${gradient}<rect x="232" y="232" width="560" height="560" rx="146" fill="url(#g)"/>${mark(1024, 0.34, accentContrast)}`),
  'favicon.png': svg(192, `${gradient}<rect width="192" height="192" rx="44" fill="url(#g)"/>${mark(192, 0.6, accentContrast)}`),
};

for (const [name, source] of Object.entries(files)) {
  const file = join(work, name.replace('.png', '.svg'));
  writeFileSync(file, source);
  execFileSync('rsvg-convert', ['-o', join(assets, name), file]);
  console.log(`assets/${name}`);
}
console.log(`fondo de arranque: ${STAGE} · fondo del icono adaptable: ${accentGradient[1]}`);
