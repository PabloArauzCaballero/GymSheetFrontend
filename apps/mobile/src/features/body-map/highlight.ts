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
  fill: '#00d9ff',
  fillOpacity: 0.62,
  stroke: '#d6fbff',
  strokeWidth: 3,
} as const;
