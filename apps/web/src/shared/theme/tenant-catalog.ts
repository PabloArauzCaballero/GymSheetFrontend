import { resolveTenant, type TenantDefinition } from '@gymsheet/design-tokens';
import type { TenantBrand } from './brand-contract';
import type { ModePalette, TenantTheme } from './color-contract';
import { defaultTheme } from './default-palette';

/**
 * Convierte una identidad del catálogo compartido en un tema completo de la web.
 *
 * El catálogo solo declara lo que distingue a un gimnasio —nombre y colores de
 * marca—; el resto de la paleta (rampa de superficies, sombras, tonos de aviso
 * y error) se hereda de la identidad de referencia. Así una marca nueva cambia
 * de color sin rehacer el sistema visual, que es lo que mantiene coherente el
 * producto entre clientes.
 */

/** Los avisos ambientales siguen al acento; si no, el fondo delataría la marca anterior. */
function ambientFor(accent: string, base: ModePalette): Pick<ModePalette, 'pageGlow' | 'aurora1' | 'auroraSpot'> {
  return {
    pageGlow: withAlpha(accent, alphaOf(base.pageGlow)),
    aurora1: withAlpha(accent, alphaOf(base.aurora1)),
    auroraSpot: withAlpha(accent, alphaOf(base.auroraSpot)),
  };
}

/** Extrae el alfa de un `rgb(r g b / a)`; sin alfa declarado asume opaco. */
function alphaOf(value: string): number {
  const match = /\/\s*([0-9.]+)\s*\)/u.exec(value);
  return match?.[1] ? Number(match[1]) : 1;
}

function withAlpha(hex: string, alpha: number): string {
  const parts = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/iu.exec(hex);
  if (!parts) return hex;
  const channels = parts.slice(1, 4).map((part) => Number.parseInt(part, 16));
  return `rgb(${channels.join(' ')} / ${alpha})`;
}

function brandOf(definition: TenantDefinition): TenantBrand {
  return {
    ...defaultTheme.brand,
    name: definition.name,
    wordmark: definition.wordmark,
    monogram: definition.monogram,
  };
}

function darkOf(definition: TenantDefinition): ModePalette {
  const { colors } = definition;
  return {
    ...defaultTheme.dark,
    accent: colors.accent,
    accentDim: colors.accentDim,
    accentInk: colors.accentInkOnDark,
    accentContrast: colors.accentContrast,
    success: colors.successOnDark,
    successText: colors.successOnDark,
    ...ambientFor(colors.accent, defaultTheme.dark),
  };
}

function lightOf(definition: TenantDefinition): ModePalette {
  const { colors } = definition;
  return {
    ...defaultTheme.light,
    accent: colors.accent,
    accentDim: colors.accentDim,
    accentInk: colors.accentInkOnLight,
    accentContrast: colors.accentContrast,
    success: colors.successOnLight,
    successText: colors.successOnLight,
    ...ambientFor(colors.accent, defaultTheme.light),
  };
}

/** Tema completo para una identidad del catálogo compartido. */
export function themeFromCatalog(definition: TenantDefinition): TenantTheme {
  if (definition.id === defaultTheme.id) return defaultTheme;
  return {
    id: definition.id,
    brand: brandOf(definition),
    dark: darkOf(definition),
    light: lightOf(definition),
  };
}

/** Tema para un id del catálogo; sin coincidencia, el de referencia. */
export function themeForTenantId(id: string | null | undefined): TenantTheme {
  return themeFromCatalog(resolveTenant(id));
}
