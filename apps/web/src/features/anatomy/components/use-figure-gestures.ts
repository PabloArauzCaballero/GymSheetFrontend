import { IDENTITY, clampTransform, zoomAbout, type Size, type ViewTransform } from '@gymsheet/anatomy';
import { useCallback, useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';

/** Un arrastre más corto que esto es un clic. */
const CLICK_DISTANCE = 6;

type Gesture = {
  start: { x: number; y: number };
  base: ViewTransform;
  pinchDistance: number | null;
  moved: boolean;
};

const spread = (points: readonly { x: number; y: number }[]) =>
  Math.hypot(points[0]!.x - points[1]!.x, points[0]!.y - points[1]!.y);

/**
 * Zoom y desplazamiento de la figura con puntero, táctil y trackpad. La misma
 * geometría que el móvil (`zoomAbout`, `clampTransform`): acercar mantiene fijo
 * el punto bajo los dedos o el cursor, y la figura nunca se sale del lienzo.
 *
 *  - Dos dedos pellizcan; uno arrastra solo si hay zoom (a escala 1 el gesto
 *    es para la página, no para la figura).
 *  - Ctrl/⌘ + rueda (y el pellizco del trackpad, que llega así) acerca; la
 *    rueda sola sigue desplazando la página.
 *  - Lo que no llega a moverse es un clic: se entrega a `onClick` con sus
 *    coordenadas, y el puntero que flota sin pulsar a `onHover`.
 */
export function useFigureGestures({
  canvasRef,
  size,
  onClick,
  onHover,
}: {
  canvasRef: RefObject<HTMLDivElement | null>;
  size: Size;
  onClick: (clientX: number, clientY: number) => void;
  onHover: (clientX: number, clientY: number) => void;
}) {
  const [transform, setTransform] = useState<ViewTransform>(IDENTITY);
  const [dragging, setDragging] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);

  const zoomBy = useCallback(
    (factor: number, focal?: { x: number; y: number }) => {
      setTransform((current) =>
        zoomAbout(current, current.scale * factor, focal ?? { x: size.width / 2, y: size.height / 2 }, size),
      );
    },
    [size],
  );

  const reset = useCallback(() => setTransform(IDENTITY), []);

  // La rueda se escucha a mano porque React la registra como pasiva y entonces
  // no se puede cancelar: sin `preventDefault`, el pellizco del trackpad
  // ampliaría la página entera en vez de la figura.
  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      zoomBy(Math.exp(-event.deltaY * 0.01), { x: event.clientX - rect.left, y: event.clientY - rect.top });
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [canvasRef, zoomBy]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    // jsdom y algún navegador viejo no lo implementan; sin captura el gesto
    // sigue funcionando mientras el puntero no salga del lienzo.
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointers.current.values()];
    gesture.current = {
      start: { x: event.clientX, y: event.clientY },
      base: transform,
      pinchDistance: points.length === 2 ? spread(points) : null,
      moved: gesture.current?.moved ?? false,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current || !pointers.current.has(event.pointerId)) {
      if (event.pointerType === 'mouse') onHover(event.clientX, event.clientY);
      return;
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointers.current.values()];
    const rect = event.currentTarget.getBoundingClientRect();
    if (points.length === 2 && current.pinchDistance) {
      const focal = {
        x: (points[0]!.x + points[1]!.x) / 2 - rect.left,
        y: (points[0]!.y + points[1]!.y) / 2 - rect.top,
      };
      current.moved = true;
      setTransform(
        zoomAbout(current.base, current.base.scale * (spread(points) / current.pinchDistance), focal, size),
      );
      return;
    }
    const dx = event.clientX - current.start.x;
    const dy = event.clientY - current.start.y;
    if (Math.hypot(dx, dy) > CLICK_DISTANCE) current.moved = true;
    if (current.moved && current.base.scale > 1.02) {
      setDragging(true);
      setTransform(clampTransform({ ...current.base, tx: current.base.tx + dx, ty: current.base.ty + dy }, size));
    }
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    pointers.current.delete(event.pointerId);
    if (pointers.current.size > 0) return;
    gesture.current = null;
    setDragging(false);
    if (current && !current.moved) onClick(event.clientX, event.clientY);
  };

  return {
    transform,
    dragging,
    zoomed: transform.scale > 1.02,
    zoomBy,
    reset,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
}
