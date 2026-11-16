'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { chatService } from '@/features/chat/services/chat-service';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { interactionKeys } from '@/features/interactions/services/interactions-service';
import { discoveryService } from '@/features/social/services/discovery-service';
import { socialService } from '@/features/social/services/social-service';
import { directoryKeys } from '@/features/social/services/directory-keys';
import { discoveryDeckGate, needsDiscoveryPreferences } from '@gymsheet/domain';
import { ApiError } from '@/shared/api/api-error';
import type { GymDirectoryEntry, SwipeDirection, UndoSwipeResult } from '@/shared/api/schemas';
import { queryKeys } from '@/shared/api/query-keys';
import { Button } from '@/shared/components/ui/button';
import { notify } from '@/shared/notifications';
import { DeckSurface } from './deck-surface';
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
  embedded = false,
  onChangeFilters,
}: Readonly<{
  /** Opens the search preferences (Comunidad owns that dialog); offered when the deck runs out. */
  onChangeFilters?: () => void;
  genero: string;
  objetivo: string;
  sucursalId: string;
  /** Dentro de Comunidad (como en el móvil): sin cabecera propia ni «volver». */
  embedded?: boolean;
}>) {
  const queryClient = useQueryClient();
  const router = useRouter();
  // El rayo de la botonera: chat directo con la persona de arriba, como en el móvil.
  const message = useMutation({
    mutationFn: (entry: GymDirectoryEntry) => chatService.startConversation(entry.userId),
    onSuccess: (conversation) => router.push(`/chat/${conversation.conversationId}`),
    onError: (error: Error) => notify.error(error),
  });
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

  // The deck is only asked for once the preferences read says they exist: without them the server
  // answers 400 (DISCOVERY_PREFERENCES_REQUIRED), and the setup form is shown from this read instead.
  const preferences = useQuery({ queryKey: ['social', 'discovery-preferences'], queryFn: socialService.getDiscoveryPreferences });
  const gate = discoveryDeckGate(preferences);
  const deck = useQuery({
    queryKey: directoryKeys.deck(filterKey),
    queryFn: () => discoveryService.deck(filters),
    enabled: gate === 'deck',
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
    mutationFn: async ({ entry, direction }: Decision) => {
      if (entry.impressionId) await discoveryService.observeImpression(entry.impressionId);
      return discoveryService.swipe(entry.userId, direction, entry.impressionId);
    },
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
    // Embedded, it is the flexible part of Comunidad's column (the deck fills what the header leaves).
    <div className={embedded ? 'flex min-h-0 w-full flex-1 flex-col' : 'mx-auto grid w-full max-w-2xl gap-6'}>
      {embedded ? null : (
      <header className="grid gap-2">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
          href="/comunidad"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Comunidad
        </Link>
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">Descubrir</h1>
        {/* Same copy as the app; `text-pretty` keeps a wrap from leaving one lone word. */}
        <p className="text-pretty text-sm text-[var(--text-muted)]">
          Desliza: derecha si te interesa, izquierda si no. Tu decisión se guarda.
        </p>
      </header>
      )}

      <DeckSurface
        deckError={deck.isError ? deck.error.message : null}
        needsPreferences={gate === 'setup' || (deck.isError && needsDiscoveryPreferences(deck.error))}
        empty={visibleQueue.length === 0}
        emptyAction={
          // The app's three actions, same words and order, one column of equal-width buttons.
          <div className="mx-auto grid w-full max-w-xs gap-3">
            <Button loading={deck.isFetching} onClick={() => deck.refetch()} variant="primary">
              Explorar de nuevo
            </Button>
            {onChangeFilters ? (
              <Button onClick={onChangeFilters} variant="secondary">
                Cambiar filtros
              </Button>
            ) : null}
            {visibleHistory.length > 0 ? (
              <Button
                loading={undo.isPending}
                onClick={() => undo.mutate({ filterKey })}
                variant="secondary"
              >
                Deshacer la última
              </Button>
            ) : null}
          </div>
        }
        loading={gate === 'pending' || deck.isLoading}
        onRefetch={() => deck.refetch()}
      >
        <DirectorySwipeDeck
          canUndo={visibleHistory.length > 0}
          decidePending={decide.isPending}
          entries={visibleQueue}
          onDecide={(entry, direction) => decide.mutate({ entry, direction, filterKey })}
          onInfo={(entry) => setDetail({ entry, filterKey })}
          onMessage={(entry) => message.mutate(entry)}
          messagePending={message.isPending}
          onUndo={() => undo.mutate({ filterKey })}
          fill={embedded}
          showHint={embedded}
          undoPending={undo.isPending}
        />
      </DeckSurface>

      <MemberDetailSheet
        entry={detail?.filterKey === filterKey ? detail.entry : null}
        onClose={() => setDetail(null)}
      />
      <MatchCelebration
        match={match?.filterKey === filterKey ? match.entry : null}
        onClose={() => setMatch(null)}
      />
    </div>
  );
}
