/**
 * Paleta del móvil: dirección «Estudio» (C8.1).
 *
 * Archivo **puro**: sin React Native ni paquetes del monorepo, para que la
 * prueba de contraste (`contrast.test.ts`) y `scripts/check-theme.mjs` lo
 * importen con `node --test` sin empaquetador. Es el único sitio de la app,
 * junto con `packages/design-tokens`, donde se escriben colores literales.
 *
 * Los ratios comentados son WCAG 2.x y los recalcula la prueba; si cambias un
 * valor, la prueba dice si sigue pasando.
 */
import type { TenantBrandColors } from '../../../../packages/design-tokens/src/tenants.ts';

/** Neutros absolutos. Solo para componer tokens; las pantallas no los usan. */
export const ink = {
  white: '#ffffff',
  black: '#000000',
} as const;

/**
 * Rampa neutra en grafito cálido. Las tarjetas se separan por el tono de la
 * superficie y la sombra, no por bordes de 1,19:1.
 */
export const neutral = {
  /** Lienzo de la pantalla. */
  background: '#0c0c0b',
  /** Pozos dentro de una tarjeta (campos, pistas de progreso). */
  surfaceSunken: '#0f0f0d',
  surfaceLowest: '#11110f',
  /** Tarjeta base (e1). */
  surfaceLow: '#161614',
  surface: '#1b1a18',
  /** Tarjeta elevada (e2), hojas. */
  surfaceHigh: '#201f1c',
  /** Controles, píldoras, chips. */
  surfaceHighest: '#2b2a26',
  surfaceSidebar: '#0a0a09',
  /** Divisores decorativos. No sirven como único contorno de un control. */
  borderSubtle: '#24231f',
  border: '#2f2e29',
  /** Contorno de control: ≥ 3:1 contra todas las superficies (1.4.11). 3,31 sobre surfaceHighest. */
  borderControl: '#7d796f',
  /** Texto principal: 12,6:1 sobre surfaceHighest. */
  text: '#f2f0ea',
  /** Texto secundario: 7,25:1 sobre surfaceHighest. */
  textSecondary: '#bcb8ad',
  /** Metadatos: 4,86:1 sobre surfaceHighest, 6,63:1 sobre el lienzo. */
  textMuted: '#9a968b',
  /** Solo controles deshabilitados de verdad; nunca información. */
  textDisabled: '#5c594f',
  /** Placa «papel» para las ilustraciones del dataset (que vienen sobre blanco). */
  plate: '#ecebe4',
  /** Tinta sobre la placa: 14,59:1. */
  plateInk: '#1a1a17',
  /** Agrupación (superseries, circuitos): 8,11:1 sobre surfaceHighest. */
  group: '#5ed6c0',
  /** Tinte de fondo de la etiqueta de grupo: `group` encima da 8,98:1. */
  groupTint: '#0f2622',
  danger: '#ff8577',
  warning: '#f2b85b',
} as const;

/**
 * Ajustes por marca que el móvil necesita para cumplir AA y que el paquete
 * compartido no trae (la web tiene su propia rampa).
 *
 * - TOP Fitness: blanco sobre su rojo `#ed1b34` da 4,37:1 en el botón
 *   principal (16–17 pt, no es texto grande). Se oscurece el relleno lo mínimo
 *   para llegar a 4,86:1 sin salir del tono.
 */
export const brandOverrides: Record<string, Partial<TenantBrandColors>> = {
  topfitness: { accent: '#e0162d' },
};

/** `#rrggbb` + opacidad → `rgba(...)`. Sustituye a las concatenaciones `${hex}66`. */
export function alpha(hex: string, opacity: number): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean.slice(0, 6);
  const value = Number.parseInt(full, 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${opacity})`;
}

/** Velos y realces sobre contenido o imágenes. */
export const overlay = {
  /** Velo de hojas y modales. */
  scrim: alpha(ink.black, 0.72),
  scrimSoft: alpha(ink.black, 0.6),
  scrimStrong: alpha(ink.black, 0.88),
  scrimSolid: alpha(ink.black, 0.92),
  /** Velo leve sobre una foto (botón sobre imagen). */
  scrimFaint: alpha(ink.black, 0.35),
  /** Realce claro sobre fondos oscuros (contornos de vidrio, pistas). */
  glass: alpha(ink.white, 0.14),
  glassStrong: alpha(ink.white, 0.28),
  /** Transparente con tono (extremo de degradados). */
  clearDark: alpha(ink.black, 0),
  clearLight: alpha(ink.white, 0),
} as const;

/** Texto e iconos encima de una foto o un velo oscuro. */
export const onMedia = {
  text: ink.white,
  textSoft: alpha(ink.white, 0.86),
  textMuted: alpha(ink.white, 0.75),
} as const;

function luminance(hex: string): number {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean.slice(0, 6);
  const value = Number.parseInt(full, 16);
  const [r, g, b] = [16, 8, 0].map((shift) => {
    const channel = ((value >> shift) & 255) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/** Ratio de contraste WCAG 2.x entre dos `#rrggbb`. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Colores de marca efectivos en el móvil (paquete compartido + ajustes AA). */
export function mobileBrand(id: string, base: TenantBrandColors): TenantBrandColors {
  return { ...base, ...brandOverrides[id] };
}

/**
 * Color por magnitud del entreno (peso, repeticiones, esfuerzo, descanso…).
 * Solo la tinta; el tinte y el filo se derivan en `extras.ts`. Vive aquí, en
 * el archivo puro, para que la prueba de contraste los mida. Ratios sobre
 * `surfaceHighest`, el peor fondo donde se usan (los recalcula la prueba).
 */
export const metricInk = {
  /** Carga. 6,80:1. */
  weight: '#6cb8ff',
  /** Repeticiones. 6,26:1. */
  reps: '#b79bff',
  /** Esfuerzo (RIR). 8,15:1. */
  effort: '#ffb454',
  /** Descanso e intervalos. 8,78:1. */
  rest: '#5fe0b8',
  /** Tiempo de trabajo y cronómetro. 9,68:1. */
  time: '#7fe3f0',
  /** Racha. 6,86:1. */
  streak: '#ff9a5c',
  /** Récord. 9,97:1. */
  record: '#ffd24a',
  /** Volumen (kg movidos). 6,71:1. */
  volume: '#ff8fb1',
  /** Saltado / omitido: gris cálido, no es un error. 5,65:1. */
  skipped: '#a8a294',
} as const;
