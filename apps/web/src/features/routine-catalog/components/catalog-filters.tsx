'use client';

import { SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import { GOAL_LABELS } from '@gymsheet/hooks';
import { routineCatalogOrders, trainingGoals, type RoutineCatalogOrder } from '@gymsheet/types';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { activeFilterCount, type CatalogState } from '../catalog-state';

const ORDER_LABELS: Record<RoutineCatalogOrder, string> = {
  populares: 'Populares',
  recientes: 'Recientes',
  valoradas: 'Mejor valoradas',
};

/**
 * Buscador y filtros del catálogo (RF-01). El buscador siempre está a la vista;
 * el resto se pliega en pantallas estrechas para que la lista no quede enterrada.
 */
export function CatalogFilters({
  state,
  searchText,
  onSearchText,
  onChange,
  onClear,
}: Readonly<{
  state: CatalogState;
  searchText: string;
  onSearchText: (value: string) => void;
  onChange: (patch: Partial<CatalogState>) => void;
  onClear: () => void;
}>) {
  const [open, setOpen] = useState(false);
  const count = activeFilterCount(state);
  const publicTab = state.tab === 'publicas';
  const showAdvanced = state.tab !== 'mias' || state.sub === 'creadas';
  return (
    <section aria-label="Buscar y filtrar rutinas" className="grid gap-3">
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <Field label="Buscar rutinas">
            <Input
              onChange={(event) => onSearchText(event.target.value)}
              placeholder="Nombre de la rutina"
              type="search"
              value={searchText}
            />
          </Field>
        </div>
        {showAdvanced ? (
          <Button
            aria-controls="catalog-advanced-filters"
            aria-expanded={open}
            className="mt-[1.65rem] shrink-0 sm:hidden"
            onClick={() => setOpen((current) => !current)}
            variant="secondary"
          >
            <SlidersHorizontal aria-hidden className="size-4" />
            Filtros{count > 0 ? ` (${count})` : ''}
          </Button>
        ) : null}
      </div>
      {showAdvanced ? (
        <div
          className={`${open ? 'grid' : 'hidden'} items-end gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4`}
          id="catalog-advanced-filters"
        >
          <Field label="Objetivo">
            <Select
              onChange={(event) =>
                onChange({ objetivo: (event.target.value || null) as CatalogState['objetivo'] })
              }
              value={state.objetivo ?? ''}
            >
              <option value="">Todos</option>
              {trainingGoals.map((goal) => (
                <option key={goal} value={goal}>
                  {GOAL_LABELS[goal]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Días por semana">
            <Select
              onChange={(event) => onChange({ dias: event.target.value ? Number(event.target.value) : null })}
              value={state.dias ?? ''}
            >
              <option value="">Cualquiera</option>
              {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                <option key={days} value={days}>
                  {days} {days === 1 ? 'día' : 'días'}
                </option>
              ))}
            </Select>
          </Field>
          {publicTab ? (
            <Field label="Ordenar por">
              <Select
                onChange={(event) => onChange({ orden: event.target.value as RoutineCatalogOrder })}
                value={state.orden}
              >
                {routineCatalogOrders.map((order) => (
                  <option key={order} value={order}>
                    {ORDER_LABELS[order]}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          {publicTab ? (
            <div className="flex min-h-11 items-center">
              <Checkbox
                checked={state.gym}
                label="De mi gimnasio"
                onChange={(event) => onChange({ gym: event.target.checked })}
              />
            </div>
          ) : null}
        </div>
      ) : null}
      {count > 0 ? (
        <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
          <span>
            {count} {count === 1 ? 'filtro activo' : 'filtros activos'}
          </span>
          <Button onClick={onClear} size="sm" variant="ghost">
            <X aria-hidden className="size-4" />
            Limpiar filtros
          </Button>
        </div>
      ) : null}
    </section>
  );
}
