'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { interactionKeys } from '@/features/interactions/services/interactions-service';
import { discoveryService } from '@/features/social/services/discovery-service';
import { directoryKeys } from '@/features/social/services/directory-keys';
import { ApiError } from '@/shared/api/api-error';
import type { GymDirectoryEntry, SwipeDirection, UndoSwipeResult } from '@/shared/api/schemas';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Skeleton, SkeletonScreen } from '@/shared/components/feedback/skeleton';
import { Button } from '@/shared/components/ui/button';
import { notify } from '@/shared/notifications';
import { DirectorySwipeDeck } from './directory-swipe-deck';
import { MatchCelebration } from './match-celebration';
import { MemberDetailSheet } from './member-detail-sheet';

type Decision = { entry: GymDirectoryEntry; direction: SwipeDirection; filterKey: string };
type FilteredEntry = { entry: GymDirectoryEntry; filterKey: string };

/** Cartas por reparto. El backend admite hasta 30; diez llenan una sesión corta. */
const DECK_SIZE = 10;

/**
 * La baraja de descubrimiento, a pantalla completa.
 *
 * El directorio de Comunidad sirve para recorrer el gimnasio; esto es lo
 * contrario — una sola carta, dos salidas, y la siguiente sólo aparece cuando
 * la anterior se ha resuelto. Por eso es un destino propio y no una pestaña:
 * ocupa el ancho entero, como en el móvil, en vez de quedarse en un rectángulo
 * pequeño flotando dentro de una página con cabecera y filtros.
 *
 * La cola visible se mantiene en local para que la tarjeta salga en el mismo
 * fotograma del gesto, pero la verdad está en el servidor: cada decisión es un
 * `POST` y, si falla, la tarjeta vuelve a su sitio en vez de desaparecer en
 * silencio.
 */
