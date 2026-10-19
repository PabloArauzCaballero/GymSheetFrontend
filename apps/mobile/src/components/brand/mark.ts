/**
 * La marca REPP, en vectorial. Puro: lo usan la app (`ReppMark`, la cortinilla)
 * y los scripts que generan icono, arranque y vídeo (`scripts/render-brand-*.mjs`).
 *
 * El isotipo oficial de la identidad REPP V1.0 (`REPP_identidad_visual.html`):
 * la «R» blanca y el gesto jade en diagonal. Se copia del vector entregado;
 * no se redibuja ni se cambian proporciones.
 */

/**
 * Caja de tinta del signo dentro de su dibujo de 120: x 3–94, y 19–101.
 *
 * El vector entregado no está centrado en su lienzo —la tinta queda 11,5
 * unidades a la izquierda—, y con `0 0 120 120` el icono del teléfono y la ficha
 * de la app salían corridos. Se centra **moviendo la ventana**, no el dibujo.
 */
export const REPP_MARK_BOX = { x: 3, y: 19, width: 91, height: 82 } as const;
export const REPP_MARK_CENTER = {
  x: REPP_MARK_BOX.x + REPP_MARK_BOX.width / 2,
  y: REPP_MARK_BOX.y + REPP_MARK_BOX.height / 2,
} as const;
export const REPP_MARK_VIEWBOX = `${REPP_MARK_CENTER.x - 60} ${REPP_MARK_CENTER.y - 60} 120 120`;
/** La «R». */
export const REPP_MARK_BODY =
  'M25 19 H61 C82 19 94 31 88 48 C84 59 75 65 63 68 L88 101 H65 L42 70 H34 L24 101 H5 L25 19 Z M39 37 L34 54 H55 C64 54 70 50 71 43 C72 39 68 37 60 37 Z';
/** El gesto jade. */
export const REPP_MARK_TICK = 'M25 61 L48 37 H62 L34 71 L14 101 H3 Z';

/**
 * El logotipo «REPP» (lienzo 700 × 230, tinta x 20–642, y 44–183).
 *
 * Su «R» y su gesto tienen **los mismos comandos, en el mismo orden**, que los
 * del signo: es lo que permite a la cortinilla transformar uno en otro punto a
 * punto en vez de fundir dos dibujos.
 */
export const REPP_WORDMARK_BOX = { x: 20, y: 44, width: 622, height: 139 } as const;
export const REPP_WORDMARK_R =
  'M63 44 H139 C177 44 195 65 187 91 C182 109 167 120 147 126 L188 183 H142 L106 131 H83 L66 183 H22 L62 44 Z M91 76 L82 105 H121 C136 105 146 98 148 88 C150 80 143 76 131 76 Z';
export const REPP_WORDMARK_TICK = 'M62 119 L101 77 L126 77 L78 135 L45 183 L20 183 Z';
export const REPP_WORDMARK_LETTERS = [
  'M213 44 H337 L327 76 H245 L237 99 H309 L300 128 H228 L220 151 H303 L293 183 H169 Z',
  'M357 44 H438 C476 44 494 63 485 94 C476 124 451 140 415 140 H379 L366 183 H326 Z M387 76 L378 109 H412 C427 109 438 101 441 89 C444 80 438 76 424 76 Z',
  'M505 44 H586 C624 44 642 63 633 94 C624 124 599 140 563 140 H527 L514 183 H474 Z M535 76 L526 109 H560 C575 109 586 101 589 89 C592 80 586 76 572 76 Z',
] as const;

export function reppMarkSvg({ ink, tick, size = 100 }: { ink: string; tick: string; size?: number }): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${REPP_MARK_VIEWBOX}"><path d="${REPP_MARK_BODY}" fill="${ink}" fill-rule="evenodd"/><path d="${REPP_MARK_TICK}" fill="${tick}"/></svg>`;
}
