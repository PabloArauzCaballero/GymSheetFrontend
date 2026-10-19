/** Margen para caer ya dentro del segundo nuevo y no justo antes. */
const SECOND_EDGE_MS = 8;

/**
 * Cuánto falta para que cambie el segundo que se enseña (`formatRestClock`
 * redondea hacia arriba: con 4.300 ms se ve «0:05» y pasa a «0:04» dentro de 300 ms).
 */
export function msToNextSecond(remainingMs: number): number {
  const into = remainingMs % 1000;
  return (into <= 0 ? 1000 : into) + SECOND_EDGE_MS;
}
