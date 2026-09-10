import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, StatusBar, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import type { GymDirectoryEntry, SwipeDirection } from '@gymsheet/schemas';
import { chatService, discoveryService, profilePhotosService } from '@/api/services';
import { AmbientBackground } from '@/components/ambient';
import { DirectoryCardFace } from '@/components/directory-card';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { useResponsive } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import { BackLink } from '@/components/nav';
import { Button } from '@/components/ui';
import { initialsOf } from '@/lib/format';
import { notify } from '@/notifications';
import { useAuthStore } from '@/state/auth-store';
import {
  colors,
  fontSizes,
  iconSizes,
  maxContentWidth,
  maxWideContentWidth,
  minTouchTarget,
  radii,
  semibold,
  spacing,
} from '@/theme';

/** Cartas por reparto. El backend admite hasta 30; diez llenan una sesión corta. */
const DECK_SIZE = 10;

/** Cuánto hay que arrastrar, en fracción del ancho, para que el swipe cuente. */
const DECISION_RATIO = 0.28;

/** Un lanzamiento rápido decide aunque el dedo no haya llegado al umbral. */
const FLING_VELOCITY = 900;

/** Grados de giro en el borde de la pantalla: inclina, no voltea. */
const MAX_ROTATION_DEG = 12;

const EXIT_MS = 220;
const CARD_SPRING = { damping: 24, stiffness: 260, mass: 0.6, overshootClamping: true } as const;

type Decision = { entry: GymDirectoryEntry; direction: SwipeDirection };

/**
 * El sello que aparece bajo el dedo mientras se arrastra: la decisión se lee
 * antes de soltar, que es lo que separa un gesto que se entiende de uno que se
 * prueba a ver qué pasa.
 *
 * Se anima solo, a partir del mismo desplazamiento que mueve la carta: así el
 * sello no puede desincronizarse de lo que la carta está a punto de hacer.
 */
function DecisionStamp({
  color,
  label,
  side,
  threshold,
  translateX,
}: {
  color: string;
  label: string;
  /** Izquierda es «me interesa» (se arrastra a la derecha) y viceversa. */
  side: 'left' | 'right';
  threshold: number;
  translateX: SharedValue<number>;
}) {
  const sign = side === 'left' ? 1 : -1;
  const animated = useAnimatedStyle(() => ({
    opacity: Math.min(Math.max((sign * translateX.value) / threshold, 0), 1),
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: spacing.lg,
          left: side === 'left' ? spacing.lg : undefined,
          right: side === 'right' ? spacing.lg : undefined,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderRadius: radii.md,
          borderWidth: 3,
          borderColor: color,
          transform: [{ rotate: side === 'left' ? '-12deg' : '12deg' }],
        },
        animated,
      ]}
    >
      <Text style={{ color, fontSize: fontSizes.lg, fontWeight: '700', letterSpacing: 1 }}>
        {label}
      </Text>
    </Animated.View>
  );
}

/** Botón circular de la fila de acciones: el equivalente pulsable del gesto. */
function DeckAction({
  accent,
  disabled = false,
  icon,
  label,
  loading = false,
  onPress,
  size,
}: {
  accent: string;
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  loading?: boolean;
  onPress: () => void;
  size: number;
}) {
  return (
    <PressableScale
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      style={{
        width: size,
        height: size,
        borderRadius: radii.full,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: disabled ? colors.borderSubtle : accent,
        backgroundColor: colors.surfaceLow,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={accent} size="small" />
      ) : (
        <Ionicons color={disabled ? colors.textDisabled : accent} name={icon} size={size * 0.42} />
      )}
    </PressableScale>
  );
}

