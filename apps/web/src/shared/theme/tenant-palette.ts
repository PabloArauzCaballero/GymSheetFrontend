import { z } from 'zod';
import { brandFontKeys, brandIconKeys, type TenantBrand } from './brand-contract';
import type { ModePalette, TenantTheme } from './color-contract';
import { defaultTheme } from './default-palette';

/**
 * Resolución de la identidad visual del inquilino que atiende la petición.
 *
 * Las identidades llegan por configuración (`TENANT_THEMES`), no por código:
 * añadir un gimnasio con su marca no debe requerir un despliegue. Cada entrada
 * es parcial y se apoya en la paleta por defecto, así que un inquilino puede
 * cambiar sólo su acento y heredar el resto del sistema —que es lo habitual, y
 * lo que mantiene la coherencia estética entre marcas.
 */

const modeOverrideSchema = z
  .object({
    background: z.string(),
    surfaceLowest: z.string(),
    surfaceLow: z.string(),
    surface: z.string(),
    surfaceHigh: z.string(),
    surfaceHighest: z.string(),
    surfaceSidebar: z.string(),
    borderSubtle: z.string(),
    border: z.string(),
    text: z.string(),
    textMuted: z.string(),
    textDisabled: z.string(),
    accent: z.string(),
    accentDim: z.string(),
    accentInk: z.string(),
    accentContrast: z.string(),
    danger: z.string(),
    warning: z.string(),
    success: z.string(),
    successBg: z.string(),
    successBorder: z.string(),
    successText: z.string(),
    warningBg: z.string(),
    warningBorder: z.string(),
    warningText: z.string(),
    dangerBg: z.string(),
    dangerBorder: z.string(),
    dangerText: z.string(),
    dangerSurface: z.string(),
    infoBg: z.string(),
    infoBorder: z.string(),
    infoText: z.string(),
    headerBg: z.string(),
    overlay: z.string(),
    focusRing: z.string(),
    gridLine: z.string(),
    pageGlow: z.string(),
    sheen: z.string(),
    sheenBase: z.string(),
    scrim: z.string(),
    aurora1: z.string(),
    aurora2: z.string(),
    aurora3: z.string(),
    auroraSpot: z.string(),
    shadowSm: z.string(),
    shadowMd: z.string(),
    shadowLg: z.string(),
    shadowDialog: z.string(),
    noiseOpacity: z.number(),
    ambientStrength: z.number(),
  })
  .partial()
  .strict();

const brandOverrideSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    wordmark: z.string().trim().min(1).max(40),
    monogram: z.string().trim().min(1).max(3),
    icon: z.enum(brandIconKeys),
    font: z.enum(brandFontKeys),
  })
  .partial()
  .strict();

const tenantOverrideSchema = z
  .object({
    id: z.string().trim().min(1).max(60),
    // `name` sigue aceptándose en la raíz por comodidad: es el dato mínimo de
    // una marca y obligar a anidarlo para un caso tan común sobra.
    name: z.string().trim().min(1).max(120).optional(),
    brand: brandOverrideSchema.optional(),
    dark: modeOverrideSchema.optional(),
    light: modeOverrideSchema.optional(),
  })
  .strict();

/** Mapa de host (sin puerto, en minúsculas) a identidad. */
const registrySchema = z.record(z.string(), tenantOverrideSchema);

export type TenantOverride = z.infer<typeof tenantOverrideSchema>;

function mergeMode(base: ModePalette, override?: Partial<ModePalette>): ModePalette {
  return override ? { ...base, ...override } : base;
}

/**
 * Sin rótulo propio se usa el nombre en versales, que es lo que hace la marca
 * de referencia y evita pedir dos veces el mismo dato.
 */
function mergeBrand(override: TenantOverride): TenantBrand {
  const name = override.brand?.name ?? override.name;
  return {
    ...defaultTheme.brand,
    ...(name ? { name, wordmark: name.toUpperCase() } : {}),
    ...override.brand,
  };
}

/** Combina una identidad parcial sobre la de referencia. */
export function mergeTheme(override: TenantOverride): TenantTheme {
  return {
    id: override.id,
    brand: mergeBrand(override),
    dark: mergeMode(defaultTheme.dark, override.dark),
    light: mergeMode(defaultTheme.light, override.light),
  };
}

/**
 * Lee el registro de configuración. Un JSON malformado detiene el arranque en
 * lugar de degradar en silencio: servir la marca equivocada a un inquilino es
 * peor que fallar de forma visible.
 */
export function parseRegistry(raw: string | undefined): Record<string, TenantTheme> {
  if (!raw?.trim()) return {};
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error('TENANT_THEMES no es JSON válido.');
  }
  const parsed = registrySchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(`TENANT_THEMES no cumple el contrato de tema: ${parsed.error.message}`);
  }
  return Object.fromEntries(
    Object.entries(parsed.data).map(([host, override]) => [
      host.toLowerCase(),
      mergeTheme(override),
    ]),
  );
}

/** Descarta el puerto y normaliza, para que `gym.local:3002` case con `gym.local`. */
export function normalizeHost(host: string | null | undefined): string {
  return (host ?? '').trim().toLowerCase().split(':')[0] ?? '';
}

/**
 * Identidad para un host. Sin coincidencia se sirve la de referencia, que es el
 * comportamiento correcto para el despliegue de un solo gimnasio.
 */
export function resolveTheme(
  host: string | null | undefined,
  registry: Record<string, TenantTheme>,
): TenantTheme {
  return registry[normalizeHost(host)] ?? defaultTheme;
}
