/** Capa anatómica que se muestra: la superficie o lo que hay debajo. */
export type BodyLayer = 'surface' | 'deep';

/** Cara del cuerpo que mira a la cámara. */
export type BodyView = 'front' | 'back';

/**
 * Zona tocable de la figura: un músculo tal y como se ve en una vista y capa
 * concretas. Los anillos son coordenadas planas `[x0, y0, x1, y1, …]` en el
 * `viewBox` de `REGION_VIEWBOX`; el primero suele ser el contorno y los demás
 * huecos, pero no se distingue: se usa la regla par-impar, que es la misma de
 * `fill-rule: evenodd` en SVG, así lo que se resalta y lo que se detecta
 * coinciden.
 */
export interface BodyRegion {
  /** Código del músculo en la taxonomía del backend (`PECTORALIS_MAJOR`…). */
  readonly code: string;
  readonly rings: readonly (readonly number[])[];
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Frame extends Point, Size {}
