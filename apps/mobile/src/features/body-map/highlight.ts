/**
 * Color del músculo resaltado.
 *
 * Es propio de la figura y NO sale del acento del gimnasio: la anatomía es roja y
 * el acento de varias marcas también (TOP Fitness, `#ed1b34`), así que el
 * resaltado rojo sobre músculo rojo no se distinguía. El cian es el opuesto del
 * rojo en la rueda de color, contrasta con el músculo y con el fondo negro, y se
 * lee igual con cualquier marca. El borde claro separa el contorno del relleno.
 *
 * Es la única excepción a «el acento es para la acción principal»: aquí el color
 * no decora, comunica qué músculo se ha tocado, y por eso no puede variar con la
 * marca.
 */
export const HIGHLIGHT = {
  fill: '#1fbcf2',
  fillOpacity: 0.55,
  stroke: '#c9f3ff',
  strokeWidth: 2,
  /**
   * Velo sobre el resto del cuerpo. El músculo destaca porque lo demás se
   * apaga, no porque el relleno grite: así el cian puede ser más suave y la
   * textura del músculo sigue viéndose debajo.
   */
  dim: '#000000',
  dimOpacity: 0.5,
  /** Fundido de entrada del resaltado, en ms. */
  fadeMs: 180,
} as const;

/**
 * Path del velo: un rectángulo del tamaño de la lámina con los contornos del
 * músculo como agujeros (se pinta con `evenodd`).
 */
export function dimPathData(musclePaths: readonly string[], width: number, height: number): string {
  return [`M0 0H${width}V${height}H0Z`, ...musclePaths].join(' ');
}
