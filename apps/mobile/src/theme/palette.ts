/**
 * Paleta del móvil: REPP sobre navy y niebla (2026-10-13).
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
  background: '#0F172A',
  /** Pozos dentro de una tarjeta (campos, pistas de progreso). */
  surfaceSunken: '#111A2C',
  surfaceLowest: '#141E31',
  /** Tarjeta base (e1). */
  surfaceLow: '#172235',
  surface: '#1A253A',
  /** Tarjeta elevada (e2), hojas. */
  surfaceHigh: '#1D283D',
  /** Controles, píldoras, chips. */
  surfaceHighest: '#243247',
  surfaceSidebar: '#0F172A',
  /** Divisores decorativos. No sirven como único contorno de un control. */
  borderSubtle: '#202C42',
  border: '#2C3A52',
  /** Contorno de control: token diferenciado de las líneas decorativas. */
  borderControl: '#8496AA',
  /** Texto principal. */
  text: '#F5F8FA',
  /** Texto secundario. */
  textSecondary: '#C1CCD6',
  /** Metadatos con contraste AA sobre la superficie de control. */
  textMuted: '#A9B6C2',
  /** Solo controles deshabilitados de verdad; nunca información. */
  textDisabled: '#718091',
  /** Placa «papel» para las ilustraciones del dataset (que vienen sobre blanco). */
  plate: '#E9EEF2',
  /** Tinta sobre la placa. */
  plateInk: '#18212B',
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

/**
 * Mezcla dos `#rrggbb` (t = peso de `a`) y devuelve `#rrggbb` opaco: un tono
 * de marca rebajado que no deja ver lo que hay detrás (p. ej. la trama del chat).
 */
export function mixHex(a: string, b: string, t: number): string {
  const channels = (hex: string) => {
    const clean = hex.replace('#', '');
    const full = clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean.slice(0, 6);
    const value = Number.parseInt(full, 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  };
  const [ca, cb] = [channels(a), channels(b)];
  return `#${ca.map((channel, index) => Math.round(channel * t + cb[index]! * (1 - t)).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Chat. La burbuja propia es el acento de la marca mezclado al 55 % con el
 * lienzo (REPP: jade → `#205757`, texto 7,7:1; TOP Fitness: rojo → `#82162c`,
 * 9,4:1). Las citas usan un color por autor, como WhatsApp.
 */
export const chatInk = {
  mineMix: 0.55,
  /** Autor de una cita ajena: lavanda, 6,4:1 sobre la burbuja ajena. */
  quoteOther: '#b79bff',
  /** Autor de una cita propia sobre la burbuja propia: menta clara, 6,1:1. */
  quoteMine: '#8ff0cf',
} as const;

/** Velos y realces sobre contenido o imágenes. */
export const overlay = {
  /** Velo de hojas y modales. */
  scrim: alpha(ink.black, 0.72),
  scrimSoft: alpha(ink.black, 0.6),
  scrimStrong: alpha(ink.black, 0.88),
  scrimSolid: alpha(ink.black, 0.92),
  /** Velo leve sobre una foto (botón sobre imagen). */
  scrimFaint: alpha(ink.black, 0.35),
  /** Velo de las hojas inferiores del chat. */
  scrimSheet: alpha(ink.black, 0.52),
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
  /** Saltado / omitido: gris niebla, no es un error. 5,99:1. */
  skipped: '#b4bcc6',
} as const;

/**
 * Colores fijos de la identidad REPP V1.0. Solo para el isotipo y su ficha:
 * no cambian con la marca del gimnasio (el acento de la interfaz es `colors.volt`).
 */
export const reppJade = '#2E8B7B';
export const brandNavy = '#0F172A';
