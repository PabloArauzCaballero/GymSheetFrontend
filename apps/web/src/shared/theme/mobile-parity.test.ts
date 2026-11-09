import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  REPP_JADE,
  REPP_MARK_BODY,
  REPP_MARK_TICK,
  REPP_MARK_VIEWBOX,
  REPP_NAVY,
  gymsheetTenant,
} from '@gymsheet/design-tokens';
import { describe, expect, it } from 'vitest';
// Solo en la prueba: la web lee el tema del móvil para comprobar que pinta lo
// mismo. En tiempo de ejecución la web nunca importa de `apps/mobile`.
import {
  REPP_MARK_BODY as MOBILE_MARK_BODY,
  REPP_MARK_TICK as MOBILE_MARK_TICK,
  REPP_MARK_VIEWBOX as MOBILE_MARK_VIEWBOX,
} from '../../../../mobile/src/components/brand/mark';
import { brandNavy, neutral, reppJade } from '../../../../mobile/src/theme/palette';
import { radii as mobileRadii } from '../../../../mobile/src/theme/radius';
import { shadows as mobileShadows } from '../../../../mobile/src/theme/shadow';
import { defaultBrand } from './brand-contract';
import { defaultTheme } from './default-palette';

/**
 * La web tiene que verse como la app móvil (rediseño 2026-11-08). Esta prueba
 * es la garantía: compara la paleta, la elevación, los radios y el isotipo de
 * la web con los archivos del tema del móvil. Si alguien cambia uno sin el
 * otro, falla aquí y no en una revisión visual semanas después.
 */
const numbers = (value: string) => value.match(/-?\d*\.?\d+/gu)?.map(Number) ?? [];

describe('paridad visual web ↔ móvil', () => {
  const dark = defaultTheme.dark;

  it('pinta la misma rampa navy de superficies, bordes y texto', () => {
    expect({
      background: dark.background,
      surfaceLowest: dark.surfaceLowest,
      surfaceLow: dark.surfaceLow,
      surface: dark.surface,
      surfaceHigh: dark.surfaceHigh,
      surfaceHighest: dark.surfaceHighest,
      surfaceSidebar: dark.surfaceSidebar,
      borderSubtle: dark.borderSubtle,
      border: dark.border,
      text: dark.text,
      textMuted: dark.textMuted,
      textDisabled: dark.textDisabled,
      danger: dark.danger,
      warning: dark.warning,
    }).toEqual({
      background: neutral.background,
      surfaceLowest: neutral.surfaceLowest,
      surfaceLow: neutral.surfaceLow,
      surface: neutral.surface,
      surfaceHigh: neutral.surfaceHigh,
      surfaceHighest: neutral.surfaceHighest,
      surfaceSidebar: neutral.surfaceSidebar,
      borderSubtle: neutral.borderSubtle,
      border: neutral.border,
      text: neutral.text,
      textMuted: neutral.textMuted,
      textDisabled: neutral.textDisabled,
      danger: neutral.danger,
      warning: neutral.warning,
    });
  });

  it('usa el jade de REPP como acento, igual que el móvil', () => {
    const brand = gymsheetTenant.colors;
    expect(dark.accent).toBe(brand.accent);
    expect(dark.accentInk).toBe(brand.accentInkOnDark);
    expect(dark.accentContrast).toBe(brand.accentContrast);
    expect(dark.success).toBe(brand.successOnDark);
    expect(defaultTheme.light.accentInk).toBe(brand.accentInkOnLight);
  });

  it('separa las tarjetas con la misma elevación (e1, e2, card)', () => {
    expect(numbers(dark.shadowSm)).toEqual(numbers(mobileShadows.e1));
    expect(numbers(dark.shadowMd)).toEqual(numbers(mobileShadows.e2));
    expect(numbers(dark.shadowLg)).toEqual(numbers(mobileShadows.card));
  });

  it('redondea con los radios del móvil', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');
    const radius = (name: string) => Number(new RegExp(`--radius-${name}:\\s*(\\d+)px`, 'u').exec(css)?.[1]);
    expect(radius('xs')).toBe(mobileRadii.xs);
    expect(radius('sm')).toBe(mobileRadii.sm);
    expect(radius('md')).toBe(mobileRadii.md);
    expect(radius('lg')).toBe(mobileRadii.lg);
    expect(radius('xl')).toBe(mobileRadii.xl);
    expect(radius('2xl')).toBe(mobileRadii.xxl);
  });

  it('dibuja el mismo isotipo REPP sobre la misma ficha', () => {
    expect(REPP_MARK_BODY).toBe(MOBILE_MARK_BODY);
    expect(REPP_MARK_TICK).toBe(MOBILE_MARK_TICK);
    expect(REPP_MARK_VIEWBOX).toBe(MOBILE_MARK_VIEWBOX);
    expect(REPP_NAVY).toBe(brandNavy);
    expect(REPP_JADE).toBe(reppJade);
  });

  it('se presenta como REPP, con la display del móvil en los títulos', () => {
    expect(defaultBrand.name).toBe(gymsheetTenant.name);
    expect(defaultBrand.wordmark).toBe(gymsheetTenant.wordmark);
    const fonts = readFileSync(resolve(process.cwd(), 'src/shared/theme/brand-fonts.ts'), 'utf8');
    expect(fonts).toContain('bricolage-grotesque-700');
  });
});
