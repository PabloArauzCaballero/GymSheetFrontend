#!/usr/bin/env node
/**
 * Guarda del sistema de diseño (C8.2 §5).
 *
 * Falla si en `app/` o `src/` (fuera de `src/theme/`) aparece:
 * - un color hexadecimal literal (`'#1a1a1a'`),
 * - un `rgb(`/`rgba(` literal,
 * - un `fontSize` con número literal (`fontSize: 11`),
 * - una transparencia pegada a un color por concatenación (`${colors.volt}66`).
 *
 * Los comentarios no cuentan (se eliminan antes de buscar). Si falta un color,
 * falta un token: se añade en `src/theme/` con su contraste comentado.
 *
 * Uso: `node scripts/check-theme.mjs` desde `apps/mobile` (o con la ruta).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCAN = ['app', 'src'];
const SKIP_DIRS = new Set(['node_modules', '.expo']);
const isThemeFile = (rel) => rel.startsWith(`src${'/'}theme/`);
const isTest = (rel) => /\.test\.tsx?$/.test(rel);

const RULES = [
  { id: 'hex', message: 'color hexadecimal literal: usa un token de @/theme', re: /['"`]#[0-9a-fA-F]{3,8}\b/g },
  { id: 'rgba', message: 'rgb()/rgba() literal: usa un token de @/theme (o alpha())', re: /\brgba?\(/g },
  { id: 'font-size', message: 'fontSize literal: usa fontSizes.* o <Text variant>', re: /\bfontSize\s*:\s*-?\d/g },
  {
    id: 'alpha-concat',
    message: 'transparencia concatenada a un color: usa alpha(color, n)',
    re: /\$\{[^}]+\}[0-9a-fA-F]{2}(?![0-9a-zA-Z_])/g,
  },
];

/** Sustituye comentarios por espacios (conserva saltos de línea) respetando cadenas. */
function stripComments(source) {
  let out = '';
  let i = 0;
  let quote = null;
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (quote) {
      out += ch;
      if (ch === '\\') {
        out += next ?? '';
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i += 1;
      continue;
    }
    if (ch === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') i += 1;
      continue;
    }
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
        out += source[i] === '\n' ? '\n' : ' ';
        i += 1;
      }
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') quote = ch;
    out += ch;
    i += 1;
  }
  return out;
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (/\.(ts|tsx)$/.test(entry)) files.push(full);
  }
  return files;
}

const violations = [];
for (const base of SCAN) {
  for (const file of walk(join(root, base))) {
    const rel = relative(root, file).split('\\').join('/');
    if (isThemeFile(rel) || isTest(rel)) continue;
    const lines = stripComments(readFileSync(file, 'utf8')).split('\n');
    lines.forEach((line, index) => {
      for (const rule of RULES) {
        rule.re.lastIndex = 0;
        if (rule.re.test(line)) {
          violations.push(`${rel}:${index + 1}  [${rule.id}] ${rule.message}\n    ${line.trim()}`);
        }
      }
    });
  }
}

if (violations.length > 0) {
  console.error(`check-theme: ${violations.length} infracciones del tema\n`);
  console.error(violations.join('\n'));
  process.exit(1);
}
console.log('check-theme: OK (0 colores, rgba, fontSize literales ni alfas concatenadas fuera de src/theme)');
