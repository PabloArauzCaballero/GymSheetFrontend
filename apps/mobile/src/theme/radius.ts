/**
 * Radios (C8.2): 8/12/16/20/24, siempre con `borderCurve: 'continuous'`
 * (lo añade `continuous`). Anidados: radio exterior − relleno.
 *
 * Nombres de siempre: `sm` control pequeño, `md` control, `lg` tarjeta
 * pequeña, `xl` tarjeta, `xxl` hoja. `full` es la cápsula (sin curva continua).
 */
export const radii = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

/** Curva de esquina de iOS; se ignora en Android y web. */
export const continuous = { borderCurve: 'continuous' } as const;
