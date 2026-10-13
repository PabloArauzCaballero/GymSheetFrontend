/**
 * La marca REPP, en vectorial. Puro: lo usan la app (`ReppMark`) y el script
 * que genera icono y pantalla de arranque (`scripts/render-brand-assets.mjs`).
 *
 * El isotipo oficial de la identidad REPP V1.0 (`REPP_identidad_visual.html`):
 * la «R» blanca y el gesto jade en diagonal. Se copia del vector entregado;
 * no se redibuja ni se cambian proporciones.
 */
export const REPP_MARK_VIEWBOX = '0 0 120 120';
/** La «R». */
export const REPP_MARK_BODY =
  'M25 19 H61 C82 19 94 31 88 48 C84 59 75 65 63 68 L88 101 H65 L42 70 H34 L24 101 H5 L25 19 Z M39 37 L34 54 H55 C64 54 70 50 71 43 C72 39 68 37 60 37 Z';
/** El gesto jade. */
export const REPP_MARK_TICK = 'M25 61 L48 37 H62 L34 71 L14 101 H3 Z';

export function reppMarkSvg({ ink, tick, size = 100 }: { ink: string; tick: string; size?: number }): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${REPP_MARK_VIEWBOX}"><path d="${REPP_MARK_BODY}" fill="${ink}" fill-rule="evenodd"/><path d="${REPP_MARK_TICK}" fill="${tick}"/></svg>`;
}
