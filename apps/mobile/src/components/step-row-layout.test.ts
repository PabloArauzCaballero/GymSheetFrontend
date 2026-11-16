import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stepAnnouncement, stepRowLayout } from './step-row-layout.ts';

const base = { count: 4, fontScale: 1, gap: 4, rowWidth: 288 };

test('columns while the widest label fits its column', () => {
  assert.equal(stepRowLayout({ ...base, labelWidths: [30, 50, 66, 52] }), 'columns');
});

test('compact when one label is wider than its column («Nacimiento» at 320)', () => {
  assert.equal(stepRowLayout({ ...base, rowWidth: 228, labelWidths: [30, 50, 66, 52] }), 'compact');
});

test('compact at Dynamic Type past ×1.3, whatever the widths', () => {
  assert.equal(stepRowLayout({ ...base, fontScale: 2, labelWidths: [1, 1, 1, 1] }), 'compact');
});

test('columns until the row and every label have been measured', () => {
  assert.equal(stepRowLayout({ ...base, rowWidth: 0, labelWidths: [] }), 'columns');
  assert.equal(stepRowLayout({ ...base, labelWidths: [30, 999] }), 'columns');
});

test('one announcement «Paso N de M: label» (base 0 in, base 1 out)', () => {
  assert.equal(stepAnnouncement(1, ['Cardio', 'Días', 'Tiempo', 'Esfuerzo', 'Subida', 'Listo']), 'Paso 2 de 6: Días');
});

test('the announcement clamps an out-of-range step and survives an empty flow', () => {
  assert.equal(stepAnnouncement(9, ['Tu correo', 'Código']), 'Paso 2 de 2: Código');
  assert.equal(stepAnnouncement(-1, ['Tu correo', 'Código']), 'Paso 1 de 2: Tu correo');
  assert.equal(stepAnnouncement(0, []), 'Paso 1 de 0');
});
