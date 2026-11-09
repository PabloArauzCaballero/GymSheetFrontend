'use client';

import dynamic from 'next/dynamic';
import { cn } from '@/shared/lib/cn';

export type { MapMarker } from './leaflet-canvas';

/**
 * Leaflet toca `window` al importarse, así que el lienzo solo se carga en el
 * navegador. Mientras llega, se reserva el mismo hueco para que la página no
 * salte al aparecer el mapa.
 */
function MapSkeleton({ className }: Readonly<{ className?: string }>) {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando mapa"
      className={cn('map-frame grid place-items-center', className)}
      role="status"
    >
      <span className="text-sm text-[var(--text-muted)]">Cargando mapa…</span>
    </div>
  );
}

export const MarkersMap = dynamic(
  () => import('./leaflet-canvas').then((module) => module.MarkersMapCanvas),
  { ssr: false, loading: () => <MapSkeleton className="h-[26rem]" /> },
);

export const PickerMap = dynamic(
  () => import('./leaflet-canvas').then((module) => module.PickerMapCanvas),
  { ssr: false, loading: () => <MapSkeleton className="h-72" /> },
);
