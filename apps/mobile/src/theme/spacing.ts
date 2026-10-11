/**
 * Espaciado (C8.2): rejilla 2·4·8·12·16·20·24·32·40.
 *
 * Los nombres de siempre (`xs`…`2xl`) se mantienen para no romper pantallas;
 * los pasos intermedios que faltaban (12 y 20, los que más se escribían a mano)
 * tienen nombre propio. `2xl` (48) queda solo por compatibilidad.
 */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  smd: 12,
  md: 16,
  mdl: 20,
  lg: 24,
  xl: 32,
  xxl: 40,
  '2xl': 48,
} as const;

/** Margen lateral de pantalla. */
export const gutter = 20;

/** Ritmo vertical dentro de una tarjeta. */
export const cardGap = 12;

/** Relleno interior de una tarjeta. */
export const cardPadding = 20;

/** Distancia entre secciones de una pantalla. */
export const screenGap = 32;

/** Hueco entre la etiqueta de una sección y lo que etiqueta. */
export const sectionGap = 12;

/** Objetivo táctil mínimo (HIG 44). */
export const minTouchTarget = 44;

/** Objetivo táctil de la casa para la acción principal y el entrenamiento. */
export const comfortableTouchTarget = 48;

/** Tamaños de icono: cada icono elige uno de estos. */
export const iconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
} as const;

/** Tamaños de miniatura de ejercicio (C8.1). */
export const thumbSizes = {
  /** Apiladas en una tarjeta de día. */
  stack: 40,
  /** Fila de ejercicio. */
  row: 64,
  /** Portada. */
  cover: 88,
} as const;

/** Columna de texto cómoda; más allá, los márgenes absorben el ancho. */
export const maxContentWidth = 560;

/** Ancho a partir del cual una columna de teléfono desperdicia pantalla. */
export const tabletBreakpoint = 700;

/** Tope con dos columnas. */
export const maxWideContentWidth = 1040;