export function DescubrirClient({
  genero,
  objetivo,
  sucursalId,
}: Readonly<{ genero: string; objetivo: string; sucursalId: string }>) {
  const queryClient = useQueryClient();
  const [queue, setQueue] = useState<GymDirectoryEntry[]>([]);
  const [history, setHistory] = useState<GymDirectoryEntry[]>([]);
  const [match, setMatch] = useState<FilteredEntry | null>(null);
  const [detail, setDetail] = useState<FilteredEntry | null>(null);

  const filters = useMemo(
    () => ({
      objetivo: objetivo || undefined,
      sucursalId: sucursalId || undefined,
      genero: genero || undefined,
      limit: DECK_SIZE,
    }),
    [genero, objetivo, sucursalId],
  );
  const filterKey = `${objetivo}|${sucursalId}|${genero}`;
  const activeFilterKeyRef = useRef(filterKey);
  useLayoutEffect(() => {
    activeFilterKeyRef.current = filterKey;
  }, [filterKey]);
  const [queueFilterKey, setQueueFilterKey] = useState(filterKey);
  const [historyFilterKey, setHistoryFilterKey] = useState(filterKey);

  const deck = useQuery({
    queryKey: directoryKeys.deck(filterKey),
    queryFn: () => discoveryService.deck(filters),
    // Una baraja usada no se guarda: al volver a entrar se reparte de nuevo.
    // Con la caché por defecto reaparecerían cartas ya decididas, que el
    // servidor no considera candidatas y rechazaría con un conflicto.
    gcTime: 0,
    staleTime: 0,
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
    setQueueFilterKey(filterKey);
    setHistoryFilterKey(filterKey);
  }

  const visibleQueue = queueFilterKey === filterKey ? queue : [];
  const visibleHistory = historyFilterKey === filterKey ? history : [];

  const refreshCounters = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: interactionKeys.counts }),
      queryClient.invalidateQueries({ queryKey: queryKeys.connections }),
      // Actualiza listas y perfiles sin invalidar la baraja activa: sus datos
      // recién recibidos reemplazan la cola local y borrarían el historial
      // necesario para deshacer esta misma decisión.
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === directoryKeys.all[0] && query.queryKey[1] !== 'deck',
      }),
    ]);
  };

  const decide = useMutation({
    mutationFn: ({ entry, direction }: Decision) => discoveryService.swipe(entry.userId, direction),
    onMutate: ({ entry, filterKey: decisionFilterKey }: Decision) => {
      if (decisionFilterKey !== activeFilterKeyRef.current) return;
      setQueue((current) => current.filter((card) => card.userId !== entry.userId));
      setHistory((current) => [entry, ...current]);
    },
    onSuccess: async (result, { entry, filterKey: decisionFilterKey }) => {
      if (decisionFilterKey === activeFilterKeyRef.current && result.matched) {
        setMatch({ entry, filterKey: decisionFilterKey });
      }
      await refreshCounters();
    },
    onError: async (error: Error, { entry, filterKey: decisionFilterKey }) => {
      if (decisionFilterKey !== activeFilterKeyRef.current) {
        if (error instanceof ApiError && error.status === 409) await refreshCounters();
        notify.error(error);
        return;
      }
      if (error instanceof ApiError && error.status === 409) {
        setHistory((current) => current.filter((card) => card.userId !== entry.userId));
        await refreshCounters();
        // El servidor ya registró esta decisión; aquí sí se debe reconciliar
        // la baraja de forma explícita después de quitar la carta del historial.
        await deck.refetch();
        notify.error(error);
        return;
      }
      // Si el servidor no registró la decisión, la tarjeta no puede quedarse
      // descartada en pantalla: vuelve al frente de la cola.
      setQueue((current) =>
        current.some((card) => card.userId === entry.userId) ? current : [entry, ...current],
      );
      setHistory((current) => current.filter((card) => card.userId !== entry.userId));
      setQueueFilterKey(decisionFilterKey);
      setHistoryFilterKey(decisionFilterKey);
      notify.error(error);
    },
  });

  const undo = useMutation<UndoSwipeResult, Error, { filterKey: string }>({
    mutationFn: () => discoveryService.undoSwipe(),
    onSuccess: async (result, { filterKey: undoFilterKey }) => {
      if (undoFilterKey !== activeFilterKeyRef.current) {
        setHistory((current) => current.filter((card) => card.userId !== result.targetId));
        await refreshCounters();
        return;
      }
      // El backend deshace *su* último swipe, no uno concreto: se devuelve a la
      // baraja la carta que él nombra, no la que el navegador supone.
      const restored = visibleHistory.find((card) => card.userId === result.targetId);
      setHistory((current) => current.filter((card) => card.userId !== result.targetId));
      if (restored) setQueue((current) => [restored, ...current]);
      else await deck.refetch();
      await refreshCounters();
      notify.success(result.unmatched ? 'Match deshecho.' : 'Última decisión deshecha.');
    },
    // 409 cuando el match ya tiene mensajes: el backend explica por qué, y esa
    // explicación es mejor que cualquier copia local del motivo.
    onError: (error: Error) => notify.error(error),
  });

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <header className="grid gap-2">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
          href="/comunidad"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Comunidad
        </Link>
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">Descubrir</h1>
        {/* Una línea, no dos: cada renglón de aquí arriba se lo quita a la
            carta, que es lo único que la pantalla necesita enseñar. */}
        <p className="text-sm text-[var(--text-muted)]">
          Arrastra a la derecha si te interesa, a la izquierda si no.
        </p>
      </header>

      <DeckSurface
        deckError={deck.isError ? deck.error.message : null}
        empty={visibleQueue.length === 0}
        emptyAction={
          <div className="flex flex-wrap justify-center gap-2">
            {visibleHistory.length > 0 ? (
              <Button loading={undo.isPending} onClick={() => undo.mutate({ filterKey })} variant="secondary">
                Deshacer la última
              </Button>
            ) : null}
            <Button loading={deck.isFetching} onClick={() => deck.refetch()} variant="primary">
              Buscar más socios
            </Button>
          </div>
        }
        loading={deck.isLoading}
        onRefetch={() => deck.refetch()}
      >
        <DirectorySwipeDeck
          canUndo={visibleHistory.length > 0}
          decidePending={decide.isPending}
          entries={visibleQueue}
          onDecide={(entry, direction) => decide.mutate({ entry, direction, filterKey })}
          onInfo={(entry) => setDetail({ entry, filterKey })}
          onUndo={() => undo.mutate({ filterKey })}
          undoPending={undo.isPending}
        />
      </DeckSurface>

      <MemberDetailSheet entry={detail?.filterKey === filterKey ? detail.entry : null} onClose={() => setDetail(null)} />
      <MatchCelebration
        match={match?.filterKey === filterKey ? match.entry : null}
        onClose={() => setMatch(null)}
      />
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
        <Skeleton className="h-[28rem] w-full max-w-md rounded-[var(--radius-xl)] sm:h-[34rem]" />
        <div className="flex gap-4">
          <Skeleton className="size-16 rounded-full" />
          <Skeleton className="size-12 rounded-full" />
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
        description="No hay personas que coincidan con estos filtros por ahora. Cámbialos en Comunidad o vuelve más tarde."
        title="No quedan cartas"
      />
    );
  }
  return <>{children}</>;
}
