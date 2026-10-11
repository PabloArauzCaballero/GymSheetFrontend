import { colors as sharedColors, tones as sharedTones } from '@gymsheet/design-tokens';
import { getActiveTenant, onTenantChange } from './tenant';
import { alpha, mobileBrand, neutral } from './palette';

/**
 * Colores de la app móvil.
 *
 * La rampa neutra («Estudio», grafito cálido) sale de `palette.ts`; los cuatro
 * colores de marca se escriben sobre el objeto al cambiar de gimnasio
 * (`applyBrandColors`). Roles nuevos del rediseño (C8.2): `surfaceRaised`,
 * `surfaceSunken`, `borderControl`, `group`, `groupTint`, `plate`, `plateInk`,
 * `textSecondary`; `textMuted` cumple AA sobre todas las superficies.
 */
const staticColors = {
  ...sharedColors,
  background: neutral.background,
  surfaceSunken: neutral.surfaceSunken,
  surfaceLowest: neutral.surfaceLowest,
  surfaceLow: neutral.surfaceLow,
  surface: neutral.surface,
  surfaceHigh: neutral.surfaceHigh,
  /** Tarjeta elevada (e2): es `surfaceHigh` con nombre de rol. */
  surfaceRaised: neutral.surfaceHigh,
  surfaceHighest: neutral.surfaceHighest,
  surfaceSidebar: neutral.surfaceSidebar,
  borderSubtle: neutral.borderSubtle,
  border: neutral.border,
  borderControl: neutral.borderControl,
  text: neutral.text,
  textSecondary: neutral.textSecondary,
  textMuted: neutral.textMuted,
  textDisabled: neutral.textDisabled,
  plate: neutral.plate,
  plateInk: neutral.plateInk,
  group: neutral.group,
  groupTint: neutral.groupTint,
  danger: neutral.danger,
  warning: neutral.warning,
} as const;

/**
 * Los cuatro colores que cambian con el gimnasio se **escriben** sobre el
 * objeto cada vez que cambia la marca, en vez de leerse con getters: un literal
 * que mezcla un *spread* con getters se compila a un helper que los evalúa una
 * sola vez al cargar el módulo, y el acento quedaba congelado en la marca de
 * referencia. Escribir es seguro porque los estilos se calculan en cada render
 * y la raíz remonta el árbol al cambiar de marca.
 */
export const colors: {
  -readonly [K in keyof typeof staticColors]: K extends
    | 'volt'
    | 'voltDim'
    | 'accentInk'
    | 'success'
    ? string
    : (typeof staticColors)[K];
} = { ...staticColors };

/** Marca activa con los ajustes AA del móvil (`palette.brandOverrides`). */
export function activeBrand() {
  const tenant = getActiveTenant();
  return mobileBrand(tenant.id, tenant.colors);
}

export function applyBrandColors(): void {
  const brand = activeBrand();
  colors.volt = brand.accent;
  colors.voltDim = brand.accentDim;
  colors.accentInk = brand.accentInkOnDark;
  colors.success = brand.successOnDark;
}

applyBrandColors();
onTenantChange(applyBrandColors);

/** Texto e iconos que van encima del relleno de acento. */
export function accentContrast(): string {
  return activeBrand().accentContrast;
}

/** Degradado del relleno primario, según la marca activa. */
export function accentGradient(): readonly [string, string] {
  return activeBrand().accentGradient;
}

/**
 * Chip neutro: un dato (objetivo, rol, «3 días»), no un estado. Antes el
 * `Badge` caía por defecto en `info` (azul) y pintaba hechos como avisos.
 * `textSecondary` sobre `surfaceHighest`: 7,25:1.
 */
const neutralBadgeTone = {
  text: neutral.textSecondary,
  bg: neutral.surfaceHighest,
  border: neutral.surfaceHighest,
} as const;

/**
 * Tonos semánticos con la confirmación tomada de la marca. Solo se reemplaza el
 * verde de éxito: aviso, error e información son señales que el usuario debe
 * reconocer igual en cualquier gimnasio. Se deriva el chip entero (fondo y
 * borde), no solo el texto, para que una marca roja no herede el oliva del lima.
 */
export const tones = {
  get dark() {
    const text = activeBrand().successOnDark;
    const success = { text, bg: alpha(text, 0.12), border: alpha(text, 0.35) };
    return { ...sharedTones.dark, success, neutral: neutralBadgeTone };
  },
  get light() {
    const text = activeBrand().successOnLight;
    const success = { text, bg: alpha(text, 0.1), border: alpha(text, 0.3) };
    return { ...sharedTones.light, success, neutral: neutralBadgeTone };
  },
};

/**
 * Política de acento: `colors.volt` es **relleno** (la acción principal y el
 * dato clave, uno de cada por pantalla). Texto e iconos finos en acento sobre
 * superficie → `accentPolicy.ink` (con TOP Fitness el rojo como texto daba
 * 4,22:1; `accentInk` da 5,2:1 sobre la superficie más clara). Glifos
 * decorativos → `glyph`; enlaces secundarios → `quietLink`.
 */
export const accentPolicy = {
  get glyph(): string {
    return getActiveTenant().id === 'gymsheet' ? '#cfd8c4' : neutral.textSecondary;
  },
  get ink(): string {
    return colors.accentInk;
  },
  get quietLink(): string {
    return getActiveTenant().id === 'gymsheet' ? '#a9b69a' : neutral.textSecondary;
  },
};
