'use client';

import { onlineManager, useInfiniteQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { ClipboardList, Search, WifiOff } from 'lucide-react';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { SkeletonCardGrid, SkeletonScreen } from '@/shared/components/feedback/skeleton';
import { Button, ButtonLink } from '@/shared/components/ui/button';
import { routineV2Keys } from '@/features/routines-v2/keys';
import { catalogService } from '@/features/routines-v2/services';
import { activeFilterCount, toCatalogQuery, type CatalogState } from '../catalog-state';
import { InvitationCard } from './invitation-card';
import { RoutineCard } from './routine-card';

function emptyCopy(state: CatalogState, filtered: boolean) {
  if (filtered) {
    return {
      title: 'Ninguna rutina coincide',
      description: 'Prueba con otra búsqueda o quita algún filtro para ver más resultados.',
    };
  }
  if (state.tab === 'publicas') {
    return {
      title: 'Aún no hay rutinas públicas',
      description: 'Cuando alguien publique una rutina aparecerá aquí para que la copies.',
    };
  }
  if (state.tab === 'repp') {
    return {
      title: 'Todavía no hay recomendadas',
      description: 'El equipo de REPP publicará aquí sus rutinas oficiales.',
    };
  }
  return state.sub === 'compartidas'
    ? {
        title: 'Nadie te ha compartido una rutina',
        description: 'Cuando alguien te invite a una rutina privada la verás aquí para aceptarla.',
      }
    : {
        title: 'No has creado rutinas',
        description: 'Crea tu primera rutina por pasos y la tendrás aquí.',
      };
}

/** La lista de una pestaña: carga, error, vacío y «Cargar más» por cursor. */
export function CatalogList({
  state,
  onClearFilters,
}: Readonly<{ state: CatalogState; onClearFilters: () => void }>) {
  const query = toCatalogQuery(state);
  const list = useInfiniteQuery({
    queryKey: routineV2Keys.catalog(query),
    queryFn: ({ pageParam }) =>
      catalogService.list({ ...query, ...(pageParam ? { cursor: pageParam } : {}) }),
    initialPageParam: '',
    getNextPageParam: (page) => page.siguienteCursor ?? undefined,
  });
  // Sin red React Query pausa la petición en vez de fallarla, y con la caché fresca ni
  // siquiera la intenta: el estado de la conexión se lee aparte y se dice con claridad.
  const online = useSyncExternalStore(
    (notify) => onlineManager.subscribe(notify),
    () => onlineManager.isOnline(),
    () => true,
  );
  const offline = !online || list.fetchStatus === 'paused';
  if (list.isPending && offline) {
    return (
      <EmptyState
        description="Revisa tu conexión: en cuanto vuelva, cargamos las rutinas."
        icon={<WifiOff className="size-6" />}
        title="Sin conexión"
      />
    );
  }
  if (list.isPending) {
    return (
      <SkeletonScreen label="Cargando rutinas">
        <SkeletonCardGrid count={3} />
      </SkeletonScreen>
    );
  }
  if (list.isError && !list.data) {
    return <ErrorPanel message={list.error.message} onRetry={() => void list.refetch()} />;
  }

  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  // Las invitaciones sin aceptar van primero: son lo que espera una respuesta.
  const pending = items.filter((item) => item.invitacion?.estado === 'PENDING');
  const rest = items.filter((item) => item.invitacion?.estado !== 'PENDING');
  const filtered = activeFilterCount(state) > 0;

  return (
    <div className="grid gap-5">
      {offline && !list.isPending ? (
        <div
          className="flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-[var(--warning-border)] bg-[var(--warning-bg)] px-4 py-3 text-sm text-[var(--warning-text)]"
          role="status"
        >
          <WifiOff aria-hidden className="size-4 shrink-0" />
          <span>Sin conexión. Te mostramos lo último que cargamos.</span>
        </div>
      ) : null}
      {list.isError ? (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--warning-border)] bg-[var(--warning-bg)] px-4 py-3 text-sm text-[var(--warning-text)]"
          role="status"
        >
          <span>No se pudo actualizar. Te mostramos lo último que cargamos.</span>
          <Button onClick={() => void list.refetch()} size="sm" variant="secondary">
            Reintentar
          </Button>
        </div>
      ) : null}
      {items.length === 0 ? (
        <EmptyState
          action={
            filtered ? (
              <Button onClick={onClearFilters} variant="secondary">
                Limpiar filtros
              </Button>
            ) : state.tab === 'mias' && state.sub === 'creadas' ? (
              <ButtonLink href="/routines/new" variant="primary">
                Crear rutina
              </ButtonLink>
            ) : null
          }
          description={emptyCopy(state, filtered).description}
          icon={filtered ? <Search className="size-6" /> : <ClipboardList className="size-6" />}
          title={emptyCopy(state, filtered).title}
        />
      ) : (
        <ul
          aria-label="Rutinas"
          className="stagger grid list-none gap-4 sm:grid-cols-2 xl:grid-cols-3"
          data-testid="routine-list"
        >
          {[...pending, ...rest].map((routine) => (
            <li key={routine.id}>
              {routine.invitacion?.estado === 'PENDING' ? (
                <InvitationCard routine={routine} />
              ) : (
                <RoutineCard routine={routine} showVisibility={state.tab === 'mias'} />
              )}
            </li>
          ))}
        </ul>
      )}
      {list.hasNextPage ? (
        <div className="flex justify-center">
          <Button loading={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()} variant="secondary">
            Cargar más
          </Button>
        </div>
      ) : null}
    </div>
  );
}
