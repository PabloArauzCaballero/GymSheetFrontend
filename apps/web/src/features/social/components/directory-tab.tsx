'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { interactionKeys } from '@/features/interactions/services/interactions-service';
import { publicFacilitiesClient } from '@/features/public-facilities/services/public-facilities-client';
import { discoveryService } from '@/features/social/services/discovery-service';
import type { GymDirectoryEntry, SwipeDirection } from '@/shared/api/schemas';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Skeleton, SkeletonScreen } from '@/shared/components/feedback/skeleton';
import { Button } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { Select } from '@/shared/components/ui/select';
import { notify } from '@/shared/notifications';
import { DirectorySwipeDeck } from './directory-swipe-deck';
import { trainingGoalLabels } from './directory-labels';
import { MatchCelebration } from './match-celebration';

type Decision = { entry: GymDirectoryEntry; direction: SwipeDirection };

/**
 * Contenedor de la baraja.
 *
 * La cola visible se mantiene en local para que la tarjeta salga en el mismo
 * fotograma del gesto, pero la verdad está en el servidor: cada decisión es un
 * `POST` y, si falla, la tarjeta vuelve a su sitio en vez de desaparecer en
 * silencio. Antes esta pestaña pedía el directorio entero y filtraba en
 * cliente; ahora pide `/me/discovery/deck`, que ya excluye a quien se decidió.
 */
export function DirectoryTab() {
  const queryClient = useQueryClient();
  const [objetivo, setObjetivo] = useState('');
  const [sucursalId, setSucursalId] = useState('');
  const [queue, setQueue] = useState<GymDirectoryEntry[]>([]);
  const [history, setHistory] = useState<GymDirectoryEntry[]>([]);
  const [match, setMatch] = useState<GymDirectoryEntry | null>(null);

  const filters = useMemo(
    () => ({ objetivo: objetivo || undefined, sucursalId: sucursalId || undefined, limit: 20 }),
    [objetivo, sucursalId],
  );
  const filterKey = `${objetivo}|${sucursalId}`;

  // Las sedes del gimnasio propio, no el directorio público de marcas.
  //
  // Antes alimentaba este selector con `/public/facilities/branches`, que lista
  // sedes de **todas** las marcas. Como el directorio de socios está acotado al
  // gimnasio de quien mira, elegir cualquiera de las ajenas devolvía cero
  // resultados siempre, sin decir por qué. Contra la base de desarrollo son
  // nueve sedes públicas frente a una propia: ocho opciones muertas de nueve.
  const branches = useQuery({
    queryKey: ['facilities', 'my-branches'],
    queryFn: () => publicFacilitiesClient.myBranches(),
    staleTime: 5 * 60_000,
  });

  const deck = useQuery({
    queryKey: ['discovery', 'deck', filterKey],
    queryFn: () => discoveryService.deck(filters),
  });

  // Sincroniza la cola con la baraja recién llegada ajustando estado durante el
  // render (patrón admitido por React, el mismo que usa `DomainImage`). Un
  // `useEffect` pintaría un fotograma con la cola anterior justo después de
  // cambiar de filtro, que es cuando más se nota.
  const [syncedDeck, setSyncedDeck] = useState<GymDirectoryEntry[] | null>(null);
  if (deck.data && deck.data !== syncedDeck) {
    setSyncedDeck(deck.data);
    setQueue(deck.data);
    setHistory([]);
  }

  const refreshCounters = async () => {
    await queryClient.invalidateQueries({ queryKey: interactionKeys.counts });
    await queryClient.invalidateQueries({ queryKey: queryKeys.connections });
  };

  const decide = useMutation({
    mutationFn: ({ entry, direction }: Decision) =>
      discoveryService.swipe(entry.userId, direction),
    onMutate: ({ entry }: Decision) => {
      setQueue((current) => current.filter((card) => card.userId !== entry.userId));
      setHistory((current) => [entry, ...current]);
    },
    onSuccess: async (result, { entry }) => {
      if (result.matched) setMatch(entry);
      await refreshCounters();
    },
    onError: (error: Error, { entry }) => {
      // Si el servidor no registró la decisión, la tarjeta no puede quedarse
      // descartada en pantalla: vuelve al frente de la cola.
      setQueue((current) => [entry, ...current]);
      setHistory((current) => current.filter((card) => card.userId !== entry.userId));
      notify.error(error);
    },
  });

  const undo = useMutation({
    mutationFn: () => discoveryService.undoSwipe(),
    onSuccess: async (result) => {
      const restored = history.find((card) => card.userId === result.targetId);
      setHistory((current) => current.filter((card) => card.userId !== result.targetId));
      if (restored) setQueue((current) => [restored, ...current]);
      // El backend puede haber deshecho un swipe de una sesión anterior, del
      // que no tenemos la ficha en memoria: en ese caso se vuelve a pedir.
      else await deck.refetch();
      await refreshCounters();
      notify.success(result.unmatched ? 'Match deshecho.' : 'Última decisión deshecha.');
    },
    onError: (error: Error) => notify.error(error),
  });

  return (
    <div className="grid gap-6">
      <section className="panel grid gap-4 p-4 sm:grid-cols-2">
        <Field htmlFor="directory-objetivo" label="Objetivo">
          <Select
            id="directory-objetivo"
            onChange={(event) => setObjetivo(event.target.value)}
            value={objetivo}
          >
            <option value="">Todos</option>
            {Object.entries(trainingGoalLabels).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field htmlFor="directory-sucursal" label="Sucursal">
          <Select
            id="directory-sucursal"
            onChange={(event) => setSucursalId(event.target.value)}
            value={sucursalId}
          >
            <option value="">Todas</option>
            {(branches.data ?? []).map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.nombre}
              </option>
            ))}
          </Select>
        </Field>
      </section>
      <DeckSurface
        deckError={deck.isError ? deck.error.message : null}
        empty={queue.length === 0}
        emptyAction={
          <div className="flex flex-wrap justify-center gap-2">
            {history.length > 0 ? (
              <Button loading={undo.isPending} onClick={() => undo.mutate()} variant="secondary">
                Deshacer la última
              </Button>
            ) : null}
            <Button loading={deck.isFetching} onClick={() => deck.refetch()} variant="primary">
              Buscar más
            </Button>
          </div>
        }
        loading={deck.isLoading}
        onRefetch={() => deck.refetch()}
      >
        <DirectorySwipeDeck
          canUndo={history.length > 0}
          decidePending={decide.isPending}
          entries={queue}
          onDecide={(entry, direction) => decide.mutate({ entry, direction })}
          onUndo={() => undo.mutate()}
          undoPending={undo.isPending}
        />
      </DeckSurface>
      <MatchCelebration match={match} onClose={() => setMatch(null)} />
    </div>
  );
}

