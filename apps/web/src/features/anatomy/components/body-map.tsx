'use client';

import {
  HIGHLIGHT,
  IMAGE_ASPECT,
  REGIONS,
  REGION_VIEWBOX,
  containFrame,
  contentToViewBox,
  dimPathData,
  hitTest,
  muscleInfo,
  pointsToViewBox,
  screenToContent,
  type BodyLayer,
  type BodyView,
} from '@gymsheet/anatomy';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { ANATOMY_CANVAS, ANATOMY_ZONE_LINE } from '@/shared/theme/anatomy-canvas';
import { anatomyImage } from '../images';
import { FigureChrome } from './figure-chrome';
import { groupByCode, usePrefersReducedMotion } from './figure-utils';
import { Segmented } from '@/shared/components/ui/segmented';
import { useFigureGestures } from './use-figure-gestures';

const VIEW_OPTIONS = [
  { value: 'front', label: 'Frente' },
  { value: 'back', label: 'Espalda' },
] as const;

const LAYER_OPTIONS = [
  { value: 'surface', label: 'Externa' },
  { value: 'deep', label: 'Profunda' },
] as const;

/** Tolerancia del puntero, en px de pantalla, a cualquier zoom. */
const POINTER_SLOP = 10;
/** Lo justo para ver el resaltado antes de cambiar de página. */
const OPEN_DELAY_MS = 220;
const ZOOM_STEP = 1.6;
/** Franjas reservadas dentro del lienzo: herramientas arriba, texto abajo. */
const INSET_TOP = 56;
const INSET_BOTTOM = 52;

/**
 * La figura anatómica interactiva de la web.
 *
 * La misma lámina y los mismos contornos que el móvil (`@gymsheet/anatomy`):
 * lo que se ilumina es exactamente lo que se detecta. En escritorio suma lo que
 * el ratón y el teclado permiten: al pasar el ratón se resalta y se nombra el
 * músculo; clic abre su página; cada músculo es además un botón en el orden de
 * tabulación (Intro abre). Gestos de zoom en `useFigureGestures`. Con «reducir
 * movimiento» no hay transiciones ni retardo.
 */
