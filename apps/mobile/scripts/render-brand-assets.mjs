#!/usr/bin/env node
/**
 * Icono, icono adaptable, pantalla de arranque y favicon de REPP a partir del
 * signo vectorial (`src/components/brand/mark.ts`).
 *
 * El signo se coloca **por su caja de tinta**, no por su lienzo de 120: el
 * vector entregado tiene la tinta corrida 11,5 unidades a la izquierda y,
 * colocado por el lienzo, el icono del teléfono salía descentrado.
 *
 * El splash usa `SPLASH_MARK_SCALE` de la coreografía: la cortinilla arranca
 * con el signo exactamente donde lo dejó el splash nativo, sin salto.
 *
 * Uso: `yarn workspace @gymsheet/mobile brand:assets` (necesita `rsvg-convert`).
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPP_MARK_BODY, REPP_MARK_BOX, REPP_MARK_CENTER, REPP_MARK_TICK } from '../src/components/brand/mark.ts';
import { SPLASH_MARK_SCALE } from '../src/components/brand/intro-choreography.ts';

const NAVY = '#0F172A';
const JADE = '#2E8B7B';
const WHITE = '#FFFFFF';

const assets = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
const work = mkdtempSync(join(tmpdir(), 'repp-brand-'));

/** El signo con el centro de su tinta en el centro de un lienzo `size`, `unit` px por unidad. */
function mark(size, unit) {
  const dx = size / 2 - REPP_MARK_CENTER.x * unit;
  const dy = size / 2 - REPP_MARK_CENTER.y * unit;
  return `<g transform="translate(${dx} ${dy}) scale(${unit})"><path d="${REPP_MARK_BODY}" fill="${WHITE}" fill-rule="evenodd"/><path d="${REPP_MARK_TICK}" fill="${JADE}"/></g>`;
}
/** Unidad para que la tinta mida `ratio` del alto del lienzo. */
const byHeight = (size, ratio) => (size * ratio) / REPP_MARK_BOX.height;
const svg = (size, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${body}</svg>`;
const navy = (size) => `<rect width="${size}" height="${size}" fill="${NAVY}"/>`;

const files = {
  // iOS: opaco (la App Store rechaza alfa) y a sangre; el sistema redondea.
  // La tinta al 50 % del alto deja el aire que tienen los iconos de sistema.
  'icon.png': [1024, svg(1024, `${navy(1024)}${mark(1024, byHeight(1024, 0.5))}`)],
  // Android: primer plano transparente; el lanzador recorta a un círculo del
  // 61 % del lado. La diagonal de la tinta cabe dentro con margen.
  'adaptive-icon.png': [1024, svg(1024, mark(1024, byHeight(1024, 0.36)))],
  // Arranque: el lienzo de 120 de `app.json` (`imageWidth`), el signo a la
  // escala que la cortinilla espera encontrar en su primer fotograma.
  'splash.png': [2048, svg(120, mark(120, SPLASH_MARK_SCALE))],
  'favicon.png': [48, svg(48, `${navy(48)}${mark(48, byHeight(48, 0.6))}`)],
};

for (const [name, [pixels, source]] of Object.entries(files)) {
  const file = join(work, name.replace('.png', '.svg'));
  writeFileSync(file, source);
  execFileSync('rsvg-convert', ['-w', String(pixels), '-h', String(pixels), '-o', join(assets, name), file]);
  console.log(`assets/${name} ${pixels}×${pixels}`);
}
