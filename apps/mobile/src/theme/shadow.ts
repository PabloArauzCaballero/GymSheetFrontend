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
  /**
   * Tarjeta con imagen (portadas del catálogo): profunda y muy difusa. Sobre un
   * lienzo casi negro una sombra corta no se ve; lo que separa la superficie es
   * el tamaño del desenfoque. Con el filo superior iluminado, como recoge la
   * luz el canto de un objeto.
   */
  card: `inset 0 1px 0 ${alpha(ink.white, 0.07)}, 0 18px 40px -12px ${alpha(ink.black, 0.7)}`,
  e3: `inset 0 1px 0 ${alpha(ink.white, 0.06)}, 0 -8px 24px ${alpha(ink.black, 0.5)}`,
} as const;

/**
 * Halo bajo la acción principal: el botón se lee como fuente de luz y no como
 * un rectángulo pintado. Uno por pantalla; apagado si el botón está bloqueado.
 */
export function accentGlow(accent: string): string {
  return `0 10px 28px -8px ${alpha(accent, 0.55)}`;
}
