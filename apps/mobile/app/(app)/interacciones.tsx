import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import type {
  DiscoveryPassEntry,
  LikeReceived,
  LikeSent,
  ProfileViewer,
} from '@gymsheet/schemas';
import {
  chatService,
  interactionsService,
  profileViewsService,
  socialService,
} from '@/api/services';
import { ScreenHeader } from '@/components/layout';
import { BackLink } from '@/components/nav';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { LikeReceivedCard, LikeSentCard } from '@/components/interactions-cards';
import { INTERACTION_COUNTS_KEY, useInteractionCounts } from '@/components/interactions-counts';
import {
  PassReceivedRow,
  PassSentRow,
  ProfileViewerRow,
  relativeMoment,
} from '@/components/interactions-rows';
import {
  GRID_SKELETON_HEIGHT,
  GridCell,
  InteractionsList,
  LoadingMoreFooter,
  ROW_SKELETON_HEIGHT,
  Segmented,
  TabNotice,
} from '@/components/interactions-shell';
import { notify } from '@/notifications';
import { spacing } from '@/theme';

/**
 * Interacciones: quién te dio like, quién vio tu perfil y quién te descartó.
 *
 * Tres pestañas y no tres pantallas porque las tres responden a la misma
 * pregunta —«¿qué ha pasado conmigo en el gimnasio?»— y separarlas obligaría a
 * volver atrás para comparar. La entrada está en la cabecera de Comunidad,
 * junto a los mensajes: son las dos bandejas de entrada de la parte social.
 */
type MainTab = 'likes' | 'visitas' | 'nexts';
type Direction = 'received' | 'sent';

const LIKES_RECEIVED_KEY = ['interactions', 'likes', 'received'] as const;
const LIKES_SENT_KEY = ['interactions', 'likes', 'sent'] as const;
const PASSES_RECEIVED_KEY = ['interactions', 'passes', 'received'] as const;
const PASSES_SENT_KEY = ['interactions', 'passes', 'sent'] as const;
const PROFILE_VIEWS_KEY = ['interactions', 'profile-views'] as const;

/** Las tres claves que toda decisión sobre una conexión deja desactualizadas. */
const SOCIAL_KEYS = [
  ['social', 'connections'],
  ['social', 'directory'],
  INTERACTION_COUNTS_KEY,
] as const;

/** La baraja de Descubrir: sólo la toca deshacer un descarte. */
const DECK_KEY = ['social', 'discovery', 'deck'] as const;

/**
 * Techo de las cuatro listas de interacciones.
 *
 * No se pagina: son listas que se resuelven —se acepta, se retira, se
 * devuelve— y no crecen sin fin como el historial de visitas.
 *
 * Cincuenta, y no un número redondo elegido aquí, porque es el tope que el
 * backend valida con Zod (`interactionListQuerySchema`, `max(50)`). Pedir 60
 * no devolvía 60: devolvía **400 en las cuatro listas**, y la pantalla se
 * quedaba con el contador cargado sobre cuatro listas rotas. El número lo
 * manda el contrato, no el cliente.
 */
const LIST_LIMIT = 50;

/** Tamaño de página del historial de visitas, que sí es potencialmente largo. */
const VIEWS_PAGE_SIZE = 25;

/** Dos esqueletos en fila: la rejilla reserva el sitio que va a ocupar. */
function GridSkeleton() {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md }}>
      <View style={{ flex: 1 }}>
        <Skeleton height={GRID_SKELETON_HEIGHT} />
      </View>
      <View style={{ flex: 1 }}>
        <Skeleton height={GRID_SKELETON_HEIGHT} />
      </View>
    </View>
  );
}