function Avatar({ name, photoUrl, size }: { name: string; photoUrl: string | null; size: number }) {
  if (photoUrl) {
    return (
      <Image
        contentFit="cover"
        source={{ uri: photoUrl }}
        style={{
          width: size,
          height: size,
          borderRadius: radii.full,
          backgroundColor: colors.surfaceHigh,
          borderWidth: 2,
          borderColor: colors.volt,
        }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radii.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.volt,
      }}
    >
      <Text style={{ color: colors.background, fontSize: fontSizes.lg, fontWeight: '700' }}>
        {initialsOf(name, undefined)}
      </Text>
    </View>
  );
}

/**
 * La celebración del match.
 *
 * Mismo patrón de modal que las hojas de Comunidad y de stories, pero centrado
 * en vez de anclado abajo: esto no es un menú de opciones, es el momento por el
 * que existe la baraja, y merece el centro de la pantalla.
 */
function MatchModal({
  matchedEntry,
  messaging,
  myName,
  myPhotoUrl,
  onClose,
  onMessage,
  reduceMotion,
}: {
  matchedEntry: GymDirectoryEntry | null;
  messaging: boolean;
  myName: string;
  myPhotoUrl: string | null;
  onClose: () => void;
  onMessage: () => void;
  reduceMotion: boolean;
}) {
  return (
    <Modal
      // El fundido es de `Modal`, no de Reanimated, así que no lo apaga nadie
      // por su cuenta: con movimiento reducido aparece sin transición.
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={Boolean(matchedEntry)}
    >
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.lg,
          backgroundColor: 'rgba(0, 0, 0, 0.82)',
        }}
      >
        <View
          accessibilityViewIsModal
          style={{
            width: '100%',
            maxWidth: maxContentWidth,
            alignItems: 'center',
            gap: spacing.lg,
            borderRadius: radii.xl,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            backgroundColor: colors.surfaceLow,
            padding: spacing.lg,
          }}
        >
          <Text
            accessibilityRole="header"
            style={{
              color: colors.volt,
              fontSize: fontSizes['2xl'],
              fontWeight: '700',
              letterSpacing: -0.5,
            }}
          >
            ¡Match!
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, textAlign: 'center' }}>
            {matchedEntry
              ? `A ${matchedEntry.displayName} también le interesa entrenar contigo.`
              : ''}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Avatar name={myName} photoUrl={myPhotoUrl} size={96} />
            <Ionicons color={colors.volt} name="heart" size={iconSizes.xl} />
            <Avatar
              name={matchedEntry?.displayName ?? ''}
              photoUrl={matchedEntry?.photoUrl ?? null}
              size={96}
            />
          </View>

          <View style={{ alignSelf: 'stretch', gap: spacing.sm }}>
            <Button
              icon="chatbubble-outline"
              label="Enviar mensaje"
              loading={messaging}
              onPress={onMessage}
            />
            <Button label="Seguir descubriendo" onPress={onClose} variant="ghost" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * La baraja de descubrimiento: una persona por pantalla, se decide arrastrando.
 *
 * El directorio de Comunidad sirve para recorrer el gimnasio; esto es lo
 * contrario — una sola carta, dos salidas, y la siguiente sólo aparece cuando
 * la anterior se ha resuelto.
 *
 * La baraja vive en estado local además de en la caché: al decidir, la carta
 * sale al momento y la mutación viaja detrás. Invalidar la consulta en cada
 * swipe repartiría de nuevo a media pantalla, y si la petición falla la carta
 * vuelve a su sitio en vez de perderse.
 */