export function BodyMap({
  className,
  onSelectMuscle,
}: Readonly<{
  className?: string;
  /**
   * Qué hacer al elegir un músculo. Por omisión abre su página; el selector del
   * asistente de rutinas lo sustituye para abrir la lista sin salir del asistente.
   */
  onSelectMuscle?: (code: string) => void;
}>) {
  const router = useRouter();
  const reduceMotion = usePrefersReducedMotion();
  const canvasRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<BodyView>('front');
  const [layer, setLayer] = useState<BodyLayer>('surface');
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [showZones, setShowZones] = useState(false);

  const tag = `${layer}-${view}` as const;
  const regions = useMemo(() => REGIONS[tag] ?? [], [tag]);
  const muscles = useMemo(() => groupByCode(regions), [regions]);
  const frame = useMemo(() => {
    const inner = containFrame(
      { width: size.width, height: Math.max(1, size.height - INSET_TOP - INSET_BOTTOM) },
      IMAGE_ASPECT,
    );
    return { ...inner, y: inner.y + INSET_TOP };
  }, [size]);

  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(
    () => () => {
      if (openTimer.current) clearTimeout(openTimer.current);
    },
    [],
  );

  const open = useCallback(
    (code: string) => {
      setSelected(code);
      if (openTimer.current) clearTimeout(openTimer.current);
      openTimer.current = setTimeout(
        () => (onSelectMuscle ? onSelectMuscle(code) : router.push(`/exercises/muscle/${code}`)),
        reduceMotion ? 0 : OPEN_DELAY_MS,
      );
    },
    [onSelectMuscle, reduceMotion, router],
  );

  // `pick` necesita la transformación del hook y el hook necesita a `pick`:
  // el ciclo se rompe leyendo la transformación por referencia.
  const transformRef = useRef({ scale: 1, tx: 0, ty: 0 });
  const pick = useCallback(
    (clientX: number, clientY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return null;
      const t = transformRef.current;
      const content = screenToContent({ x: clientX - rect.left, y: clientY - rect.top }, t, size);
      const point = contentToViewBox(content, frame, REGION_VIEWBOX);
      if (!point) return null;
      const slop = pointsToViewBox(POINTER_SLOP, frame, REGION_VIEWBOX, t.scale);
      return hitTest(regions, point.x, point.y, slop)?.code ?? null;
    },
    [frame, regions, size],
  );

  const figure = useFigureGestures({
    canvasRef,
    size,
    onClick: (x, y) => {
      const code = pick(x, y);
      if (code) open(code);
      else setSelected(null);
    },
    onHover: (x, y) => setHovered(pick(x, y)),
  });
  useEffect(() => {
    transformRef.current = figure.transform;
  }, [figure.transform]);

  // Otra cara u otra capa es otra geometría: se vuelve a la vista completa.
  const resetFor =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      figure.reset();
      setHovered(null);
      setSelected(null);
    };

  const active = selected ?? hovered;
  const activePaths = active ? (muscles.find((muscle) => muscle.code === active)?.paths ?? []) : [];
  const { transform, dragging, zoomed } = figure;

  return (
    <section aria-labelledby="body-map-title" className={cn('grid gap-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-[-0.02em]" id="body-map-title">
            Explora por músculo
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            Elige un músculo en la figura y verás los ejercicios que lo trabajan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Segmented label="Cara del cuerpo" onChange={resetFor(setView)} options={VIEW_OPTIONS} value={view} />
          <Segmented label="Capa muscular" onChange={resetFor(setLayer)} options={LAYER_OPTIONS} value={layer} />
        </div>
      </div>

      {/* El lienzo es oscuro en los dos temas: la lámina es un render sobre
          negro y en claro perdería todo el volumen. */}
      <div
        className="relative h-[min(78vh,780px)] min-h-[440px] touch-none select-none overflow-hidden rounded-[var(--radius-xl)] border border-white/10"
        onPointerLeave={() => setHovered(null)}
        ref={canvasRef}
        style={{
          backgroundColor: ANATOMY_CANVAS,
          cursor: dragging ? 'grabbing' : active ? 'pointer' : zoomed ? 'grab' : 'default',
        }}
        {...figure.handlers}
      >
        {size.width > 0 ? (
          <div
            className="absolute inset-0 origin-center will-change-transform"
            style={{
              transform: `translate(${transform.tx}px, ${transform.ty}px) scale(${transform.scale})`,
              transition: reduceMotion || dragging ? 'none' : 'transform 260ms var(--ease-out)',
            }}
          >
            <Image
              alt={`Figura anatómica ${view === 'front' ? 'de frente' : 'de espalda'}, capa ${layer === 'surface' ? 'externa' : 'profunda'}`}
              className="pointer-events-none absolute"
              draggable={false}
              height={6144}
              key={tag}
              priority
              quality={90}
              sizes="(min-width: 1024px) 1400px, 200vw"
              src={anatomyImage(layer, view)}
              style={{ left: frame.x, top: frame.y, width: frame.width, height: frame.height }}
              width={3072}
            />
            <svg
              className="absolute overflow-visible"
              style={{ left: frame.x, top: frame.y, width: frame.width, height: frame.height }}
              viewBox={`0 0 ${REGION_VIEWBOX.width} ${REGION_VIEWBOX.height}`}
            >
              {activePaths.length ? (
                <g
                  className={reduceMotion ? undefined : 'animate-[fade-in_180ms_var(--ease-out)]'}
                  key={`${tag}-${active}`}
                  pointerEvents="none"
                >
                  <path
                    d={dimPathData(activePaths, REGION_VIEWBOX.width, REGION_VIEWBOX.height)}
                    fill={HIGHLIGHT.dim}
                    fillOpacity={HIGHLIGHT.dimOpacity}
                    fillRule="evenodd"
                  />
                  {activePaths.map((d, index) => (
                    <path
                      d={d}
                      fill={HIGHLIGHT.fill}
                      fillOpacity={HIGHLIGHT.fillOpacity}
                      fillRule="evenodd"
                      key={index}
                      stroke={HIGHLIGHT.stroke}
                      strokeLinejoin="round"
                      strokeWidth={HIGHLIGHT.strokeWidth}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </g>
              ) : null}
              {/* Un botón por músculo, en orden de tabulación. El ratón no los
                  usa (el clic se resuelve con `hitTest`, que tolera el pulso);
                  al enfocarlos con teclado se resaltan igual que al pasar. */}
              {muscles.map((muscle) => (
                <g
                  aria-label={`${muscleInfo(muscle.code)?.name ?? muscle.code}: ver ejercicios`}
                  className="outline-none"
                  key={muscle.code}
                  onBlur={() => setHovered((current) => (current === muscle.code ? null : current))}
                  onFocus={() => setHovered(muscle.code)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      open(muscle.code);
                    }
                  }}
                  pointerEvents="none"
                  role="button"
                  tabIndex={0}
                >
                  {muscle.paths.map((d, index) => (
                    <path
                      d={d}
                      fill="transparent"
                      fillRule="evenodd"
                      key={index}
                      stroke={showZones ? ANATOMY_ZONE_LINE : 'transparent'}
                      strokeOpacity={0.5}
                      strokeWidth={1.25}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </g>
              ))}
            </svg>
          </div>
        ) : null}

        <FigureChrome
          info={active ? muscleInfo(active) : undefined}
          onReset={figure.reset}
          onToggleZones={() => setShowZones((value) => !value)}
          onZoomIn={() => figure.zoomBy(ZOOM_STEP)}
          onZoomOut={() => figure.zoomBy(1 / ZOOM_STEP)}
          showZones={showZones}
          zoomed={zoomed}
        />
      </div>
    </section>
  );
}
