import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findBrandLeaks, stripComments } from './check-brand-name.mjs';

const lines = (source, kind) => findBrandLeaks(source, kind).map((leak) => leak.line);

test('flags every display form of the old name', () => {
  const source = [
    "const a = 'Bienvenido a GymSheet';",
    'const b = "GYMSHEET";',
    'const c = `Gym Sheet`;',
    "const d = 'Gym-Sheet';",
    'export const T = () => <Text>Hola gym sheet</Text>;',
    "const e = 'Gymsheet';",
  ].join('\n');
  assert.deepEqual(lines(source), [1, 2, 3, 4, 5, 6]);
});

test('allows internal identifiers', () => {
  const source = [
    "import x from '@gymsheet/domain';",
    "const k = 'gymsheet.accessToken';",
    "const u = 'gymsheet:///routines';",
    'const env = process.env.GYMSHEET_API_URL;',
    "import { TopGymModal } from '@/components/top-gym-sheet';",
    'const gymSheetTheme = useGymSheetTheme();',
  ].join('\n');
  assert.deepEqual(lines(source), []);
});

test('skips whole-line and line-opening block comments, keeping line numbers', () => {
  const source = [
    '// GymSheet in a line comment',
    '/**',
    ' * GymSheet in a doc comment',
    ' */',
    '{/* GymSheet in JSX */}',
    "const leak = 'GymSheet';",
  ].join('\n');
  assert.equal(stripComments(source).split('\n').length, 6);
  assert.deepEqual(lines(source), [6]);
});

test('scans a mid-line // (JSX text, URLs, regexes) instead of treating it as a comment', () => {
  const source = [
    '<Text>Visita https://repp.app // GymSheet</Text>',
    "const re = /^x:\\/\\//u; const s = 'GymSheet';",
    "const url = 'https://GymSheet.app';",
  ].join('\n');
  assert.deepEqual(lines(source), [1, 2, 3]);
});

test('scans YAML, markup and CSS copy, skipping YAML comment lines', () => {
  assert.deepEqual(lines("# GymSheet comment\n- assertVisible: 'GYMSHEET'\n", 'yaml'), [2]);
  assert.deepEqual(lines('<title>GymSheet</title>', 'markup'), [1]);
  assert.deepEqual(lines('.x::after { content: "Gym Sheet"; }', 'markup'), [1]);
  assert.deepEqual(lines('{"name":"GymSheet","slug":"gymsheet"}', 'markup'), [1]);
});
