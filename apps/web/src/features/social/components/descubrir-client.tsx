'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { interactionKeys } from '@/features/interactions/services/interactions-service';
import { discoveryService } from '@/features/social/services/discovery-service';
import { directoryKeys } from '@/features/social/services/directory-keys';
import type { GymDirectoryEntry, SwipeDirection } from '@/shared/api/schemas';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Skeleton, SkeletonScreen } from '@/shared/components/feedback/skeleton';
import { Button } from '@/shared/components/ui/button';
import { notify } from '@/shared/notifications';
import { DirectorySwipeDeck } from './directory-swipe-deck';
import { MatchCelebration } from './match-celebration';
import { MemberDetailSheet } from './member-detail-sheet';

type Decision = { entry: GymDirectoryEntry; direction: SwipeDirection };

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
  const [match, setMatch] = useState<GymDirectoryEntry | null>(null);
  const [detail, setDetail] = useState<GymDirectoryEntry | null>(null);

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
  }

  const refreshCounters = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: interactionKeys.counts }),
      queryClient.invalidateQueries({ queryKey: queryKeys.connections }),
      // El directorio cuenta lo mismo que la baraja: un «me interesa» cambia el
      // estado de conexión de esa persona también ahí.
      queryClient.invalidateQueries({ queryKey: directoryKeys.all }),
    ]);
  };

  const decide = useMutation({
    mutationFn: ({ entry, direction }: Decision) => discoveryService.swipe(entry.userId, direction),
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
      // El backend deshace *su* último swipe, no uno concreto: se devuelve a la
      // baraja la carta que él nombra, no la que el navegador supone.
      const restored = history.find((card) => card.userId === result.targetId);
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
        empty={queue.length === 0}
        emptyAction={
          <div className="flex flex-wrap justify-center gap-2">
            {history.length > 0 ? (
              <Button loading={undo.isPending} onClick={() => undo.mutate()} variant="secondary">
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
          canUndo={history.length > 0}
          decidePending={decide.isPending}
          entries={queue}
          onDecide={(entry, direction) => decide.mutate({ entry, direction })}
          onInfo={setDetail}
          onUndo={() => undo.mutate()}
          undoPending={undo.isPending}
        />
      </DeckSurface>

      <MemberDetailSheet entry={detail} onClose={() => setDetail(null)} />
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
        description="Ya decidiste sobre todo el mundo que encaja con estos filtros. Cámbialos en Comunidad o vuelve más tarde."
        title="No quedan cartas"
      />
    );
  }
  return <>{children}</>;
}
