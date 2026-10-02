import type { BodyRegion, Size } from './types';

/**
 * Encuadre de un músculo dentro de una caja: qué parte de la lámina enseñar y
 * a qué tamaño para que el músculo quede centrado y a la vista. Es la cabecera
 * de la pantalla de detalle.
 */

export interface Bounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/** Caja que envuelve todos los anillos de las regiones dadas; `null` si no hay puntos. */
export function boundsOf(regions: readonly BodyRegion[]): Bounds | null {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const region of regions) {
    for (const ring of region.rings) {
      for (let i = 0; i < ring.length; i += 2) {
        const x = ring[i] as number;
        const y = ring[i + 1] as number;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : null;
}

/** Dónde colocar la lámina completa (en puntos) dentro de la caja. */
export interface Placement {
  /** Puntos de pantalla por unidad del `viewBox`. */
  readonly unit: number;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Coloca la lámina para que `bounds` quede centrado en `box`, con `padding`
 * (1 = pegado al borde, 1.5 = un 50 % de aire alrededor).
 *
 * El zoom se acota por los dos lados: nunca menos que la figura entera cabiendo
 * en la caja, y nunca tanto que un músculo diminuto se convierta en una mancha
 * sin contexto (`maxViewBoxHeight` es lo mínimo que se ve de alto).
 */
export function placeBounds(
  bounds: Bounds,
  box: Size,
  viewBox: Size,
  { padding = 1.5, maxZoomViewBoxHeight = 500 }: { padding?: number; maxZoomViewBoxHeight?: number } = {},
): Placement {
  const boundsWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const boundsHeight = Math.max(bounds.maxY - bounds.minY, 1);
  const fit = Math.min(box.width / (boundsWidth * padding), box.height / (boundsHeight * padding));
  const wholeFigure = Math.min(box.width / viewBox.width, box.height / viewBox.height);
  const tightest = box.height / maxZoomViewBoxHeight;
  const unit = Math.min(tightest, Math.max(wholeFigure, fit));
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  return {
    unit,
    left: box.width / 2 - centerX * unit,
    top: box.height / 2 - centerY * unit,
    width: viewBox.width * unit,
    height: viewBox.height * unit,
  };
}

/** Área de la caja de una región: sirve para elegir la vista donde el músculo se ve mejor. */
export function boundsArea(bounds: Bounds | null): number {
  return bounds ? (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY) : 0;
}
