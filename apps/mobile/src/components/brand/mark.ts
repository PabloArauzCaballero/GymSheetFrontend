/**
 * La marca REPP, en vectorial. Puro: lo usan la app (`ReppMark`) y el script
 * que genera icono y pantalla de arranque (`scripts/render-brand-assets.mjs`).
 *
 * El signo es una «R» partida en dos trazos sobre un lienzo de 100: el cuerpo
 * (asta y panza) y la pata, separada y en diagonal ascendente, que es a la vez
 * la raya con la que se apunta una repetición. Dibujo propio; no deriva de
 * ninguna tipografía ni de otra marca.
 */
export const REPP_MARK_VIEWBOX = '0 0 100 100';
/** Asta y panza. */
export const REPP_MARK_BODY = 'M22 16H55C72 16 84 27 84 42.5C84 58 72 69 55 69H41V84H22ZM41 33V52H54C60 52 64.5 48 64.5 42.5C64.5 37 60 33 54 33Z';
/** La pata: la raya de la repetición. */
export const REPP_MARK_TICK = 'M52 76H70L84 92H66Z';

export function reppMarkSvg({ ink, tick, size = 100 }: { ink: string; tick: string; size?: number }): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${REPP_MARK_VIEWBOX}"><path d="${REPP_MARK_BODY}" fill="${ink}" fill-rule="evenodd"/><path d="${REPP_MARK_TICK}" fill="${tick}"/></svg>`;
}
