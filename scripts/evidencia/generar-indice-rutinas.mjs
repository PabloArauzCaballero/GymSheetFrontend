#!/usr/bin/env node
/**
 * Genera `docs/evidencias/rutinas/INDICE.md` a partir de lo que HAY en disco.
 *
 * Lee `pasos.json` (las capturas que exige 06_PRUEBAS_Y_EVIDENCIA.md §5 y qué
 * debe verse en cada una) y `revisiones.json` (qué capturas inspeccionó una
 * persona y qué observó), y comprueba cada archivo esperado. Una captura que no
 * existe sale como «falta»; un paso que no se pudo capturar sale con su motivo.
 * El índice nunca declara hecho lo que no está en disco.
 *
 * Uso: node scripts/evidencia/generar-indice-rutinas.mjs
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const base = join(root, 'docs', 'evidencias', 'rutinas');
const { pasos } = JSON.parse(readFileSync(join(base, 'pasos.json'), 'utf8'));
const reviewsPath = join(base, 'revisiones.json');
const reviews = existsSync(reviewsPath) ? JSON.parse(readFileSync(reviewsPath, 'utf8')) : {};

const WEB_COMBOS = [
  [390, 'claro'],
  [390, 'oscuro'],
  [1440, 'claro'],
  [1440, 'oscuro'],
];

function expectedFiles(step, platform) {
  const stem = `${step.rf}_p${step.paso}_${step.nombre}`;
  return platform === 'web'
    ? WEB_COMBOS.map(([width, theme]) => `${stem}_${width}_${theme}.png`)
    : [`${stem}_ios_oscuro.png`];
}

const rows = [];
const totals = new Map();
for (const step of pasos) {
  if (step.plataformas.length === 0) {
    rows.push({ step, platform: '—', files: [], present: 0, note: step.faltante });
    const total = totals.get(step.rf) ?? { web: [0, 0], movil: [0, 0], faltantes: 0 };
    total.faltantes += 1;
    totals.set(step.rf, total);
    continue;
  }
  for (const platform of step.plataformas) {
    const files = expectedFiles(step, platform);
    const folder = platform === 'web' ? 'web' : 'movil';
    const present = files.filter((file) => existsSync(join(base, step.rf, folder, file)));
    const reviewed = present.filter((file) => reviews[file]);
    rows.push({ step, platform, folder, files, present: present.length, reviewed: reviewed.length });
    const key = step.rf;
    const total = totals.get(key) ?? { web: [0, 0], movil: [0, 0], faltantes: 0 };
    total[platform === 'web' ? 'web' : 'movil'][0] += present.length;
    total[platform === 'web' ? 'web' : 'movil'][1] += files.length;
    totals.set(key, total);
  }
}

const lines = [];
lines.push('# Evidencia — Rutinas REPP (F2 · RF-03 a RF-08)', '');
lines.push(
  'Generado por `scripts/evidencia/generar-indice-rutinas.mjs` a partir de lo que existe en disco. ' +
    'Un archivo que falta sale como **falta**; un paso que no se pudo capturar lleva su motivo. ' +
    'Una captura cuenta como **revisada** sólo si está en `revisiones.json` con lo que se observó.',
  '',
);
lines.push('Web: 390 y 1440 px × tema claro y oscuro (4 capturas por paso). Móvil: iOS Simulator (iPhone 17 Pro), sólo tema oscuro: la app móvil no tiene tema claro.', '');
lines.push('## Resumen por requisito', '');
lines.push('| RF | Web (capturas) | Móvil (capturas) | Pasos sin captura |', '|---|---|---|---|');
for (const [rf, total] of [...totals].sort()) {
  lines.push(
    `| ${rf} | ${total.web[0]} / ${total.web[1]} | ${total.movil[0]} / ${total.movil[1]} | ${total.faltantes} |`,
  );
}
lines.push('', '## Detalle', '');
lines.push('| RF | Paso | Plataforma | Archivo | Qué debe verse | Estado |', '|---|---|---|---|---|---|');
for (const row of rows) {
  const { step, platform } = row;
  if (platform === '—') {
    lines.push(`| ${step.rf} | ${step.paso} | — | — | ${step.nombre} | ❌ ${row.note} |`);
    continue;
  }
  const state =
    row.present === row.files.length
      ? `✅ ${row.present}/${row.files.length} capturadas${row.reviewed ? ` · ${row.reviewed} revisadas` : ' · sin revisar'}`
      : row.present === 0
        ? '❌ falta'
        : `🟡 ${row.present}/${row.files.length} capturadas`;
  const file = `\`${step.rf}/${row.folder}/${step.rf}_p${step.paso}_${step.nombre}_*\``;
  lines.push(`| ${step.rf} | ${step.paso} | ${platform === 'web' ? 'Web' : 'Móvil'} | ${file} | ${step.debeVerse} | ${state} |`);
}

const observed = Object.entries(reviews);
if (observed.length > 0) {
  lines.push('', '## Revisiones', '', '| Captura | Observación |', '|---|---|');
  for (const [file, note] of observed) lines.push(`| \`${file}\` | ${note} |`);
}
lines.push('');
writeFileSync(join(base, 'INDICE.md'), lines.join('\n'));
console.log(`INDICE.md escrito: ${rows.length} filas.`);
