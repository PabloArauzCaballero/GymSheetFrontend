// Construye un índice HTML navegable con las capturas de `e2e-evidence/`.
// Uso: node scripts/build-e2e-evidence-index.mjs [directorio]
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const directory = process.argv[2] ?? 'e2e-evidence';
const shots = readdirSync(directory)
  .filter((file) => file.endsWith('.png'))
  .sort();

const title = (file) =>
  file
    .replace(/^\d+-/u, '')
    .replace(/\.png$/u, '')
    .replace(/-/gu, ' ')
    .replace(/^./u, (character) => character.toUpperCase());

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Evidencia E2E · Consola de administración</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; padding: 2rem; font: 16px/1.6 system-ui, sans-serif; background: #0b0b0c; color: #f2f2f3; }
  h1 { font-size: 1.6rem; margin: 0 0 .25rem; }
  p.lead { color: #a0a0a6; margin: 0 0 2rem; }
  ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 2rem; }
  figure { margin: 0; border: 1px solid #2a2a2e; border-radius: 8px; overflow: hidden; background: #131315; }
  figcaption { padding: .75rem 1rem; font-weight: 600; border-bottom: 1px solid #2a2a2e; }
  img { display: block; width: 100%; height: auto; }
</style>
</head>
<body>
<h1>Evidencia E2E · Consola de administración</h1>
<p class="lead">${shots.length} capturas contra el stack real (Next.js + NestJS + PostgreSQL), Chromium.</p>
<ol>
${shots
  .map(
    (file) => `  <li><figure>
    <figcaption>${title(file)}</figcaption>
    <img alt="${title(file)}" loading="lazy" src="./${file}">
  </figure></li>`,
  )
  .join('\n')}
</ol>
</body>
</html>
`;

writeFileSync(join(directory, 'index.html'), html);
process.stdout.write(`${join(directory, 'index.html')}: ${shots.length} capturas\n`);