export default function DescubrirScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { wide, width } = useResponsive();
  const reduceMotion = useReducedMotion();
  const principal = useAuthStore((state) => state.principal);

  // Los mismos filtros que quedaron aplicados en Comunidad: llegar a la baraja
  // no debería reabrir un gimnasio que la persona acaba de acotar.
  const params = useLocalSearchParams<{
    objetivo?: string;
    sucursalId?: string;
    genero?: string;
  }>();
  const filters = useMemo(
    () => ({
      objetivo: params.objetivo || undefined,
      sucursalId: params.sucursalId || undefined,
      genero: params.genero || undefined,
      limit: DECK_SIZE,
    }),
    [params.objetivo, params.sucursalId, params.genero],
  );

  const deck = useQuery({
    queryKey: [
      'social',
      'discovery',
      'deck',
      params.objetivo ?? '',
      params.sucursalId ?? '',
      params.genero ?? '',
    ],
    queryFn: () => discoveryService.deck(filters),
    // Una baraja usada no se guarda: al volver a entrar se reparte de nuevo.
    // Con la caché por defecto (30 s) reaparecerían las cartas ya decididas,
    // que el servidor ya no considera candidatas y rechazaría con un conflicto.
    gcTime: 0,
    staleTime: 0,
  });

  const myPhotos = useQuery({
    queryKey: ['profile', 'photos'],
    queryFn: () => profilePhotosService.list(),
    staleTime: 60_000,
  });

  const [cards, setCards] = useState<GymDirectoryEntry[]>([]);
  /** Lo ya decidido, la más reciente primero: es lo que puede deshacerse. */
  const [decided, setDecided] = useState<Decision[]>([]);
  const [matchedEntry, setMatchedEntry] = useState<GymDirectoryEntry | null>(null);

  // Un reparto nuevo reemplaza la baraja entera; lo decidido ya no se puede
  // deshacer contra cartas que ya no están en la mano.
  useEffect(() => {
    if (!deck.data) return;
    setCards(deck.data);
    setDecided([]);
  }, [deck.data]);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const resetCardPosition = useCallback(() => {
    cancelAnimation(translateX);
    cancelAnimation(translateY);
    translateX.value = 0;
    translateY.value = 0;
  }, [translateX, translateY]);

  const swipe = useMutation({
    mutationFn: ({ entry, direction }: Decision) => discoveryService.swipe(entry.userId, direction),
    onSuccess: async (result, variables) => {
      if (result.matched) setMatchedEntry(variables.entry);
      // El directorio y las solicitudes sí cambian con un «me gusta»; la baraja
      // no se invalida a propósito (ver el comentario de la pantalla).
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['social', 'directory'] }),
        queryClient.invalidateQueries({ queryKey: ['social', 'connections'] }),
      ]);
    },
    onError: (error: Error, variables) => {
      notify.error(error.message);
      // La decisión no llegó al servidor: la carta vuelve a la mano en vez de
      // desaparecer sin haber contado.
      setCards((current) => [variables.entry, ...current]);
      setDecided((current) => current.filter((item) => item.entry.userId !== variables.entry.userId));
    },
  });

  const undo = useMutation({
    mutationFn: () => discoveryService.undoSwipe(),
    onSuccess: async (result) => {
      // El backend deshace su último swipe, no uno concreto: se devuelve a la
      // baraja la carta que él nombra, no la que el móvil supone.
      const restored = decided.find((item) => item.entry.userId === result.targetId);
      setDecided((current) => current.filter((item) => item.entry.userId !== result.targetId));
      if (restored) setCards((current) => [restored.entry, ...current]);
      resetCardPosition();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['social', 'directory'] }),
        queryClient.invalidateQueries({ queryKey: ['social', 'connections'] }),
      ]);
      notify.success(result.unmatched ? 'Match deshecho.' : 'Última decisión deshecha.');
    },
    // 409 cuando el match ya tiene mensajes: el backend explica por qué, y esa
    // explicación es mejor que cualquier copia local del motivo.
    onError: (error: Error) => notify.error(error.message),
  });

  const message = useMutation({
    mutationFn: (userId: string) => chatService.startConversation(userId),
    onSuccess: (conversation) => {
      setMatchedEntry(null);
      router.push({ pathname: '/chat/[id]', params: { id: conversation.conversationId } });
    },
    onError: (error: Error) => notify.error(error.message),
  });

  const topCard = cards[0] ?? null;
  const nextCard = cards[1] ?? null;

  /**
   * Cierra una decisión: la carta sale de la mano, entra en el historial y la
   * mutación viaja detrás.
   *
   * Es la única función del proyecto que se llama con `runOnJS`. El gesto vive
   * en el hilo de UI —tiene que seguir al dedo sin pasar por JS— pero decidir
   * un swipe es cambiar estado de React y disparar una petición, y eso sólo
   * puede ocurrir en el hilo de JS. Es el cruce que `runOnJS` existe para
   * resolver; el resto de la app no lo necesita porque ninguna otra animación
   * termina en una mutación.
   */
  const commit = useCallback(
    (direction: SwipeDirection) => {
      const entry = cards[0];
      resetCardPosition();
      if (!entry) return;
      setCards((current) => current.slice(1));
      setDecided((current) => [{ entry, direction }, ...current]);
      swipe.mutate({ entry, direction });
    },
    [cards, resetCardPosition, swipe],
  );

  const threshold = width * DECISION_RATIO;

  /** Salida animada de la carta; con movimiento reducido, corte seco. */
  const flyOut = useCallback(
    (direction: SwipeDirection) => {
      if (reduceMotion) {
        commit(direction);
        return;
      }
      translateX.value = withTiming(
        (direction === 'LIKE' ? 1 : -1) * width * 1.4,
        { duration: EXIT_MS, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(commit)(direction);
        },
      );
    },
    [commit, reduceMotion, translateX, width],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(Boolean(topCard) && !matchedEntry)
        .onBegin(() => {
          cancelAnimation(translateX);
          cancelAnimation(translateY);
        })
        .onUpdate((event) => {
          translateX.value = event.translationX;
          translateY.value = event.translationY;
        })
        .onEnd((event) => {
          const resolved =
            Math.abs(event.translationX) > threshold ||
            Math.abs(event.velocityX) > FLING_VELOCITY;
          if (!resolved) {
            translateX.value = withSpring(0, CARD_SPRING);
            translateY.value = withSpring(0, CARD_SPRING);
            return;
          }
          const direction: SwipeDirection = event.translationX > 0 ? 'LIKE' : 'PASS';
          if (reduceMotion) {
            runOnJS(commit)(direction);
            return;
          }
          translateY.value = withTiming(event.translationY, { duration: EXIT_MS });
          translateX.value = withTiming(
            (direction === 'LIKE' ? 1 : -1) * width * 1.4,
            { duration: EXIT_MS, easing: Easing.out(Easing.cubic) },
            (finished) => {
              if (finished) runOnJS(commit)(direction);
            },
          );
        }),
    [commit, matchedEntry, reduceMotion, threshold, topCard, translateX, translateY, width],
  );

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      // El giro es decoración: acompaña al arrastre, así que desaparece con
      // movimiento reducido aunque la carta siga siguiendo al dedo.
      { rotateZ: reduceMotion ? '0deg' : `${(translateX.value / width) * MAX_ROTATION_DEG}deg` },
    ],
  }));

  const gutter = Math.max(spacing.lg, (width - (wide ? maxWideContentWidth : maxContentWidth)) / 2);
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const actionSize = minTouchTarget + 12;

  // La carta es 4:5, así que en un teléfono bajo la altura manda: a lo ancho de
  // la columna se saldría por abajo y lo recortado sería justo el pie con el
  // nombre y el objetivo. Se mide el hueco real en vez de estimarlo restando
  // cabecera y botones, que es una cuenta que se rompe en cuanto uno cambia.
  const [stageHeight, setStageHeight] = useState(0);
  const columnWidth = width - 2 * gutter - insets.left - insets.right;
  const cardWidth = stageHeight ? Math.min(columnWidth, stageHeight * 0.8) : columnWidth;

  return (
    <>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <AmbientBackground />
        <View
          style={{
            flex: 1,
            gap: spacing.md,
            paddingTop: topInset + spacing.lg,
            paddingBottom: insets.bottom + spacing.md,
            paddingLeft: gutter + insets.left,
            paddingRight: gutter + insets.right,
          }}
        >
          <BackLink label="Comunidad" />
          <View style={{ gap: spacing.xs }}>
            <Text
              accessibilityRole="header"
              style={{
                color: colors.text,
                fontSize: fontSizes.xl,
                fontWeight: semibold,
                letterSpacing: fontSizes.xl * -0.03,
              }}
            >
              Descubrir
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
              Arrastra a la derecha si te interesa entrenar con esa persona, a la izquierda si no.
            </Text>
          </View>

          <View
            onLayout={(event) => setStageHeight(event.nativeEvent.layout.height)}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            {deck.isPending ? (
              <Skeleton height={Math.min(420, cardWidth * 1.25)} />
            ) : deck.isError ? (
              <ErrorState error={deck.error} onRetry={() => void deck.refetch()} />
            ) : topCard ? (
              <View style={{ width: cardWidth, alignSelf: 'center' }}>
                {nextCard ? (
                  // La siguiente asoma detrás, apagada y algo más pequeña: dice
                  // que la baraja continúa sin competir con la carta de arriba.
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      borderRadius: radii.xl,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceLow,
                      opacity: 0.5,
                      transform: [{ scale: 0.94 }, { translateY: 12 }],
                    }}
                  >
                    <DirectoryCardFace entry={nextCard} />
                  </View>
                ) : null}

                <GestureDetector gesture={pan}>
                  <Animated.View
                    accessibilityLabel={`Ficha de ${topCard.displayName}`}
                    style={[
                      {
                        borderRadius: radii.xl,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.surfaceLow,
                      },
                      cardStyle,
                    ]}
                  >
                    <DirectoryCardFace entry={topCard} />
                    <DecisionStamp
                      color={colors.volt}
                      label="ME INTERESA"
                      side="left"
                      threshold={threshold}
                      translateX={translateX}
                    />
                    <DecisionStamp
                      color={colors.danger}
                      label="PASO"
                      side="right"
                      threshold={threshold}
                      translateX={translateX}
                    />
                  </Animated.View>
                </GestureDetector>
              </View>
            ) : (
              <View style={{ gap: spacing.md }}>
                <EmptyState
                  icon="albums-outline"
                  message="Ya viste a todos los socios que encajan con tus filtros. Vuelve más tarde o cámbialos en Comunidad."
                  title="No quedan cartas"
                />
                <Button
                  icon="refresh-outline"
                  label="Buscar más socios"
                  loading={deck.isFetching}
                  onPress={() => void deck.refetch()}
                  variant="ghost"
                />
              </View>
            )}
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.lg,
            }}
          >
            <DeckAction
              accent={colors.danger}
              disabled={!topCard}
              icon="close"
              label={topCard ? `Pasar de ${topCard.displayName}` : 'Pasar'}
              onPress={() => flyOut('PASS')}
              size={actionSize}
            />
            <DeckAction
              accent={colors.textMuted}
              disabled={decided.length === 0}
              icon="arrow-undo-outline"
              label="Deshacer la última decisión"
              loading={undo.isPending}
              onPress={() => undo.mutate()}
              size={minTouchTarget}
            />
            <DeckAction
              accent={colors.volt}
              disabled={!topCard}
              icon="heart"
              label={topCard ? `Me interesa ${topCard.displayName}` : 'Me interesa'}
              onPress={() => flyOut('LIKE')}
              size={actionSize}
            />
          </View>
        </View>
      </View>

      <MatchModal
        matchedEntry={matchedEntry}
        messaging={message.isPending}
        myName={principal?.nombreCompleto ?? ''}
        myPhotoUrl={myPhotos.data?.[0]?.url ?? null}
        onClose={() => setMatchedEntry(null)}
        onMessage={() => {
          if (matchedEntry) message.mutate(matchedEntry.userId);
        }}
        reduceMotion={reduceMotion}
      />
    </>
  );
}
