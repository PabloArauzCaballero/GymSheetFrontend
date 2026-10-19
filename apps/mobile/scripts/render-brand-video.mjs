#!/usr/bin/env node
/**
 * El vídeo de marca REPP para redes, en 4K a 60 fps.
 *
 * Evalúa **la misma coreografía** que la cortinilla de la app
 * (`src/components/brand/intro-choreography.ts`) fotograma a fotograma, pinta
 * cada uno como SVG y lo rasteriza con `rsvg-convert`: vectorial hasta el último
 * píxel, sin capturar pantallas ni reescalar.
 *
 * Uso: `yarn workspace @gymsheet/mobile brand:video [carpeta-de-salida]`
 * Necesita `rsvg-convert` y `ffmpeg`.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { cpus, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  appWordWidth,
  baselineClip,
  INTRO,
  introLayout,
  letterOpacity,
  letterPath,
  restingWordmark,
  rPath,
  sheenOpacity,
  sheenPath,
  SPLASH_UNIT,
  tickPath,
} from '../src/components/brand/intro-choreography.ts';

const NAVY = '#0F172A';
const JADE = '#2E8B7B';
const WHITE = '#FFFFFF';
const FPS = 60;

/** En redes no hay splash que relevar: el signo se presenta antes de moverse. */
const LEAD_IN = 450;
const HOLD = 1700;
const FADE_OUT = 550;
const TOTAL = LEAD_IN + INTRO.main + HOLD + FADE_OUT;

const FORMATS = [
  { name: 'REPP_reel_2160x3840', width: 2160, height: 3840 },
  { name: 'REPP_feed_2160x2160', width: 2160, height: 2160 },
  { name: 'REPP_wide_3840x2160', width: 3840, height: 2160 },
];

const out = resolve(process.argv[2] ?? 'brand-video');
mkdirSync(out, { recursive: true });

function frameSvg(format, layout, resting, clip, ms) {
  const t = Math.max(0, ms - LEAD_IN);
  const fade = Math.min(1, Math.max(0, (ms - (TOTAL - FADE_OUT)) / FADE_OUT));
  const fadeEased = fade * fade * (3 - 2 * fade);
  const lockup = 1 - fadeEased;
  const { width, height } = format;
  const cx = width / 2;
  const cy = height / 2;
  const letters = [0, 1, 2]
    .map((i) => `<path d="${letterPath(i, t, layout)}" fill="${WHITE}" fill-opacity="${letterOpacity(i, t)}"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs>
  <radialGradient id="stage" cx="${cx}" cy="${cy}" r="${Math.hypot(cx, cy)}" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#17233F"/><stop offset="0.55" stop-color="${NAVY}"/><stop offset="1" stop-color="#090E1B"/>
  </radialGradient>
  <clipPath id="baseline"><rect x="${clip.x}" y="${clip.y}" width="${clip.width}" height="${clip.height}"/></clipPath>
  <clipPath id="ink">${resting.map((d) => `<path d="${d}"/>`).join('')}</clipPath>
  <linearGradient id="sheen" x1="0" x2="1" y1="0" y2="0">
    <stop offset="0" stop-color="${JADE}" stop-opacity="0"/><stop offset="0.5" stop-color="${JADE}" stop-opacity="0.85"/><stop offset="1" stop-color="${JADE}" stop-opacity="0"/>
  </linearGradient>
</defs>
<rect width="${width}" height="${height}" fill="url(#stage)"/>
<g opacity="${lockup}" transform="translate(${cx} ${cy}) scale(${1 + fadeEased * 0.04}) translate(${-cx} ${-cy})">
  <g clip-path="url(#baseline)">${letters}</g>
  <path d="${rPath(t, layout)}" fill="${WHITE}" fill-rule="evenodd"/>
  <path d="${tickPath(t, layout)}" fill="${JADE}"/>
  <g clip-path="url(#ink)"><path d="${sheenPath(t, layout)}" fill="url(#sheen)" opacity="${sheenOpacity(t)}"/></g>
</g>
</svg>`;
}

for (const format of FORMATS) {
  const short = Math.min(format.width, format.height);
  const wordWidth = short * 0.58;
  // Misma proporción signo/logotipo que en un teléfono de 390 pt.
  const markUnit = (wordWidth * SPLASH_UNIT) / appWordWidth(390);
  const layout = introLayout(format.width, format.height, markUnit, wordWidth);
  const resting = restingWordmark(layout);
  const clip = baselineClip(layout);

  const work = mkdtempSync(join(tmpdir(), 'repp-video-'));
  const frames = Math.round((TOTAL / 1000) * FPS);
  const list = [];
  for (let f = 0; f < frames; f++) {
    const name = `f${String(f).padStart(4, '0')}`;
    writeFileSync(join(work, `${name}.svg`), frameSvg(format, layout, resting, clip, (f * 1000) / FPS));
    list.push(name);
  }
  writeFileSync(join(work, 'list.txt'), list.join('\n'));
  execFileSync(
    'sh',
    ['-c', `cd "${work}" && xargs -P ${cpus().length} -I{} rsvg-convert -b "${NAVY}" -o {}.png {}.svg < list.txt`],
    { stdio: 'inherit' },
  );
  const file = join(out, `${format.name}_60fps.mp4`);
  execFileSync(
    'ffmpeg',
    [
      '-y', '-loglevel', 'error',
      '-framerate', String(FPS), '-i', join(work, 'f%04d.png'),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '12', '-tune', 'animation',
      '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
      '-movflags', '+faststart',
      file,
    ],
    { stdio: 'inherit' },
  );
  rmSync(work, { recursive: true, force: true });
  console.log(`${file} · ${frames} fotogramas · ${(TOTAL / 1000).toFixed(2)} s`);
}
