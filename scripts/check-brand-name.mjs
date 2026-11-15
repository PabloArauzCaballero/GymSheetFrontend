#!/usr/bin/env node
/**
 * Brand guard: the product is called REPP, and the old name must not come back
 * in anything a person can read.
 *
 * Fails when a scanned line contains the old name in a display form
 * (`GymSheet`, `Gymsheet`, `GYMSHEET`, `Gym Sheet`, `Gym-Sheet`, `gym sheet`).
 * Allowed on purpose, because they are internal identifiers whose rename would
 * break installs, sessions and stored data:
 * - the all-lowercase token `gymsheet` (`@gymsheet/*` scope, `gymsheet://`
 *   scheme, bundle ids, cookie and storage keys, tenant id);
 * - kebab-case file names such as `top-gym-sheet`;
 * - identifiers that embed it, such as `gymSheetTheme`, `useGymSheet` or the
 *   environment variable `GYMSHEET_API_URL`.
 *
 * Comments are skipped conservatively: only whole-line comments (`//`, `#` in
 * YAML) and block comments that open at the start of a line (`/*`, `{/*`). A
 * `//` in the middle of a line (JSX text, URLs, regexes) is scanned. Test files
 * are not scanned: they are not shipped copy.
 *
 * Usage: `node <repo>/scripts/check-brand-name.mjs <path>...` from a workspace,
 * with directories or files relative to the current directory.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const OLD_NAME = /gym[\s-]?sheet/giu;
const SKIP_DIRS = new Set(['node_modules', '.expo', '.next', 'dist', '.turbo']);
const SCRIPT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const YAML = new Set(['.yaml', '.yml']);
const MARKUP = new Set(['.json', '.html', '.css', '.svg', '.webmanifest']);
const isTest = (file) => /\.(test|spec)\.[cm]?[jt]sx?$/u.test(file);

/** Blanks whole-line and line-opening block comments; keeps line numbers. */
export function stripComments(source, kind = 'script') {
  let inBlock = false;
  return source
    .split('\n')
    .map((line) => {
      const trimmed = line.trimStart();
      if (kind === 'yaml') return trimmed.startsWith('#') ? '' : line;
      if (kind !== 'script') return line;
      if (inBlock || /^\{?\/\*/u.test(trimmed)) {
        const end = line.indexOf('*/');
        inBlock = end === -1;
        return inBlock ? '' : line.slice(end + 2);
      }
      return trimmed.startsWith('//') ? '' : line;
    })
    .join('\n');
}

function isInternal(text, hit) {
  const [match] = hit;
  const before = text[hit.index - 1] ?? '';
  const after = text[hit.index + match.length] ?? '';
  if (match === 'gymsheet' || match === 'gym-sheet') return true;
  // Part of an identifier (`gymSheetTheme`, `useGymSheet`, `GYMSHEET_API_URL`).
  return !/[\s-]/u.test(match) && /[\w$]/u.test(before + after);
}

/** Display forms of the old name in one source file: `[{ line, text }]`. */
export function findBrandLeaks(source, kind = 'script') {
  return stripComments(source, kind)
    .split('\n')
    .flatMap((text, index) =>
      [...text.matchAll(OLD_NAME)].some((hit) => !isInternal(text, hit))
        ? [{ line: index + 1, text: text.trim() }]
        : [],
    );
}

function kindOf(file) {
  const ext = extname(file);
  if (SCRIPT.has(ext)) return 'script';
  if (YAML.has(ext)) return 'yaml';
  return MARKUP.has(ext) ? 'markup' : null;
}

function collect(path, files = []) {
  if (statSync(path).isDirectory()) {
    for (const entry of readdirSync(path)) {
      if (!SKIP_DIRS.has(entry)) collect(join(path, entry), files);
    }
  } else if (kindOf(path) && !isTest(path)) {
    files.push(path);
  }
  return files;
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
  const targets = process.argv.slice(2);
  if (targets.length === 0) {
    console.error('check-brand-name: pass at least one path to scan');
    process.exit(2);
  }
  const violations = targets.flatMap((target) =>
    collect(target).flatMap((file) =>
      findBrandLeaks(readFileSync(file, 'utf8'), kindOf(file)).map(
        ({ line, text }) => `${relative(process.cwd(), file)}:${line}  ${text}`,
      ),
    ),
  );
  if (violations.length > 0) {
    console.error(`check-brand-name: ${violations.length} user-visible use(s) of the old name; use REPP\n`);
    console.error(violations.join('\n'));
    process.exit(1);
  }
  console.log(`check-brand-name: OK (no old product name in ${targets.join(', ')})`);
}
