/// <reference types="node" />
/**
 * Contraste AA de los pares de tokens, en todas las marcas (C8.2 §5).
 *
 * Corre con `node --test --experimental-strip-types` (sin empaquetador), por eso
 * importa la paleta pura y el catálogo de marcas por ruta relativa.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { tenantCatalog } from '../../../../packages/design-tokens/src/tenants.ts';
import { contrastRatio, mobileBrand, neutral } from './palette.ts';

const surfaces = {
  background: neutral.background,
  surfaceSunken: neutral.surfaceSunken,
  surfaceLowest: neutral.surfaceLowest,
  surfaceLow: neutral.surfaceLow,
  surface: neutral.surface,
  surfaceHigh: neutral.surfaceHigh,
  surfaceHighest: neutral.surfaceHighest,
} as const;

const TEXT_AA = 4.5;
const NON_TEXT_AA = 3;

function eachSurface(fg: string, min: number, label: string) {
  for (const [name, bg] of Object.entries(surfaces)) {
    const ratio = contrastRatio(fg, bg);
    assert.ok(ratio >= min, `${label} sobre ${name}: ${ratio.toFixed(2)}:1 < ${min}:1`);
  }
}

test('el texto neutro cumple AA sobre todas las superficies', () => {
  eachSurface(neutral.text, TEXT_AA, 'text');
  eachSurface(neutral.textSecondary, TEXT_AA, 'textSecondary');
  eachSurface(neutral.textMuted, TEXT_AA, 'textMuted');
});

test('los estados (aviso, error, grupo) cumplen AA como texto', () => {
  eachSurface(neutral.danger, TEXT_AA, 'danger');
  eachSurface(neutral.warning, TEXT_AA, 'warning');
  eachSurface(neutral.group, TEXT_AA, 'group');
  assert.ok(contrastRatio(neutral.group, neutral.groupTint) >= TEXT_AA, 'group sobre groupTint');
});

test('el contorno de control llega a 3:1 (WCAG 1.4.11)', () => {
  eachSurface(neutral.borderControl, NON_TEXT_AA, 'borderControl');
});

test('la tinta sobre la placa de imagen cumple AA', () => {
  assert.ok(contrastRatio(neutral.plateInk, neutral.plate) >= TEXT_AA);
});

for (const tenant of Object.values(tenantCatalog)) {
  const brand = mobileBrand(tenant.id, tenant.colors);

  test(`${tenant.id}: el texto sobre el relleno de acento cumple AA`, () => {
    const ratio = contrastRatio(brand.accentContrast, brand.accent);
    assert.ok(ratio >= TEXT_AA, `accentContrast sobre accent: ${ratio.toFixed(2)}:1`);
  });

  test(`${tenant.id}: accentInk se lee como texto en todas las superficies`, () => {
    eachSurface(brand.accentInkOnDark, TEXT_AA, 'accentInk');
  });

  test(`${tenant.id}: el éxito se lee como texto en todas las superficies`, () => {
    eachSurface(brand.successOnDark, TEXT_AA, 'success');
  });

  // Los botones viven sobre el lienzo y las tarjetas, nunca sobre un chip
  // (`surfaceHighest`), así que ese par no se exige.
  test(`${tenant.id}: el relleno de acento se distingue del lienzo y las tarjetas (3:1)`, () => {
    for (const bg of [neutral.background, neutral.surfaceLow, neutral.surfaceHigh]) {
      const ratio = contrastRatio(brand.accent, bg);
      assert.ok(ratio >= NON_TEXT_AA, `accent sobre ${bg}: ${ratio.toFixed(2)}:1`);
    }
  });
}
