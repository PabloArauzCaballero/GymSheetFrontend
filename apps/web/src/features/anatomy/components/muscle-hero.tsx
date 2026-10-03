'use client';

import {
  AGGREGATES,
  HIGHLIGHT,
  REGIONS,
  REGION_VIEWBOX,
  boundsArea,
  boundsOf,
  dimPathData,
  placeBounds,
  toPathData,
  type BodyLayer,
  type BodyRegion,
  type BodyView,
} from '@gymsheet/anatomy';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ANATOMY_CANVAS, ANATOMY_CANVAS_CLEAR } from '@/shared/theme/anatomy-canvas';
import { anatomyImage } from '../images';

const VIEWS: readonly { layer: BodyLayer; view: BodyView }[] = [
  { layer: 'surface', view: 'front' },
  { layer: 'surface', view: 'back' },
  { layer: 'deep', view: 'front' },
  { layer: 'deep', view: 'back' },
];

/** La vista donde el músculo ocupa más: es donde mejor se lee. */
function bestView(codes: readonly string[]) {
  let best: { layer: BodyLayer; view: BodyView; regions: BodyRegion[]; area: number } | null = null;
  for (const candidate of VIEWS) {
    const regions = (REGIONS[`${candidate.layer}-${candidate.view}`] ?? []).filter((region) =>
      codes.includes(region.code),
    );
    const area = boundsArea(boundsOf(regions));
    if (area > (best?.area ?? 0)) best = { ...candidate, regions, area };
  }
  return best;
}

/**
 * La lámina recortada y centrada en el músculo, con su silueta resaltada y el
 * resto del cuerpo apagado. Mismo cálculo de encuadre que el móvil
 * (`placeBounds`), sobre la misma lámina.
 */
export function MuscleHero({ code }: Readonly<{ code: string }>) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const upper = code.toUpperCase();
  const view = useMemo(() => bestView(AGGREGATES[upper] ?? [upper]), [upper]);

  useEffect(() => {
    const element = boxRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setBox({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (!view) return null;
  const bounds = boundsOf(view.regions);
  const placement =
    bounds && box.width > 0
      ? placeBounds(bounds, box, REGION_VIEWBOX, { padding: 1.9, maxZoomViewBoxHeight: 560 })
      : null;
  const paths = view.regions.map((region) => toPathData(region.rings));

  return (
    <div
      aria-hidden
      className="relative aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-xl)] border border-white/10 lg:aspect-[4/5]"
      ref={boxRef}
      style={{ backgroundColor: ANATOMY_CANVAS }}
    >
      {placement ? (
        <div
          className="absolute"
          style={{ left: placement.left, top: placement.top, width: placement.width, height: placement.height }}
        >
          <Image
            alt=""
            className="pointer-events-none"
            fill
            priority
            quality={90}
            sizes="(min-width: 1024px) 2400px, 300vw"
            src={anatomyImage(view.layer, view.view)}
          />
          <svg
            className="absolute inset-0 size-full motion-safe:animate-[fade-in_360ms_var(--ease-out)]"
            viewBox={`0 0 ${REGION_VIEWBOX.width} ${REGION_VIEWBOX.height}`}
          >
            <path
              d={dimPathData(paths, REGION_VIEWBOX.width, REGION_VIEWBOX.height)}
              fill={HIGHLIGHT.dim}
              fillOpacity={HIGHLIGHT.dimOpacity}
              fillRule="evenodd"
            />
            {paths.map((d, index) => (
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
          </svg>
        </div>
      ) : null}
      {/* Bordes fundidos: la lámina recortada no termina en un corte seco. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-10"
        style={{ backgroundImage: `linear-gradient(to bottom, ${ANATOMY_CANVAS}, ${ANATOMY_CANVAS_CLEAR})` }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-10"
        style={{ backgroundImage: `linear-gradient(to top, ${ANATOMY_CANVAS}, ${ANATOMY_CANVAS_CLEAR})` }}
      />
    </div>
  );
}