function RowsSkeleton() {
  return (
    <View style={{ gap: spacing.md }}>
      <Skeleton height={ROW_SKELETON_HEIGHT} />
      <Skeleton height={ROW_SKELETON_HEIGHT} />
      <Skeleton height={ROW_SKELETON_HEIGHT} />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* R3 — Te gustan                                                             */
/* -------------------------------------------------------------------------- */

function LikesTab({ header }: { header: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [direction, setDirection] = useState<Direction>('received');
  /**
   * A quién acabamos de conectar, confirmado por el servidor.
   *
   * Vive en estado local y no en la caché porque es un momento, no un dato: la
   * tarjeta celebra hasta que se pulsa «Listo», y entonces desaparece. Nunca se
   * marca antes de que la mutación responda — celebrar un match que el backend
   * todavía no ha concedido sería inventarse el resultado.
   */
  const [matchedIds, setMatchedIds] = useState<string[]>([]);

  /**
   * Los números del selector salen de los contadores compartidos, no de pedir
   * las dos listas de golpe. La consulta ya está en caché —la barra de
   * pestañas la mantiene viva— así que «Enviados (4)» se lee antes de entrar
   * en esa sub-pestaña, sin una petición extra. En cuanto la lista está
   * cargada manda su longitud, que es la verdad local mientras una
   * actualización optimista viaja hacia el servidor.
   */
  const counts = useInteractionCounts();

  const received = useQuery({
    queryKey: LIKES_RECEIVED_KEY,
    queryFn: () => interactionsService.likesReceived(LIST_LIMIT),
  });
  const sent = useQuery({
    queryKey: LIKES_SENT_KEY,
    queryFn: () => interactionsService.likesSent(LIST_LIMIT),
    // Sólo se pide cuando se mira: entrar en la pantalla no debe costar dos
    // peticiones cuando la mitad de la gente nunca cambia de sub-pestaña.
    enabled: direction === 'sent',
  });

  async function invalidateSocial(): Promise<void> {
    await Promise.all(SOCIAL_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  }

  const respond = useMutation({
    mutationFn: (vars: { connectionId: string; userId: string; action: 'ACCEPT' | 'REJECT' }) =>
      socialService.respondConnection(vars.connectionId, vars.action),
    /**
     * Optimista, con el matiz de que las dos salidas no son la misma:
     * rechazar saca la ficha de la lista, y aceptar la deja en su sitio con la
     * conexión ya marcada, porque es ahí donde va a aparecer la celebración.
     * Sacarla también al aceptar dejaría el «¡Conectados!» sin tarjeta debajo.
     */
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: LIKES_RECEIVED_KEY });
      const previous = queryClient.getQueryData<LikeReceived[]>(LIKES_RECEIVED_KEY);
      queryClient.setQueryData<LikeReceived[]>(LIKES_RECEIVED_KEY, (current) => {
        const list = current ?? [];
        if (vars.action === 'REJECT') {
          return list.filter((entry) => entry.connectionId !== vars.connectionId);
        }
        return list.map((entry) =>
          entry.connectionId === vars.connectionId
            ? { ...entry, connectionStatus: 'ACCEPTED' as const }
            : entry,
        );
      });
      return { previous };
    },
    onError: (error, _vars, context) => {
      // Vuelta atrás exacta y el mensaje que dio el backend, resuelto por el
      // motor de notificaciones. Nada de «no se pudo completar la acción».
      if (context) queryClient.setQueryData(LIKES_RECEIVED_KEY, context.previous);
      notify.error(error);
    },
    onSuccess: (connection, vars) => {
      if (vars.action === 'REJECT') {
        notify.success('Like descartado.');
        return;
      }
      if (connection.status === 'ACCEPTED') {
        setMatchedIds((ids) => (ids.includes(vars.userId) ? ids : [...ids, vars.userId]));
      }
    },
    onSettled: () => {
      void invalidateSocial();
    },
  });

  const withdraw = useMutation({
    mutationFn: (connectionId: string) => socialService.withdrawConnection(connectionId),
    onMutate: async (connectionId) => {
      await queryClient.cancelQueries({ queryKey: LIKES_SENT_KEY });
      const previous = queryClient.getQueryData<LikeSent[]>(LIKES_SENT_KEY);
      queryClient.setQueryData<LikeSent[]>(LIKES_SENT_KEY, (current) =>
        (current ?? []).filter((entry) => entry.connectionId !== connectionId),
      );
      return { previous };
    },
    onError: (error, _connectionId, context) => {
      if (context) queryClient.setQueryData(LIKES_SENT_KEY, context.previous);
      notify.error(error);
    },
    onSuccess: () => notify.success('Like retirado.'),
    onSettled: () => {
      void invalidateSocial();
    },
  });

  const openChat = useMutation({
    mutationFn: (userId: string) => chatService.startConversation(userId),
    onSuccess: (conversation) =>
      router.push({ pathname: '/chat/[id]', params: { id: conversation.conversationId } }),
    onError: (error: Error) => notify.error(error),
  });

  function openProfile(entry: LikeReceived | LikeSent): void {
    router.push({ pathname: '/perfil/[userId]', params: { userId: entry.userId } });
  }

  /** Cerrar la celebración: la ficha ya no está pendiente, así que se relee. */
  function dismissMatch(userId: string): void {
    setMatchedIds((ids) => ids.filter((id) => id !== userId));
    void queryClient.invalidateQueries({ queryKey: LIKES_RECEIVED_KEY });
  }

  const active = direction === 'received' ? received : sent;
  const items: (LikeReceived | LikeSent)[] = active.data ?? [];

  const empty = active.isPending ? (
    <GridSkeleton />
  ) : active.isError ? (
    // Un fallo de red no puede leerse como «no te ha dado like nadie»: son dos
    // hechos distintos y uno de ellos se arregla reintentando.
    <ErrorState error={active.error} onRetry={() => void active.refetch()} />
  ) : direction === 'received' ? (
    <EmptyState
      icon="heart-outline"
      message="Cuando alguien te dé like desde Descubrir, aparecerá aquí para que decidas."
      title="Todavía nadie"
    />
  ) : (
    <EmptyState
      icon="paper-plane-outline"
      message="Entra en Descubrir y desliza a la derecha a quien te interese; tus likes pendientes se listan aquí."
      title="No has dado ningún like"
    />
  );

  return (
    <InteractionsList<LikeReceived | LikeSent>
      data={items}
      empty={empty}
      header={
        <>
          {header}
          <Segmented
            onChange={setDirection}
            options={[
              {
                value: 'received',
                label: 'Recibidos',
                count: received.data?.length ?? counts.data?.likesReceived,
              },
              { value: 'sent', label: 'Enviados', count: sent.data?.length ?? counts.data?.likesSent },
            ]}
            value={direction}
          />
        </>
      }
      keyExtractor={(entry) => entry.userId}
      listKey={`likes-${direction}`}
      numColumns={2}
      onRefresh={() => void active.refetch()}
      refreshing={active.isFetching}
      renderItem={(entry, index) => (
        <GridCell filler={index === items.length - 1 && items.length % 2 === 1}>
          {direction === 'received' ? (
            <LikeReceivedCard
              accepting={
                respond.isPending &&
                respond.variables?.connectionId === entry.connectionId &&
                respond.variables.action === 'ACCEPT'
              }
              entry={entry}
              index={index}
              matched={matchedIds.includes(entry.userId)}
              onAccept={() =>
                respond.mutate({
                  action: 'ACCEPT',
                  connectionId: entry.connectionId,
                  userId: entry.userId,
                })
              }
              onDismissMatch={() => dismissMatch(entry.userId)}
              onOpenChat={() => openChat.mutate(entry.userId)}
              onOpenProfile={() => openProfile(entry)}
              onReject={() =>
                respond.mutate({
                  action: 'REJECT',
                  connectionId: entry.connectionId,
                  userId: entry.userId,
                })
              }
              openingChat={openChat.isPending && openChat.variables === entry.userId}
              rejecting={
                respond.isPending &&
                respond.variables?.connectionId === entry.connectionId &&
                respond.variables.action === 'REJECT'
              }
              timeLabel={relativeMoment(entry.likedAt)}
            />
          ) : (
            <LikeSentCard
              entry={entry}
              index={index}
              onOpenProfile={() => openProfile(entry)}
              onWithdraw={() => withdraw.mutate(entry.connectionId)}
              timeLabel={relativeMoment(entry.likedAt)}
              withdrawing={withdraw.isPending && withdraw.variables === entry.connectionId}
            />
          )}
        </GridCell>
      )}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* R4 — Visitas                                                               */
/* -------------------------------------------------------------------------- */

function VisitasTab({ header }: { header: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  /**
   * Paginación por cursor.
   *
   * El servidor devuelve `nextCursor`, que es exactamente el `pageParam` de la
   * página siguiente, y `null` cuando ya no quedan. `getNextPageParam`
   * devuelve ese valor tal cual: TanStack Query entiende `null` como «no hay
   * más» y apaga `hasNextPage` solo, sin que haya que llevar la cuenta aquí.
   *
   * Cursor y no desplazamiento porque la lista crece por delante: con `OFFSET`,
   * una visita nueva mientras se pagina desplaza todo y la segunda página
   * repite filas de la primera.
   */
  const viewers = useInfiniteQuery({
    queryKey: PROFILE_VIEWS_KEY,
    queryFn: ({ pageParam }) =>
      profileViewsService.list({ limit: VIEWS_PAGE_SIZE, cursor: pageParam ?? undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const rows: ProfileViewer[] = useMemo(
    () => viewers.data?.pages.flatMap((page) => page.viewers) ?? [],
    [viewers.data],
  );

  /**
   * «Revisado», una sola vez por visita a la pestaña.
   *
   * Tres decisiones, y ninguna es casual:
   *
   * 1. La referencia es lo que garantiza el «una sola vez». El efecto se
   *    ejecuta en cada cambio de `isSuccess`, y en desarrollo React monta,
   *    desmonta y vuelve a montar; sin la marca, la primera entrada mandaba
   *    dos peticiones.
   * 2. Se manda **después** de que llegue la primera página, no al montar. El
   *    servidor calcula `isNew` comparando con la última revisión: marcar
   *    antes de leer haría que ninguna fila llegara marcada como nueva y la
   *    etiqueta no apareciera nunca.
   * 3. Sólo se invalidan los contadores. La lista no: sus puntos de «nuevo»
   *    tienen que seguir viéndose durante esta visita — son la razón de haber
   *    entrado. Se apagarán la próxima vez, que es cuando ya se han visto.
   *
   * El componente se monta al elegir la pestaña y se desmonta al salir de
   * ella, así que «una vez por montaje» y «una vez por visita» son lo mismo.
   */
  const markedRef = useRef(false);
  useEffect(() => {
    if (markedRef.current || !viewers.isSuccess) return;
    markedRef.current = true;
    let cancelled = false;
    profileViewsService
      .markChecked()
      .then(() => {
        if (!cancelled) void queryClient.invalidateQueries({ queryKey: INTERACTION_COUNTS_KEY });
      })
      .catch(() => {
        // Marcar como revisado es tarea de fondo: si falla, el badge sigue
        // encendido y se reintentará en la próxima visita. Interrumpir la
        // lectura con un error por esto sería ruido sobre algo que el usuario
        // no ha pedido y no puede arreglar.
        markedRef.current = false;
      });
    return () => {
      cancelled = true;
    };
  }, [queryClient, viewers.isSuccess]);

  const empty = viewers.isPending ? (
    <RowsSkeleton />
  ) : viewers.isError ? (
    <ErrorState error={viewers.error} onRetry={() => void viewers.refetch()} />
  ) : (
    <EmptyState
      icon="eye-outline"
      message="Cuando alguien abra tu perfil aparecerá aquí. Añadir fotos y un objetivo hace que te encuentren antes."
      title="Nadie ha visto tu perfil"
    />
  );

  return (
    <InteractionsList<ProfileViewer>
      data={rows}
      empty={empty}
      footer={<LoadingMoreFooter visible={viewers.isFetchingNextPage} />}
      header={header}
      keyExtractor={(viewer) => viewer.userId}
      listKey="visitas"
      onEndReached={() => {
        if (viewers.hasNextPage && !viewers.isFetchingNextPage) void viewers.fetchNextPage();
      }}
      onRefresh={() => void viewers.refetch()}
      // `isFetching` incluye la página siguiente, y eso encendía la rueda de
      // «tirar para refrescar» cada vez que el scroll llegaba al final.
      refreshing={viewers.isRefetching}
      renderItem={(viewer) => (
        <ProfileViewerRow
          onPress={() => router.push({ pathname: '/perfil/[userId]', params: { userId: viewer.userId } })}
          viewer={viewer}
        />
      )}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* R5 — Nexts                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * La nota de privacidad, en la cabecera y no escondida en un ajuste.
 *
 * Es el único sitio de la app donde se enseña algo que en cualquier otra red
 * es secreto, y quien lo lee tiene derecho a saber por qué lo está viendo.
 * Dos frases: qué es distinto aquí y de quién fue la decisión.
 */
const PRIVACY_NOTE =
  'Esto no suele ser recíproco: quien te descartó no ve que tú lo sabes, y a quien descartaste tampoco se le avisa. Se muestra porque tu gimnasio pidió que fuera visible.';

function NextsTab({ header }: { header: ReactNode }) {
  const queryClient = useQueryClient();
  const [direction, setDirection] = useState<Direction>('received');
  // Misma razón que en «Te gustan»: el número del selector sale de la caché
  // compartida hasta que la lista correspondiente se haya cargado.
  const counts = useInteractionCounts();

  const receivedPasses = useQuery({
    queryKey: PASSES_RECEIVED_KEY,
    queryFn: () => interactionsService.passesReceived(LIST_LIMIT),
  });
  const sentPasses = useQuery({
    queryKey: PASSES_SENT_KEY,
    queryFn: () => interactionsService.passesSent(LIST_LIMIT),
    enabled: direction === 'sent',
  });

  const undoPass = useMutation({
    mutationFn: (userId: string) => interactionsService.undoPass(userId),
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: PASSES_SENT_KEY });
      const previous = queryClient.getQueryData<DiscoveryPassEntry[]>(PASSES_SENT_KEY);
      queryClient.setQueryData<DiscoveryPassEntry[]>(PASSES_SENT_KEY, (current) =>
        (current ?? []).filter((entry) => entry.userId !== userId),
      );
      return { previous };
    },
    onError: (error, _userId, context) => {
      if (context) queryClient.setQueryData(PASSES_SENT_KEY, context.previous);
      notify.error(error);
    },
    onSuccess: () => notify.success('Vuelve a estar en la baraja.'),
    onSettled: () => {
      void Promise.all([
        // La baraja tiene que volver a repartirse: esa persona ha dejado de
        // estar descartada y el servidor ya la considera candidata otra vez.
        queryClient.invalidateQueries({ queryKey: DECK_KEY }),
        queryClient.invalidateQueries({ queryKey: INTERACTION_COUNTS_KEY }),
      ]);
    },
  });

  const active = direction === 'received' ? receivedPasses : sentPasses;
  const items: DiscoveryPassEntry[] = active.data ?? [];

  const empty = active.isPending ? (
    <RowsSkeleton />
  ) : active.isError ? (
    <ErrorState error={active.error} onRetry={() => void active.refetch()} />
  ) : direction === 'received' ? (
    <EmptyState
      icon="people-outline"
      message="De momento nadie ha pasado de tu ficha en Descubrir."
      title="Nadie te ha descartado"
    />
  ) : (
    <EmptyState
      icon="arrow-undo-outline"
      message="Cuando pases de alguien en Descubrir aparecerá aquí, por si cambias de idea."
      title="No has descartado a nadie"
    />
  );

  return (
    <InteractionsList<DiscoveryPassEntry>
      data={items}
      empty={empty}
      header={
        <>
          {header}
          <TabNotice text={PRIVACY_NOTE} />
          <Segmented
            onChange={setDirection}
            options={[
              {
                value: 'received',
                label: 'Me descartaron',
                count: receivedPasses.data?.length ?? counts.data?.passesReceived,
              },
              {
                value: 'sent',
                label: 'Descarté',
                count: sentPasses.data?.length ?? counts.data?.passesSent,
              },
            ]}
            value={direction}
          />
        </>
      }
      keyExtractor={(entry) => entry.userId}
      listKey={`nexts-${direction}`}
      onRefresh={() => void active.refetch()}
      refreshing={active.isFetching}
      renderItem={(entry, index) =>
        direction === 'received' ? (
          <PassReceivedRow entry={entry} index={index} />
        ) : (
          <PassSentRow
            entry={entry}
            index={index}
            onUndo={() => undoPass.mutate(entry.userId)}
            undoing={undoPass.isPending && undoPass.variables === entry.userId}
          />
        )
      }
    />
  );
}

/* -------------------------------------------------------------------------- */

export default function InteraccionesScreen() {
  const [tab, setTab] = useState<MainTab>('likes');
  // Se consulta aquí aunque la cabecera no pinte números: entrar en esta
  // pantalla es el momento en que el badge de Comunidad y el de la barra de
  // pestañas deben estar al día, y comparten esta misma clave y su caché.
  useInteractionCounts();

  /**
   * La cabecera es la misma en las tres pestañas y viaja hacia abajo como
   * `ListHeaderComponent` de cada lista. Está escrita una vez aquí y no tres
   * veces en cada pestaña porque, si no, cambiar el título obligaría a
   * acordarse de tres sitios — que es como acaban desalineadas.
   *
   * Sin contadores en este selector, a propósito: tres etiquetas más tres
   * números no caben a lo ancho de un teléfono y «Te gust…» acabaría también
   * en el árbol de accesibilidad. Los números viven en los selectores de dos
   * opciones de cada pestaña, donde sobra sitio.
   */
  const header = (
    <>
      <BackLink />
      <ScreenHeader
        subtitle="Quién te dio like, quién vio tu perfil y quién pasó de largo."
        title="Interacciones"
      />
      <Segmented
        onChange={setTab}
        options={[
          { value: 'likes', label: 'Te gustan' },
          { value: 'visitas', label: 'Visitas' },
          { value: 'nexts', label: 'Nexts' },
        ]}
        value={tab}
      />
    </>
  );

  // Cada pestaña se monta y se desmonta al cambiar. Es lo que hace que «entrar
  // en Visitas» sea un montaje, y por tanto que el aviso de «revisado» se
  // mande una vez por visita en lugar de una vez por sesión.
  if (tab === 'visitas') return <VisitasTab header={header} />;
  if (tab === 'nexts') return <NextsTab header={header} />;
  return <LikesTab header={header} />;
}