/**
 * Los cuatro estados de la baraja en un solo sitio.
 *
 * Importa distinguir «no hay nadie más» de «no pudimos preguntar»: si la red
 * falla y pintamos el vacío, el usuario concluye que su gimnasio está desierto.
 */
function DeckSurface({
  children,
  deckError,
  empty,
  emptyAction,
  loading,
  onRefetch,
}: Readonly<{
  children: ReactNode;
  deckError: string | null;
  empty: boolean;
  emptyAction: ReactNode;
  loading: boolean;
  onRefetch: () => void;
}>) {
  if (loading) {
    return (
      <SkeletonScreen className="justify-items-center" label="Cargando la baraja">
        <Skeleton className="h-[26rem] w-full max-w-sm rounded-[var(--radius-xl)] sm:h-[30rem]" />
        <div className="flex gap-4">
          <Skeleton className="size-12 rounded-full" />
          <Skeleton className="size-14 rounded-full" />
          <Skeleton className="size-16 rounded-full" />
        </div>
      </SkeletonScreen>
    );
  }
  if (deckError) return <ErrorPanel message={deckError} onRetry={onRefetch} />;
  if (empty) {
    return (
      <EmptyState
        action={emptyAction}
        description="Ya decidiste sobre todo el mundo que encaja con estos filtros. Prueba a ampliarlos o vuelve más tarde."
        title="No queda nadie por descubrir"
      />
    );
  }
  return <>{children}</>;
}
