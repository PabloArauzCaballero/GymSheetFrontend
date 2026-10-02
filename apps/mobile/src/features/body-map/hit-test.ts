import type { BodyRegion } from './types';

/**
 * Detección de toque sobre las zonas de la figura. Sin React ni SVG: recibe
 * números y devuelve un código, para poder probarlo sin pantalla.
 */

type Rings = readonly (readonly number[])[];

/**
 * ¿Está el punto dentro de la región? Regla par-impar sobre todos los anillos,
 * así los huecos cuentan como fuera: es exactamente `fill-rule: evenodd`.
 */
export function containsPoint(rings: Rings, x: number, y: number): boolean {
  let inside = false;
  for (const ring of rings) {
    const count = ring.length / 2;
    for (let i = 0, j = count - 1; i < count; j = i++) {
      const xi = ring[2 * i] as number;
      const yi = ring[2 * i + 1] as number;
      const xj = ring[2 * j] as number;
      const yj = ring[2 * j + 1] as number;
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
  }
  return inside;
}

/** Distancia del punto al segmento AB. */
function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Distancia mínima del punto al borde de la región (contorno o hueco). */
export function distanceToBoundary(rings: Rings, x: number, y: number): number {
  let best = Number.POSITIVE_INFINITY;
  for (const ring of rings) {
    const count = ring.length / 2;
    for (let i = 0, j = count - 1; i < count; j = i++) {
      best = Math.min(
        best,
        distanceToSegment(
          x,
          y,
          ring[2 * j] as number,
          ring[2 * j + 1] as number,
          ring[2 * i] as number,
          ring[2 * i + 1] as number,
        ),
      );
    }
  }
  return best;
}

/** Área de la caja que envuelve la región: criterio de desempate barato. */
function boundingArea(rings: Rings): number {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i += 2) {
      const x = ring[i] as number;
      const y = ring[i + 1] as number;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return (maxX - minX) * (maxY - minY);
}

export interface Hit {
  readonly code: string;
  /** `true` si el dedo cayó dentro de la zona; `false` si se acercó al borde. */
  readonly exact: boolean;
}

/**
 * Qué músculo se tocó.
 *
 * 1. Si el punto cae dentro de una o más zonas, gana la más pequeña: un músculo
 *    pequeño metido en el contorno de otro (el redondo mayor junto al dorsal)
 *    tiene que poder tocarse.
 * 2. Si no cae en ninguna, gana la zona cuyo borde esté a `slop` o menos: un
 *    dedo no apunta con precisión de píxel y los músculos finos miden pocos
 *    puntos. `slop` va en unidades del `viewBox`; quien llama lo calcula para
 *    que equivalga a un tamaño constante en pantalla aunque haya zoom.
 */
export function hitTest(regions: readonly BodyRegion[], x: number, y: number, slop = 0): Hit | null {
  let inside: BodyRegion | null = null;
  let insideArea = Number.POSITIVE_INFINITY;
  for (const region of regions) {
    if (!containsPoint(region.rings, x, y)) continue;
    const area = boundingArea(region.rings);
    if (area < insideArea) {
      inside = region;
      insideArea = area;
    }
  }
  if (inside) return { code: inside.code, exact: true };
  if (slop <= 0) return null;

  let nearest: BodyRegion | null = null;
  let nearestDistance = slop;
  for (const region of regions) {
    const distance = distanceToBoundary(region.rings, x, y);
    if (distance <= nearestDistance) {
      nearest = region;
      nearestDistance = distance;
    }
  }
  return nearest ? { code: nearest.code, exact: false } : null;
}

/** Une los anillos de una región en una cadena de trazado SVG (`d`). */
export function toPathData(rings: Rings): string {
  const parts: string[] = [];
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i += 2) {
      parts.push(`${i === 0 ? 'M' : 'L'}${ring[i]} ${ring[i + 1]}`);
    }
    parts.push('Z');
  }
  return parts.join('');
}
