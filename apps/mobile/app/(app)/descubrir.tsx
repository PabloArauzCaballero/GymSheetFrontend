import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
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
import {
  DirectoryCardFace,
  INFO_BUTTON_INSET,
  INFO_BUTTON_SIZE,
} from '@/components/directory-card';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { useResponsive } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import { BackLink } from '@/components/nav';
import { ProfileDetailSheet } from '@/components/profile-detail-sheet';
import { Button } from '@/components/ui';
import { initialsOf } from '@/lib/format';
import { notify } from '@/notifications';
import { useAuthStore } from '@/state/auth-store';
import {
  accentPolicy,
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

/**
 * La franja izquierda retrocede de foto; el resto avanza.
 *
 * Un tercio y no la mitad porque avanzar es lo que se hace nueve de cada diez
 * veces: partir la tarjeta por el medio obliga a apuntar para lo frecuente y
 * regala la mitad de la superficie a lo raro.
 */
const BACK_ZONE_RATIO = 1 / 3;

/** Un toque que dura más que esto ya es otra cosa: un arrastre que se arrepintió. */
const TAP_MAX_MS = 260;

/**
 * Dónde empieza el sello, medido desde arriba.
 *
 * Tiene que caer por debajo de las barras del carrusel (8 de margen + 3 de alto)
 * con aire suficiente para que no se lean como un mismo bloque.
 */
const STAMP_TOP = spacing.xl;

/** Diámetro de los dos botones que deciden. */
const DECIDE_SIZE = minTouchTarget + 24;

/** Oscurecido del fondo del match: la foto tiene que quedar como ambiente, no como sujeto. */
const MATCH_SCRIM = ['rgba(0,0,0,0.62)', 'rgba(0,0,0,0.88)'] as const;

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
          top: STAMP_TOP,
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
      <Text style={{ color, fontSize: fontSizes.xl, fontWeight: '700', letterSpacing: 1 }}>
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
          borderColor: accentPolicy.ink,
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
 * La celebración del match, a pantalla completa.
 *
 * Era una tarjeta centrada sobre un velo negro, es decir, el mismo objeto que
 * usa la app para preguntar si quieres borrar algo. Esto no es un diálogo: es
 * el único momento en que la baraja devuelve algo, y ocupar la pantalla entera
 * —con la foto de la otra persona detrás, desenfocada, sosteniendo el
 * ambiente— es lo que lo distingue de un aviso.
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
  const insets = useSafeAreaInsets();

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
        accessibilityViewIsModal
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        {matchedEntry?.photoUrl ? (
          <Image
            // Desenfocada y oscurecida: la foto está aquí para dar contexto y
            // color, no para volver a mirarse — eso ya se hizo en la carta.
            blurRadius={40}
            contentFit="cover"
            source={{ uri: matchedEntry.photoUrl }}
            style={StyleSheet.absoluteFill}
            transition={200}
          />
        ) : null}
        <LinearGradient colors={MATCH_SCRIM} style={StyleSheet.absoluteFill} />

        <View
          style={{
            flex: 1,
            alignItems: 'center',
            paddingTop: insets.top + spacing.xl,
            paddingBottom: insets.bottom + spacing.lg,
            paddingHorizontal: spacing.lg,
          }}
        >
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.xl,
            }}
          >
            <View style={{ alignItems: 'center', gap: spacing.sm }}>
              <Text
                accessibilityRole="header"
                style={{
                  color: accentPolicy.ink,
                  fontSize: fontSizes.display,
                  fontWeight: '700',
                  letterSpacing: fontSizes.display * -0.03,
                }}
              >
                ¡Match!
              </Text>
              <Text
                style={{
                  color: '#fff',
                  fontSize: fontSizes.md,
                  lineHeight: 22,
                  textAlign: 'center',
                }}
              >
                {matchedEntry
                  ? `A ${matchedEntry.displayName} también le interesa entrenar contigo.`
                  : ''}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Avatar name={myName} photoUrl={myPhotoUrl} size={112} />
              <Ionicons color={accentPolicy.ink} name="heart" size={iconSizes.xl} />
              <Avatar
                name={matchedEntry?.displayName ?? ''}
                photoUrl={matchedEntry?.photoUrl ?? null}
                size={112}
              />
            </View>
          </View>

          <View style={{ alignSelf: 'stretch', maxWidth: maxContentWidth, gap: spacing.sm }}>
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
  const [detailEntry, setDetailEntry] = useState<GymDirectoryEntry | null>(null);
  /**
   * La foto visible, atada a la carta de la que es.
   *
   * Un `number` suelto obliga a resetearlo en un efecto, y un efecto corre
   * **después** del pintado: como la pantalla no se desmonta entre cartas,
   * quedaba un fotograma con la carta nueva y el índice de la anterior —alguien
   * con cinco fotos en la cuarta, se desliza, el siguiente tiene tres y se
   * pinta la barra 3 encendida un instante antes de saltar a la 1—. Guardando
   * el identificador junto al índice, la foto visible se **deriva** en el
   * render y el fotograma intermedio no llega a existir.
   */
  const [photoCursor, setPhotoCursor] = useState<{ cardId: string | null; index: number }>({
    cardId: null,
    index: 0,
  });
  /** Medida real de la carta: es el marco de referencia de los toques. */
  const [stage, setStage] = useState({ width: 0, height: 0 });

  /**
   * Sólo se acepta un reparto cuando alguien lo ha pedido.
   *
   * El efecto de abajo se disparaba con cada `deck.data` nuevo, y la consulta
   * corre sin caché bajo un cliente con `refetchOnReconnect`: recuperar la red
   * a mitad de sesión sustituía la mano entera. Con esta bandera, un refetch de
   * fondo actualiza la caché y no toca lo que la persona tiene delante; el
   * reparto se renueva al montar, al cambiar los filtros y cuando se pulsa
   * «Buscar más socios» o se reintenta tras un error.
   */
  const acceptDealRef = useRef(true);

  /** Estable entre renders, a diferencia del objeto de la consulta. */
  const refetchDeck = deck.refetch;

  /** Identidad del reparto: si cambia, la mano que hay delante ya no vale. */
  const deckKey = `${params.objetivo ?? ''}|${params.sucursalId ?? ''}|${params.genero ?? ''}`;

  useEffect(() => {
    acceptDealRef.current = true;
  }, [deckKey]);

  useEffect(() => {
    if (!deck.data) return;
    if (!acceptDealRef.current) return;
    acceptDealRef.current = false;
    setCards(deck.data);
    // `decided` **no** se vacía aquí. El backend deshace su último swipe mire
    // la app la baraja que mire, así que borrar el historial local sólo logra
    // dejar «Deshacer» apagado sobre una decisión que el servidor aún acepta.
    // Lo que se deshace vuelve al frente de la mano actual, que es lo que la
    // persona está mirando.
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
  const topCardId = topCard?.userId ?? null;
  const photoCount = topCard ? Math.max(topCard.photos.length, topCard.photoUrl ? 1 : 0) : 0;

  /**
   * Cada carta empieza por su portada: heredar la foto cuarta de la anterior
   * haría que la baraja se abriera por la mitad de la historia de otra persona.
   *
   * Se resuelve en el render y no en un efecto —ver `photoCursor`—: si el
   * cursor guardado no es de esta carta, la foto visible es la portada ya en el
   * primer pintado de la carta nueva.
   */
  const photoIndex = photoCursor.cardId === topCardId ? photoCursor.index : 0;

  const stepPhoto = useCallback(
    (delta: number) => {
      setPhotoCursor((current) => {
        const base = current.cardId === topCardId ? current.index : 0;
        const next = base + delta;
        // En la última foto, el toque derecho no hace nada: volver al principio
        // sin avisar se lee como si la carta hubiera cambiado de persona.
        if (next < 0 || next >= photoCount) return current;
        return { cardId: topCardId, index: next };
      });
    },
    [photoCount, topCardId],
  );

  const openDetail = useCallback(() => {
    setDetailEntry(cards[0] ?? null);
  }, [cards]);

  /**
   * Pedir una baraja nueva a propósito.
   *
   * Es lo que distingue este caso de un refetch de fondo: aquí la persona ha
   * pulsado algo, así que el siguiente reparto sí sustituye la mano.
   */
  const redeal = useCallback(() => {
    acceptDealRef.current = true;
    void refetchDeck();
  }, [refetchDeck]);

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
      // El pulso confirma lo que ya dice la pantalla, así que acompaña al mismo
      // ajuste que apaga el resto del movimiento: quien pide una interfaz más
      // quieta no está pidiendo que el teléfono le conteste a golpes.
      if (!reduceMotion) {
        void Haptics.impactAsync(
          direction === 'LIKE'
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light,
        );
      }
      setCards((current) => current.slice(1));
      setDecided((current) => [{ entry, direction }, ...current]);
      swipe.mutate({ entry, direction });
    },
    [cards, reduceMotion, resetCardPosition, swipe],
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

  /**
   * El toque que recorre las fotos y abre la ficha: aquí, y en ningún otro
   * sitio.
   *
   * El toque de la esquina y el toque del carrusel son el mismo evento, y dos
   * manejadores peleándose por él dan el fallo de las copias mal hechas —a
   * veces pasa de foto, a veces abre la ficha, a veces las dos—. Hasta hace
   * poco la carta tenía además un `Pressable` en esa esquina, es decir,
   * exactamente los dos manejadores que este comentario decía evitar: un
   * responder de React Native dentro de un `GestureDetector`, donde quién gana
   * al apoyar el dedo y arrastrar lo deciden la plataforma y la versión de la
   * librería de gestos, no el código. Ese `Pressable` ya no está.
   *
   * Así que el reparto es de este gesto y sólo de él, comparando la posición
   * del dedo con el rectángulo que la propia tarjeta publica en
   * `INFO_BUTTON_*`. El lector de pantalla no entra por aquí: la carta expone
   * la esquina como elemento accesible con acción `activate`, y las acciones de
   * accesibilidad no viajan por el sistema de toques.
   */
  const tap = useMemo(
    () =>
      Gesture.Tap()
        .enabled(Boolean(topCard) && !matchedEntry)
        .maxDuration(TAP_MAX_MS)
        .onEnd((event, success) => {
          if (!success) return;
          // Sin medida no hay marco de referencia. Con `{0, 0}` la prueba de la
          // esquina se reduce a `x >= -60 && y >= -60`, o sea, cualquier toque
          // abriría la ficha. En la práctica la medida llega antes de que nadie
          // pueda tocar, pero eso es una carrera ganada por costumbre, no una
          // garantía: mientras no haya `onLayout`, el toque no decide nada.
          if (stage.width <= 0 || stage.height <= 0) return;
          const insideInfo =
            event.x >= stage.width - INFO_BUTTON_INSET - INFO_BUTTON_SIZE &&
            event.y >= stage.height - INFO_BUTTON_INSET - INFO_BUTTON_SIZE;
          if (insideInfo) {
            runOnJS(openDetail)();
            return;
          }
          if (photoCount < 2) return;
          runOnJS(stepPhoto)(event.x < stage.width * BACK_ZONE_RATIO ? -1 : 1);
        }),
    [matchedEntry, openDetail, photoCount, stage.height, stage.width, stepPhoto, topCard],
  );

  /**
   * El arrastre manda y el toque sólo existe si el arrastre no llegó a
   * activarse. `Exclusive` da prioridad al primero, que es exactamente lo que
   * hace falta: mover el dedo un centímetro es arrastrar, no tocar.
   */
  const deckGesture = useMemo(() => Gesture.Exclusive(pan, tap), [pan, tap]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      // El giro es decoración: acompaña al arrastre, así que desaparece con
      // movimiento reducido aunque la carta siga siguiendo al dedo.
      { rotateZ: reduceMotion ? '0deg' : `${(translateX.value / width) * MAX_ROTATION_DEG}deg` },
    ],
  }));

  /**
   * La carta de atrás se revela conforme la de arriba se va.
   *
   * Fija, era un adorno; ligada al arrastre, es lo que convierte dos rectángulos
   * apilados en un mazo: la de abajo crece y se aclara a medida que deja de
   * estar tapada, igual que una carta física al levantarse la de encima.
   */
  const nextCardStyle = useAnimatedStyle(() => {
    const progress = Math.min(Math.abs(translateX.value) / threshold, 1);
    const reveal = reduceMotion ? 0 : progress;
    return {
      opacity: 0.5 + reveal * 0.5,
      transform: [{ scale: 0.94 + reveal * 0.06 }, { translateY: 12 - reveal * 12 }],
    };
  });

  const gutter = Math.max(spacing.lg, (width - (wide ? maxWideContentWidth : maxContentWidth)) / 2);
  /**
   * El margen de la baraja es el mínimo que deja ver que hay un fondo detrás.
   *
   * La carta es el objeto de esta pantalla: con la columna de lectura del resto
   * de la app se quedaba en un rectángulo pequeño flotando en el centro, que es
   * lo contrario de lo que pide una baraja.
   */
  const deckGutter = Math.max(
    spacing.sm,
    (width - (wide ? maxWideContentWidth : maxContentWidth)) / 2,
  );
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);

  return (
    <>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <AmbientBackground />
        <View
          style={{
            flex: 1,
            gap: spacing.md,
            paddingTop: topInset + spacing.md,
            paddingBottom: insets.bottom + spacing.md,
          }}
        >
          <View
            style={{
              gap: spacing.xs,
              paddingLeft: gutter + insets.left,
              paddingRight: gutter + insets.right,
            }}
          >
            <BackLink label="Comunidad" />
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
            {/* Una línea, no dos: cada renglón de aquí arriba se lo quita a la
                carta, que es lo único que la pantalla necesita enseñar. */}
            <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
              Arrastra a la derecha si te interesa, a la izquierda si no.
            </Text>
          </View>

          <View
            onLayout={(event) => {
              const { height, width: measured } = event.nativeEvent.layout;
              setStage((current) =>
                current.width === measured && current.height === height
                  ? current
                  : { width: measured, height },
              );
            }}
            style={{
              flex: 1,
              justifyContent: 'center',
              marginLeft: deckGutter + insets.left,
              marginRight: deckGutter + insets.right,
            }}
          >
            {deck.isPending ? (
              <Skeleton height={stage.height || 420} />
            ) : deck.isError ? (
              <ErrorState error={deck.error} onRetry={redeal} />
            ) : topCard ? (
              <>
                {nextCard ? (
                  // La siguiente asoma detrás, apagada y algo más pequeña: dice
                  // que la baraja continúa sin competir con la carta de arriba.
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      {
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        borderRadius: radii.xl,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.surfaceLow,
                      },
                      nextCardStyle,
                    ]}
                  >
                    <DirectoryCardFace entry={nextCard} fill />
                  </Animated.View>
                ) : null}

                <GestureDetector gesture={deckGesture}>
                  {/*
                    Esta capa no lleva nombre accesible, y es a propósito.
                    Tenía un `accessibilityLabel` sin `accessible` ni rol: en
                    React Native eso no convierte la vista en elemento
                    accesible, así que era un nombre que no anunciaba nadie.
                    Y ponerle `accessible` tampoco vale: agruparía la carta
                    entera en un solo elemento y se llevaría por delante las
                    acciones de galería y el acceso a la ficha, que son los dos
                    únicos caminos que un lector de pantalla tiene aquí. La
                    carta se anuncia por sus hijos —nombre, edad, barras de
                    foto, esquina de información—, que sí son accesibles.
                  */}
                  <Animated.View
                    style={[
                      {
                        flex: 1,
                        borderRadius: radii.xl,
                        backgroundColor: colors.surfaceLow,
                        // La sombra va en esta capa y el recorte en la de
                        // dentro: `overflow: 'hidden'` y `shadow*` en la misma
                        // vista se anulan en iOS —la máscara que recorta a los
                        // hijos recorta también la sombra— y lo que queda es
                        // una carta pegada al fondo.
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 12 },
                        shadowOpacity: 0.45,
                        shadowRadius: 24,
                        elevation: 12,
                      },
                      cardStyle,
                    ]}
                  >
                    <View
                      style={{
                        flex: 1,
                        borderRadius: radii.xl,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <DirectoryCardFace
                        entry={topCard}
                        fill
                        onInfoPress={openDetail}
                        onStepPhoto={stepPhoto}
                        photoIndex={photoIndex}
                      />
                    </View>
                    <DecisionStamp
                      // El sello es línea de 3 pt y glifo sobre una foto, no un
                      // relleno: por la política de `theme/index.ts` le toca
                      // `accentPolicy.ink`, igual que al botón de «me interesa».
                      // Como texto grande en negrita el acento crudo pasaba el
                      // umbral, pero el mismo significado pintado de dos colores
                      // distintos —volt en el sello, ink en el botón— es el
                      // detalle que delata un sistema que no existe.
                      color={accentPolicy.ink}
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
              </>
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
                  onPress={redeal}
                  variant="ghost"
                />
              </View>
            )}
          </View>

          {/* Tres botones y no cinco: no hay «super like» ni «boost» en el
              backend, y un botón que no hace nada cuesta más confianza de la
              que gana en parecido. Los dos que deciden son mayores que el que
              corrige, porque esa es la jerarquía real de la pantalla. */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.xl,
              paddingLeft: gutter + insets.left,
              paddingRight: gutter + insets.right,
            }}
          >
            <DeckAction
              accent={colors.danger}
              disabled={!topCard}
              icon="close"
              label={topCard ? `Pasar de ${topCard.displayName}` : 'Pasar'}
              onPress={() => flyOut('PASS')}
              size={DECIDE_SIZE}
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
              // `colors.volt` es el acento **como relleno**. Aquí se usa como
              // borde de 1 pt y como glifo sobre `colors.surfaceLow`, que es
              // casi negro: eso es tinta sobre superficie oscura, y la política
              // de `theme/index.ts` reserva para ese caso `accentPolicy.ink`.
              accent={accentPolicy.ink}
              disabled={!topCard}
              icon="heart"
              label={topCard ? `Me interesa ${topCard.displayName}` : 'Me interesa'}
              onPress={() => flyOut('LIKE')}
              size={DECIDE_SIZE}
            />
          </View>
        </View>
      </View>

      <ProfileDetailSheet entry={detailEntry} onClose={() => setDetailEntry(null)} />

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
