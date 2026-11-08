/**
 * Isotipo REPP en vectorial, compartido por la web y el móvil.
 *
 * Copia exacta de `apps/mobile/src/components/brand/mark.ts` (identidad REPP
 * V1.0): la «R» y el gesto jade en diagonal. No se redibuja ni se cambian
 * proporciones; la prueba de paridad de la web falla si las dos copias se
 * separan.
 */
export const REPP_MARK_BOX = { x: 3, y: 19, width: 91, height: 82 } as const;
export const REPP_MARK_VIEWBOX = `${REPP_MARK_BOX.x + REPP_MARK_BOX.width / 2 - 60} ${
  REPP_MARK_BOX.y + REPP_MARK_BOX.height / 2 - 60
} 120 120`;
/** La «R». */
export const REPP_MARK_BODY =
  'M25 19 H61 C82 19 94 31 88 48 C84 59 75 65 63 68 L88 101 H65 L42 70 H34 L24 101 H5 L25 19 Z M39 37 L34 54 H55 C64 54 70 50 71 43 C72 39 68 37 60 37 Z';
/** El gesto jade. */
export const REPP_MARK_TICK = 'M25 61 L48 37 H62 L34 71 L14 101 H3 Z';
/** Ficha navy del isotipo y jade fijo de la identidad (no cambian con el gimnasio). */
export const REPP_NAVY = '#0F172A';
export const REPP_JADE = '#2E8B7B';
/** Tinta de la «R» sobre la ficha navy. */
export const REPP_INK = '#FFFFFF';
