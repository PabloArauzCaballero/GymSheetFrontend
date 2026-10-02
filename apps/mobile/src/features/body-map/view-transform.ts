import type { Frame, Point, Size } from './types';

/**
 * Geometría del zoom y el desplazamiento de la figura. Todo son funciones
 * puras de números: el componente solo las llama desde los gestos.
 *
 * Convenciones:
 *  - Las funciones marcadas `'worklet'` se llaman desde el hilo de UI mientras
 *    dura un gesto; el resto solo se usa desde JS.
 *  - El contenedor es la vista que recibe los gestos; **no se transforma**.
 *  - Su contenido (imagen y capa de zonas) se escala `scale` veces alrededor
 *    del centro del contenedor y se traslada `tx`, `ty`:
 *        pantalla = centro + t + scale · (p − centro)
 *  - La imagen ocupa un marco `contain` dentro del contenedor, y las zonas se
 *    expresan en un `viewBox` que cubre exactamente ese marco.
 */

export interface ViewTransform {
  readonly scale: number;
  readonly tx: number;
  readonly ty: number;
}

export const IDENTITY: ViewTransform = { scale: 1, tx: 0, ty: 0 };
export const MIN_SCALE = 1;
export const MAX_SCALE = 4;

export function clampScale(scale: number): number {
  'worklet';
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/**
 * Limita el desplazamiento para que la figura no se salga del contenedor: a
 * escala 1 no hay desplazamiento posible, y con zoom solo el sobrante.
 */
export function clampTransform(t: ViewTransform, container: Size): ViewTransform {
  'worklet';
  const scale = clampScale(t.scale);
  const limitX = (container.width * (scale - 1)) / 2;
  const limitY = (container.height * (scale - 1)) / 2;
  // `+ 0` convierte un `-0` (que sale de `Math.max(-0, …)` cuando el límite es
  // 0) en `0`: son iguales para el dibujo pero no para `Object.is`.
  return {
    scale,
    tx: Math.min(limitX, Math.max(-limitX, t.tx)) + 0,
    ty: Math.min(limitY, Math.max(-limitY, t.ty)) + 0,
  };
}

/**
 * Cambia la escala manteniendo quieto el punto `focal` (en coordenadas del
 * contenedor): el pellizco tiene que acercar lo que hay bajo los dedos, no el
 * centro de la pantalla.
 */
export function zoomAbout(t: ViewTransform, nextScale: number, focal: Point, container: Size): ViewTransform {
  'worklet';
  const scale = clampScale(nextScale);
  const cx = container.width / 2;
  const cy = container.height / 2;
  // El punto del contenido bajo `focal` antes del cambio…
  const contentX = cx + (focal.x - cx - t.tx) / t.scale;
  const contentY = cy + (focal.y - cy - t.ty) / t.scale;
  // …debe quedar bajo `focal` después.
  return clampTransform(
    {
      scale,
      tx: focal.x - cx - scale * (contentX - cx),
      ty: focal.y - cy - scale * (contentY - cy),
    },
    container,
  );
}

/** Punto del contenedor (sin transformar) que está bajo un punto de la pantalla. */
export function screenToContent(screen: Point, t: ViewTransform, container: Size): Point {
  'worklet';
  const cx = container.width / 2;
  const cy = container.height / 2;
  return {
    x: cx + (screen.x - cx - t.tx) / t.scale,
    y: cy + (screen.y - cy - t.ty) / t.scale,
  };
}

/** Marco `contain` de una imagen de proporción `aspect` (ancho / alto). */
export function containFrame(container: Size, aspect: number): Frame {
  const containerAspect = container.width / container.height;
  if (containerAspect > aspect) {
    const width = container.height * aspect;
    return { x: (container.width - width) / 2, y: 0, width, height: container.height };
  }
  const height = container.width / aspect;
  return { x: 0, y: (container.height - height) / 2, width: container.width, height };
}

/**
 * Del punto del contenedor al `viewBox` de las zonas; `null` si cae fuera de la
 * imagen (en la franja vacía que deja el marco `contain`).
 */
export function contentToViewBox(point: Point, frame: Frame, viewBox: Size): Point | null {
  const u = (point.x - frame.x) / frame.width;
  const v = (point.y - frame.y) / frame.height;
  if (u < 0 || u > 1 || v < 0 || v > 1) return null;
  return { x: u * viewBox.width, y: v * viewBox.height };
}

/**
 * Cuántas unidades del `viewBox` mide un tamaño en pantalla (puntos) a la escala
 * actual. Sirve para que la tolerancia del toque sea de un tamaño de dedo
 * constante aunque haya zoom.
 */
export function pointsToViewBox(points: number, frame: Frame, viewBox: Size, scale: number): number {
  return (points / scale) * (viewBox.width / frame.width);
}
