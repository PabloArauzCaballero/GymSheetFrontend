'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Award, Plus, Search } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { confirm, notify } from '@/shared/notifications';
import {
  MODERATION_STATE_LABEL,
  moderationStates,
  routinesReppService,
  type AdminRoutine,
  type RoutineModerationState,
} from '@/features/routines-repp/services/routines-repp-service';
import { CreateOfficialDialog, reppListKey } from './create-official-dialog';
import { OfficialRoutineRow } from './official-routine-row';
import { RoutineInsightsDialog } from './routine-insights-dialog';

type OfficialFilter = 'todas' | 'oficiales' | 'socios';

/**
 * El catálogo de la plataforma: qué es oficial y qué no.
 *
 * Sólo `SYSTEM_ADMIN` llega aquí (lo decide el layout de `/sistema` y, de
 * verdad, el backend con `OFFICIAL_FORBIDDEN`). Sin esta pantalla, la única
 * manera de publicar una rutina oficial sería tocar la base a mano.
 */
export function RoutinesReppAdmin() {
  const [search, setSearch] = useState('');
  const [official, setOfficial] = useState<OfficialFilter>('todas');
  const [moderation, setModeration] = useState<RoutineModerationState | ''>('');
  const [creating, setCreating] = useState(false);
  const [insightsOf, setInsightsOf] = useState<AdminRoutine | null>(null);
  const deferredSearch = useDeferredValue(search.trim());
  const queryClient = useQueryClient();

  const filters = {
    ...(official === 'todas' ? {} : { oficial: official === 'oficiales' }),
    ...(moderation ? { estadoModeracion: moderation } : {}),
    ...(deferredSearch ? { q: deferredSearch } : {}),
  };

  const list = useInfiniteQuery({
    queryKey: [...reppListKey, filters],
    queryFn: ({ pageParam }) =>
      routinesReppService.list(pageParam ? { ...filters, cursor: pageParam } : filters),
    initialPageParam: '',
    getNextPageParam: (last) => last.siguienteCursor ?? undefined,
  });

  const toggle = useMutation({
    mutationFn: (routine: AdminRoutine) =>
      routine.esOficial
        ? routinesReppService.unmarkOfficial(routine.id)
        : routinesReppService.markOfficial(routine.id),
    onSuccess: async (_result, routine) => {
      await queryClient.invalidateQueries({ queryKey: reppListKey });
      notify.success(
        routine.esOficial ? 'Ya no es una rutina oficial.' : 'Ahora es una rutina oficial.',
      );
    },
    onError: (error: Error) => notify.error(error),
  });

  const askAndToggle = async (routine: AdminRoutine) => {
    const result = await confirm({
      title: routine.esOficial ? '¿Quitar de oficiales?' : '¿Marcar como oficial?',
      message: routine.esOficial
        ? `«${routine.nombre}» dejará de mostrarse como «Recomendada por REPP». Seguirá siendo pública.`
        : `«${routine.nombre}» se mostrará como «Recomendada por REPP» en el catálogo de todos los gimnasios.`,
      confirmLabel: routine.esOficial ? 'Quitar' : 'Marcar como oficial',
      severity: routine.esOficial ? 'danger' : 'info',
    });
    if (result.confirmed) toggle.mutate(routine);
  };

  const rows = list.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        actions={
          <Button onClick={() => setCreating(true)} variant="primary">
            <Plus aria-hidden className="size-4" />
            Crear oficial
          </Button>
        }
        description="Qué rutinas muestra la plataforma como «Recomendada por REPP». Cada cambio queda en la auditoría."
        eyebrow="Plataforma"
        title="Rutinas REPP"
      />

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px_240px]">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <Input
            aria-label="Buscar rutina por nombre"
            className="pl-9"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre…"
            value={search}
          />
        </div>
        <Select
          aria-label="Filtrar por origen"
          onChange={(event) => setOfficial(event.target.value as OfficialFilter)}
          value={official}
        >
          <option value="todas">Todas</option>
          <option value="oficiales">Sólo oficiales</option>
          <option value="socios">Sólo de socios</option>
        </Select>
        <Select
          aria-label="Filtrar por moderación"
          onChange={(event) => setModeration(event.target.value as RoutineModerationState | '')}
          value={moderation}
        >
          <option value="">Cualquier estado</option>
          {moderationStates.map((state) => (
            <option key={state} value={state}>
              {MODERATION_STATE_LABEL[state]}
            </option>
          ))}
        </Select>
      </div>

      {list.isPending ? (
        <div aria-busy="true" className="h-64 animate-pulse rounded-[8px] bg-[var(--surface-low)]" />
      ) : list.isError ? (
        <ErrorPanel message={list.error.message} onRetry={() => void list.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          description="Ninguna rutina coincide con estos filtros. Crea una oficial o cambia la búsqueda."
          icon={<Award className="size-6" />}
          title="No hay rutinas que mostrar"
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul>
              {rows.map((routine) => (
                <OfficialRoutineRow
                  busy={toggle.isPending && toggle.variables?.id === routine.id}
                  key={routine.id}
                  onInsights={() => setInsightsOf(routine)}
                  onToggleOfficial={() => void askAndToggle(routine)}
                  routine={routine}
                />
              ))}
            </ul>
            {list.hasNextPage ? (
              <div className="border-t border-[var(--border-subtle)] p-4">
                <Button
                  loading={list.isFetchingNextPage}
                  onClick={() => void list.fetchNextPage()}
                  variant="secondary"
                >
                  Cargar más
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {creating ? <CreateOfficialDialog onClose={() => setCreating(false)} /> : null}
      {insightsOf ? (
        <RoutineInsightsDialog
          name={insightsOf.nombre}
          onClose={() => setInsightsOf(null)}
          routineId={insightsOf.id}
        />
      ) : null}
    </div>
  );
}
