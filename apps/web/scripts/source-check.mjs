import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const sourceRoot = path.join(root, 'src');
const allowedFetchFiles = new Set([
  'src/features/auth/services/auth-client.ts',
  'src/shared/api/api-client.ts',
  'src/shared/server/backend.ts',
  'src/shared/server/media-proxy.ts',
]);
const sourceExtensions = new Set(['.ts', '.tsx', '.css']);

/**
 * Los colores son configurables por inquilino: viven en las paletas de
 * `src/shared/theme/` y llegan al documento como variables CSS. Un literal
 * fuera de ahí vuelve a clavar la identidad de una marca en el código y escapa
 * a la configuración, así que se trata como error.
 *
 * Se detectan hex (`#c3f400`) y funciones de color con canales numéricos
 * (`rgb(195 244 0 / .5)`); `rgb(var(--x) / .5)` no cumple el patrón y queda
 * permitido, que es justo la forma correcta de componer una opacidad.
 */
const themeSourceDirectory = 'src/shared/theme/';
const literalColorPattern =
  /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(\s*[0-9.]/u;
const findings = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else files.push(absolute);
  }
  return files;
}

for (const absolute of await walk(sourceRoot)) {
  const relative = path.relative(root, absolute).replaceAll(path.sep, '/');
  if (!sourceExtensions.has(path.extname(absolute))) continue;
  const content = await readFile(absolute, 'utf8');
  const lineCount = content.split(/\r?\n/u).length;
  if (lineCount >= 300) findings.push(`${relative}: ${lineCount} lines (limit is <300)`);
  if (/\bfetch\s*\(/u.test(content) && !allowedFetchFiles.has(relative)) {
    findings.push(`${relative}: direct fetch outside the authorized network layer`);
  }
  if (/\b(localStorage|sessionStorage)\b/u.test(content)) {
    findings.push(`${relative}: browser storage is prohibited for session data`);
  }
  if (/(@ts-ignore|@ts-nocheck|\bas any\b)/u.test(content)) {
    findings.push(`${relative}: unsafe TypeScript suppression or cast`);
  }
  if (!relative.startsWith(themeSourceDirectory) && !relative.endsWith('.test.ts')) {
    for (const [index, line] of content.split(/\r?\n/u).entries()) {
      // En una máscara el color no es identidad sino opacidad: `#000` significa
      // "conserva este píxel". Tematizarlo rompería el efecto.
      if (/mask-image\s*:/u.test(line)) continue;
      if (literalColorPattern.test(line)) {
        findings.push(
          `${relative}:${index + 1}: literal color outside ${themeSourceDirectory} — use a theme variable`,
        );
      }
    }
  }
}

if (findings.length > 0) {
  console.error(findings.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Source check passed.');
}
