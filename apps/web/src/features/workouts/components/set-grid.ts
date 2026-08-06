/**
 * Plantilla de columnas compartida por la "tabla" de series (cabecera en
 * `workout-exercise-panel` + filas en `workout-set-row`). Ambas deben usar el
 * MISMO template para que las columnas queden alineadas; por eso vive aquí.
 *
 * Las pistas encogen (`minmax(0,1fr)` en lugar de un mínimo de 70px y `auto`
 * en vez de 92px fijos) para que las 3 columnas numéricas + índice + acciones
 * entren sin desbordar a 320px. El gap es menor en móvil y crece en `sm`.
 */
export const SET_GRID_COLS =
  'grid grid-cols-[32px_repeat(3,minmax(0,1fr))_auto] items-center gap-1.5 sm:gap-2';
