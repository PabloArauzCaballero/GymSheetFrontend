/**
 * Colores del lienzo de la figura anatómica.
 *
 * Son fijos y no del inquilino, a propósito: las láminas son un render sobre
 * negro, y en el tema claro o con el fondo de una marca perderían el volumen.
 * El lienzo es la «sala oscura» donde se mira la figura, igual en los dos temas
 * y en todas las marcas. El color del resaltado vive en `@gymsheet/anatomy`
 * (`HIGHLIGHT`), compartido con el móvil por el mismo motivo.
 */
export const ANATOMY_CANVAS = '#0d0d0d';
/** El lienzo transparente, para fundir los bordes de una lámina recortada. */
export const ANATOMY_CANVAS_CLEAR = '#0d0d0d00';
/** Contorno de las zonas cuando se piden («Zonas»). */
export const ANATOMY_ZONE_LINE = '#ffffff';
