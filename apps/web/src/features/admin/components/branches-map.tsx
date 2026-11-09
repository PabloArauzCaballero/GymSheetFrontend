'use client';

import { ExternalLink, Maximize2, MapPinOff } from 'lucide-react';
import { useState } from 'react';
import type { Branch } from '@/shared/api/contracts';
import { MarkersMap, type MapMarker } from '@/shared/components/map';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { directionsUrl, formatLatLng, pointOf } from '@/shared/lib/geo';
import { cn } from '@/shared/lib/cn';

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

const filters: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'ACTIVE', label: 'Activas' },
  { value: 'INACTIVE', label: 'Inactivas' },
];

function BranchPopup({ branch }: Readonly<{ branch: Branch }>) {
  const point = pointOf(branch);
  return (
    <div className="grid gap-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">{branch.nombre}</p>
          <p className="text-xs text-[var(--text-muted)]">{branch.codigo}</p>
        </div>
        <Badge tone={branch.estado === 'ACTIVE' ? 'success' : 'neutral'}>
          {branch.estado === 'ACTIVE' ? 'Activa' : 'Inactiva'}
        </Badge>
      </div>
      {branch.direccion ? <p className="text-sm">{branch.direccion}</p> : null}
      <p className="data-value text-xs text-[var(--text-muted)]">
        {point ? formatLatLng(point) : ''} · {branch.zonaHoraria}
      </p>
      {point ? (
        <a
          className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent-ink)] underline"
          href={directionsUrl(point)}
          rel="noreferrer"
          target="_blank"
        >
          Cómo llegar
          <ExternalLink aria-hidden className="size-3.5" />
        </a>
      ) : null}
    </div>
  );
}

/**
 * Mapa interactivo con todas las sedes. Se puede filtrar por estado, elegir una
 * sede desde el mapa o desde la tabla (`selectedId`) y volver a la vista de
 * conjunto. Las sedes sin ubicación se cuentan aparte para que nadie crea que
 * faltan.
 */
export function BranchesMap({
  branches,
  selectedId,
  onSelect,
}: Readonly<{
  branches: Branch[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}>) {
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [fitKey, setFitKey] = useState(0);
  const visible = branches.filter((branch) => filter === 'ALL' || branch.estado === filter);
  const markers: MapMarker[] = visible.flatMap((branch) => {
    const position = pointOf(branch);
    return position
      ? [
          {
            id: branch.id,
            position,
            label: branch.nombre,
            tone: branch.estado === 'ACTIVE' ? ('active' as const) : ('inactive' as const),
            popup: <BranchPopup branch={branch} />,
          },
        ]
      : [];
  });
  const unlocated = branches.filter((branch) => !pointOf(branch)).length;

  return (
    <section aria-label="Mapa de sedes" className="panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filtrar por estado"
        >
          {filters.map((item) => (
            <button
              aria-pressed={filter === item.value}
              className={cn(
                'h-9 rounded-[4px] border px-3 text-sm font-semibold transition-colors',
                filter === item.value
                  ? 'border-[var(--volt)] bg-[var(--volt)] text-[var(--accent-contrast)]'
                  : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]',
              )}
              key={item.value}
              onClick={() => {
                setFilter(item.value);
                onSelect(null);
              }}
              type="button"
            >
              {item.label}
            </button>
          ))}
          <span className="text-sm text-[var(--text-muted)]">
            {markers.length} en el mapa
            {unlocated > 0 ? (
              <>
                {' · '}
                <MapPinOff aria-hidden className="inline size-3.5 align-[-2px]" /> {unlocated} sin
                ubicar
              </>
            ) : null}
          </span>
        </div>
        <Button
          disabled={markers.length === 0}
          onClick={() => {
            onSelect(null);
            setFitKey((value) => value + 1);
          }}
          size="sm"
          variant="ghost"
        >
          <Maximize2 aria-hidden className="size-4" />
          Ver todas
        </Button>
      </div>
      <div className="relative">
        <MarkersMap
          className="h-[26rem] rounded-none border-0"
          fitKey={fitKey}
          markers={markers}
          onSelect={onSelect}
          selectedId={selectedId}
        />
        {markers.length === 0 ? (
          <div className="pointer-events-none absolute inset-x-4 top-4 z-[500] mx-auto max-w-md rounded-[6px] border border-[var(--border)] bg-[var(--surface-lowest)] px-4 py-3 text-center text-sm text-[var(--text-muted)] shadow-[var(--shadow-dialog)]">
            {branches.length === 0
              ? 'Aún no hay sedes. Registra la primera y elige su ubicación en el mapa.'
              : 'Ninguna sede de este filtro tiene ubicación. Usa «Ubicar» en la tabla.'}
          </div>
        ) : null}
      </div>
    </section>
  );
}
