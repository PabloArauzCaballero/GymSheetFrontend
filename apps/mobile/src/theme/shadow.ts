import { alpha, ink } from './palette';

/**
 * Elevación (C8.1): las tarjetas se separan por el tono de la superficie y por
 * sombras suaves, no por bordes. `boxShadow` (nueva arquitectura), nunca las
 * props heredadas de sombra.
 *
 * - `e1`: tarjeta base sobre el lienzo, filo superior apenas iluminado.
 * - `e2`: tarjeta elevada o agrupada.
 * - `e3`: hojas, pie fijo, elementos flotantes.
 */
export const shadows = {
  e1: `inset 0 1px 0 ${alpha(ink.white, 0.04)}, 0 1px 2px ${alpha(ink.black, 0.4)}`,
  e2: `inset 0 1px 0 ${alpha(ink.white, 0.05)}, 0 12px 32px ${alpha(ink.black, 0.45)}`,
  e3: `inset 0 1px 0 ${alpha(ink.white, 0.06)}, 0 -8px 24px ${alpha(ink.black, 0.5)}`,
} as const;
