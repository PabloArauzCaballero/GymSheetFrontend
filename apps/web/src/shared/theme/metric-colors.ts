/**
 * Color por significado del entreno, el mismo que el móvil
 * (`apps/mobile/src/theme/palette.ts` → `metricInk`, `extras.ts` → `metricColors`).
 *
 * El peso es azul, las repeticiones violetas, el esfuerzo ámbar, el descanso
 * menta… No son la marca ni cambian con el gimnasio. `ink` es el glifo o la
 * cifra fina; `tint`, su fondo; `edge`, el filo. La prueba de paridad
 * (`mobile-parity.test.ts`) falla si estos valores se separan del móvil.
 */
export const metricInk = {
  weight: '#6cb8ff',
  reps: '#b79bff',
  effort: '#ffb454',
  rest: '#5fe0b8',
  time: '#7fe3f0',
  streak: '#ff9a5c',
  record: '#ffd24a',
  volume: '#ff8fb1',
  skipped: '#b4bcc6',
} as const;

export type MetricKey = keyof typeof metricInk;

const mix = (color: string, percent: number) =>
  `color-mix(in srgb, ${color} ${percent}%, transparent)`;

/** `ink` · `tint` (14 %) · `edge` (32 %), como `metric()` en el móvil. */
export function metricColor(key: MetricKey) {
  const ink = metricInk[key];
  return { ink, tint: mix(ink, 14), edge: mix(ink, 32) } as const;
}

/**
 * Tintes de acento fijos del móvil (`accentHues`) que la web necesita: la
 * franja del directorio en Inicio.
 */
export const accentHues = {
  emerald: '#10B981',
  emeraldDeep: '#064E3B',
  ink: '#000000',
} as const;

/** Estrella de valoración (`ratingStar` del móvil). */
export const ratingStar = '#f5b94a';

/**
 * Portada sin imagen: un degradado propio de cada objetivo (`goalGradients`
 * del móvil), nunca un cuadro gris.
 */
export const goalGradients = {
  HIPERTROFIA: ['#3a1f5c', '#14101f'],
  FUERZA: ['#5c1f1f', '#1a0f0f'],
  RESISTENCIA: ['#123d4f', '#0c161c'],
  PERDIDA_GRASA: ['#5a3412', '#1c120a'],
  SALUD_GENERAL: ['#1d4a2b', '#0d1810'],
  RENDIMIENTO_DEPORTIVO: ['#4b3b12', '#17140a'],
  REHABILITACION: ['#1f3a5c', '#0e1520'],
  DEFAULT: ['#2b2a26', '#11110f'],
} as const satisfies Record<string, readonly [string, string]>;

/** Texto sobre una foto o un degradado oscuro (`onMedia` del móvil). */
export const onMedia = {
  text: '#ffffff',
  muted: 'rgb(255 255 255 / 0.75)',
  chip: 'rgb(0 0 0 / 0.6)',
} as const;
