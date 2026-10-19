import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  AppState,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  StatusBar,
} from 'react-native';
import type { AccessibilityActionEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEventListener } from 'expo';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import type { VideoPlayerStatus } from 'expo-video';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  SlideInDown,
  SlideOutDown,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { StoryFeedEntry } from '@gymsheet/schemas';
import { StoryCaption } from '@/components/story-caption';
import { storiesService } from '@/api/services';
import { DURATION, PREMIUM_EASING, PressableScale } from '@/components/motion';
import { confirmDelete, notify } from '@/notifications';
import { useAuthStore } from '@/state/auth-store';
import { secureStoreAuthStorage } from '@/storage/secure-store';
import { env } from '@/config/env';
import { resolveStoryMediaSource } from '@/components/story-media-source';
import { initialsOf } from '@/lib/format';
import { storyManualPauseAfterAppStateChange } from '@/lib/story-app-state';
import { firstAvailableStoryId, reconcileStoryFeed } from '@/lib/story-feed-reconciliation';
import { adjacentPersonStep, nextStoryStep, previousStoryStep, storiesToPreload } from '@/lib/story-navigation';
import { storyTimeLeftLabel } from '@/lib/story-text';
import { storyViewersPresentation } from '@/components/story-viewers-presentation';
import { requestId } from '@/lib/request-id';
import { alpha, colors, fontSizes, iconSizes, ink, minTouchTarget, onMedia, overlay, radii, semibold, spacing } from '@/theme';

/** Lo que dura una foto en pantalla antes de pasar sola a la siguiente. */
const IMAGE_DURATION_MS = 5000;

/**
 * Lo que dura un vídeo **mientras no se sepa cuánto dura de verdad**.
 *
 * Ya hay reproductor dentro (`expo-video`), así que esto dejó de ser el número
 * que manda: en cuanto el reproductor emite `sourceLoad` con la duración del
 * clip, el tramo de la barra y el temporizador se rehacen contra esa cifra.
 * Este valor sólo cubre la ventana entre abrir la story y tener metadatos, y el
 * caso en que el origen no llegue a decirlas nunca.
 *
 * 15 s y no otro número porque es exactamente el mismo respaldo que usa la web
 * (`apps/web/src/features/stories/components/story-viewer.tsx`): ante un vídeo
 * que no declara duración, las dos plataformas tienen que enseñar el mismo
 * tramo o la barra significará una cosa en el teléfono y otra en el navegador.
 */
const VIDEO_FALLBACK_MS = 15_000;

/** Cuánto dura un tramo: la foto, lo fijo; el vídeo, lo que mida de verdad. */
function segmentDurationMs(mediaType: 'image' | 'video', measuredMs: number | null): number {
  if (mediaType !== 'video') return IMAGE_DURATION_MS;
  return measuredMs ?? VIDEO_FALLBACK_MS;
}

/**
 * Escalones del tramo actual cuando el sistema pide movimiento reducido.
 *
 * Cuatro: 25/50/75/100 %. Saltar directo a lleno —lo que había— quitaba el
 * movimiento y también la información, que no es lo que pide esa preferencia.
 */
const REDUCED_MOTION_STEPS = 4;

/**
 * Nombre de la acción de accesibilidad que pausa y reanuda.
 *
 * Propio y no `'longpress'`: las acciones estándar traen nombre del sistema y
 * pisan la etiqueta que se escriba. Además, tener un nombre propio es lo que
 * permite al manejador comprobar cuál se disparó en vez de pausar ante
 * cualquier acción que se añada mañana.
 */
const PAUSE_ACTION = 'gymsheet.togglePause';

/** Arrastre vertical a partir del cual soltar cierra en vez de volver al sitio. */
const DISMISS_DISTANCE = 140;
/** Un lanzamiento rápido hacia abajo cierra aunque no se llegue a la distancia. */
const DISMISS_VELOCITY = 900;

/** Deslizar en horizontal a partir de esto cambia de persona. */
const PERSON_SWIPE_DISTANCE = 80;
const PERSON_SWIPE_VELOCITY = 800;
/** Cuánto entra de lado la persona nueva: una pista de dirección, no un carrusel. */
const PERSON_ENTER_OFFSET = 48;

/** Reacción rápida: un solo toque, como el corazón de Instagram. */
const QUICK_REACTION = '❤️';

/** Vuelta al sitio: firme, sin rebote — el visor no es un juguete elástico. */
const RETURN_SPRING = { damping: 26, stiffness: 320, mass: 0.6, overshootClamping: true } as const;

/** Alto supuesto de cabecera y pie hasta que `onLayout` los mide de verdad. */
const DEFAULT_HEADER_HEIGHT = 104;
const DEFAULT_FOOTER_HEIGHT = 72;

type SegmentStatus = 'past' | 'current' | 'future';

/**
 * Un tramo de la barra de progreso.
 *
 * Tres estados y no dos: lo ya visto queda lleno, lo que viene queda vacío, y
 * el actual se llena en tiempo real. Sin ese tercero la barra dice cuántas
 * stories hay pero no cuánto falta para la siguiente, que es justo lo que el
 * usuario está esperando saber cuando decide si toca o espera.
 *
 * El relleno se anima en el hilo de UI con un único `withTiming`: nada de un
 * `setState` por fotograma, que a 60 Hz son 300 renders por story.
 */
function ProgressSegment({
  status,
  paused,
  animated,
  durationMs,
  runToken,
  remainingMsRef,
}: {
  status: SegmentStatus;
  paused: boolean;
  animated: boolean;
  durationMs: number;
  runToken: number;
  /** El resto del reloj que manda, el del visor. Aquí sólo se lee. */
  remainingMsRef: { readonly current: number };
}) {
  const progress = useSharedValue(0);
  /** Último `runToken` que este tramo llegó a arrancar: separa «empieza» de «reanuda». */
  const startedRunRef = useRef<number | null>(null);

  // Al convertirse en la actual —o al reiniciarse, que es lo que cuenta
  // `runToken`— empieza de cero. Es un efecto aparte del de abajo a propósito:
  // si el reinicio viviera ahí, cada pausa reiniciaría el tramo en vez de
  // congelarlo. Va declarado antes para que su cuerpo corra primero.
  //
  // `durationMs` también reinicia, y no es un descuido: en un vídeo el tramo
  // empieza dibujándose contra el respaldo y, cuando el reproductor dice la
  // duración real, la regla cambia debajo. Conservar el avance ahí pondría la
  // barra por delante del vídeo —que justo entonces es cuando arranca—, así
  // que lo honesto es volver a empezar con la cifra buena.
  useEffect(() => {
    if (status !== 'current') return;
    progress.value = 0;
    startedRunRef.current = null;
  }, [durationMs, progress, runToken, status]);

  useEffect(() => {
    cancelAnimation(progress);
    if (status === 'past') {
      progress.value = 1;
      return undefined;
    }
    if (status === 'future') {
      progress.value = 0;
      return undefined;
    }
    if (paused) return undefined;

    /*
     * Cuánto queda DE VERDAD.
     *
     * `progress.value` no sirve para calcularlo: leído desde JS devuelve el
     * último valor escrito desde JS —un 0—, no el que la animación lleva en el
     * hilo de UI, porque Reanimated no espeja el valor animado fotograma a
     * fotograma. Con eso, reanudar pedía siempre la duración entera y la barra
     * se separaba del temporizador que de verdad pasa de story.
     *
     * El dueño del reloj es el visor y su resto vive en `remainingMsRef`.
     * `startedRunRef` distingue los dos casos: en una story recién abierta ese
     * resto todavía no se ha repuesto (el efecto del padre que lo repone corre
     * DESPUÉS que éste, porque los efectos del hijo van primero), así que ahí
     * se toma la duración completa; al reanudar una pausa, el resto ya está
     * guardado y es el bueno.
     */
    const fresh = startedRunRef.current !== runToken;
    startedRunRef.current = runToken;
    const remaining = fresh ? durationMs : Math.min(durationMs, Math.max(0, remainingMsRef.current));
    const elapsed = durationMs - remaining;
    const startAt = durationMs > 0 ? elapsed / durationMs : 1;

    if (!animated) {
      // Movimiento reducido: no se anima nada, pero callar tampoco vale — sin
      // avance la barra deja de decir cuánto falta y encima miente diciendo
      // «ya terminó». Escalones fijos: informan sin mover nada de forma
      // continua, que es lo que la preferencia pide evitar.
      const step = 1 / REDUCED_MOTION_STEPS;
      progress.value = Math.floor(startAt / step) * step;
      const timers: ReturnType<typeof setTimeout>[] = [];
      for (let index = 1; index <= REDUCED_MOTION_STEPS; index += 1) {
        const at = durationMs * index * step - elapsed;
        if (at <= 0) continue;
        timers.push(
          setTimeout(() => {
            progress.value = index * step;
          }, at),
        );
      }
      return () => {
        timers.forEach((timer) => clearTimeout(timer));
      };
    }

    // El punto de partida se ESCRIBE, no se lee: así esta orden y la de
    // `cancelAnimation` llegan al hilo de UI en el mismo orden en que están
    // aquí, y la animación arranca desde donde se quedó y no desde donde JS
    // creía que estaba.
    progress.value = startAt;
    progress.value = withTiming(1, { duration: remaining, easing: Easing.linear });
    return undefined;
  }, [animated, durationMs, paused, progress, remainingMsRef, runToken, status]);

  // Escala en vez de ancho: la barra avanza a 60-120 fps durante 15 s y un
  // cambio de ancho forzaría un pase de layout en cada fotograma. Con `scaleX` y
  // `transformOrigin: 'left'` la interpolación ocurre en el compositor de GPU.
  const fill = useAnimatedStyle(() => ({
    transform: [{ scaleX: Math.max(0, Math.min(1, progress.value)) }],
  }));

  return (
    <View
      style={{
        flex: 1,
        height: 3,
        borderRadius: radii.full,
        overflow: 'hidden',
        backgroundColor: overlay.glassStrong,
      }}
    >
      <Animated.View
        style={[
          {
            height: '100%',
            width: '100%',
            transformOrigin: 'left',
            borderRadius: radii.full,
            backgroundColor: ink.white,
          },
          fill,
        ]}
      />
    </View>
  );
}

/**
 * "hace 2 h" — tiempo relativo corto, en español.
 *
 * Vive aquí y no en `lib/format` porque ninguna otra pantalla lo pide todavía y
 * `format` es de otro dueño en este reparto de ficheros. Una story caduca a las
 * 24 h, así que la escala se detiene en días por prudencia, no por necesidad.
 */
function relativeTimeEs(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const minutes = Math.floor(Math.max(0, Date.now() - then) / 60_000);
  if (minutes < 1) return 'hace un momento';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

/**
 * Dónde está el visor: **qué persona y qué story**, por identidad y no por
 * posición.
 *
 * Guardar índices era un error de fondo, no un descuido: `feed` es un array
 * nuevo en cada refresco de `['stories','feed']` y el backend lo ordena «sin
 * ver primero, luego recencia», un orden que cambia *mientras* se miran las
 * stories. Con `refetchOnReconnect` activo bastaba perder la red un segundo
 * para que el índice 2 pasara a ser otra persona: el visor saltaba en silencio
 * y el efecto de «vista» disparaba `POST /view` sobre una story que nadie miró.
 * Un `userId` y un `storyId` no se reordenan.
 *
 * `run` no es información, es un pulso: se incrementa para reiniciar la story
 * actual (retroceder desde la primera del todo) sin cambiar de story, que es
 * algo que la identidad por sí sola no puede expresar.
 */
type Cursor = { userId: string; storyId: string; run: number };

/** Avatar redondo con iniciales de reserva; se repite en cabecera y en la hoja. */
function SmallAvatar({ photoUrl, fullName, size }: { photoUrl: string | null; fullName: string; size: number }) {
  if (photoUrl) {
    return (
      <Image
        cachePolicy="memory-disk"
        contentFit="cover"
        recyclingKey={photoUrl}
        source={{ uri: photoUrl }}
        style={{ width: size, height: size, borderRadius: radii.full, backgroundColor: colors.surfaceHigh }}
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
        backgroundColor: colors.surfaceHigh,
      }}
    >
      <Text style={{ color: colors.text, fontSize: fontSizes.xs, fontWeight: '700' }}>
        {initialsOf(fullName, undefined)}
      </Text>
    </View>
  );
}

/**
 * Hoja de espectadores de una story propia.
 *
 * No es un `Modal` anidado: dentro de otro `Modal`, Android presenta el segundo
 * en una ventana distinta y pierde el `statusBarTranslucent` del primero. Como
 * capa absoluta dentro del visor se comporta igual y se anima con el resto.
 */
function ViewersSheet({
  storyId,
  onClose,
}: {
  storyId: string;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const viewers = useQuery({
    queryKey: ['stories', 'viewers', storyId],
    queryFn: () => storiesService.viewers(storyId),
    staleTime: 15_000,
  });
  const presentation = storyViewersPresentation(viewers.data?.total ?? null);

  return (
    <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', zIndex: 5 }]}>
      <Pressable
        accessibilityLabel="Cerrar"
        accessibilityRole="button"
        onPress={onClose}
        style={[StyleSheet.absoluteFill, { backgroundColor: overlay.scrimSoft }]}
      />
      <Animated.View
        accessibilityViewIsModal
        entering={reduceMotion ? undefined : SlideInDown.duration(280).easing(PREMIUM_EASING)}
        exiting={reduceMotion ? undefined : SlideOutDown.duration(180)}
        style={{
          maxHeight: '62%',
          borderTopLeftRadius: radii.xl,
          borderTopRightRadius: radii.xl,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
          backgroundColor: colors.surfaceLow,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.md,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.sm,
          }}
        >
          <Text
            accessibilityRole="header"
            style={{ flex: 1, color: colors.text, fontSize: fontSizes.lg, fontWeight: '700', letterSpacing: -0.5 }}
          >
            Vistas
          </Text>
          <Pressable
            accessibilityLabel="Cerrar"
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => ({
              width: minTouchTarget,
              height: minTouchTarget,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radii.full,
              backgroundColor: colors.surfaceHigh,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Ionicons color={colors.text} name="close" size={iconSizes.md} />
          </Pressable>
        </View>

        <Text
          style={{ color: colors.textMuted, fontSize: fontSizes.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}
        >
          {presentation.detailLabel}
        </Text>

        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          {viewers.isPending ? (
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Cargando…</Text>
          ) : viewers.isError ? (
            <Text accessibilityRole="alert" style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
              No se pudo cargar quién vio tu story.
            </Text>
          ) : viewers.data.viewers.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{presentation.detailLabel}</Text>
          ) : (
            viewers.data.viewers.map((viewer) => (
              <View key={viewer.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <SmallAvatar fullName={viewer.fullName} photoUrl={viewer.photoUrl} size={40} />
                <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontSize: fontSizes.md }}>
                  {viewer.fullName}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                  {relativeTimeEs(viewer.viewedAt)}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

/**
 * Visor a pantalla completa, con el comportamiento de Instagram.
 *
 * Recibe el **feed entero** y no una sola persona: al acabar la última story de
 * alguien hay que seguir por la siguiente persona, y eso es imposible si el
 * componente sólo conoce a una. El orden es el que llega del backend; aquí no
 * se reordena nada.
 *
 * Se monta sólo mientras está abierto (lo decide `StoriesBar`), de modo que
 * cerrar es desmontar: no queda ningún `setTimeout` avanzando el índice de un
 * componente muerto.
 */
export function StoryViewer({
  feed,
  startUserId,
  onClose,
}: {
  feed: StoryFeedEntry[];
  startUserId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const principal = useAuthStore((state) => state.principal);
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  /**
   * `null` = no se pudo abrir por quien se pidió.
   *
   * Antes esto era `Math.max(0, findIndex(...))`, y ese `Math.max` convertía el
   * -1 de «esa persona no está en el feed» en el índice 0, que es uno mismo:
   * pedir la story de alguien y que se abriera la propia. Un -1 es un error, no
   * un cero; aquí se conserva como tal y el efecto de reconciliación cierra.
   */
  const [cursor, setCursor] = useState<Cursor | null>(() => {
    const entry = feed.find((candidate) => candidate.userId === startUserId);
    const storyId = firstAvailableStoryId(entry);
    if (!entry || !storyId) return null;
    return { userId: entry.userId, storyId, run: 0 };
  });
  const [held, setHeld] = useState(false);
  const [manualPaused, setManualPaused] = useState(false);
  const [dragging, setDragging] = useState(false);
  /**
   * El vídeo entra silenciado, como en la web y como en cualquier visor de
   * stories: quien abre la app en un vagón no ha pedido sonido. El estado vive
   * en el visor y no en el reproductor para que la decisión sobreviva al paso
   * de una story a la siguiente — desmutear una vez es desmutear la sesión.
   */
  const [muted, setMuted] = useState(true);
  const [storyAccess, setStoryAccess] = useState<{ storyId: string; token: string | null } | null>(null);
  /**
   * La duración real del clip, guardada JUNTO A LA STORY que la produjo.
   *
   * Sin el `storyId` al lado, pasar de un vídeo largo a una foto dejaría el
   * número anterior aplicándose un render de más. Mismo patrón que la web.
   */
  const [videoDuration, setVideoDuration] = useState<{ storyId: string; ms: number } | null>(null);
  /**
   * El cierre ya está decidido pero la animación de salida aún corre.
   *
   * `dragging` se apagaba en `onFinalize`, que es inmediato: durante los 200 ms
   * de la salida el reloj se rearmaba con lo que quedara y, si quedaba menos de
   * eso, pasaba de story y disparaba un `POST /view` sobre la siguiente. El
   * usuario había cerrado y se le consumía una story más.
   */
  const [closing, setClosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyDraft, setReplyDraft] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);
  const replyRequestRef = useRef<{ storyId: string; text: string; requestId: string } | null>(null);
  const replySubmittingRef = useRef(false);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [appActive, setAppActive] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(DEFAULT_HEADER_HEIGHT);
  /** La foto de esta story ya está pintada (o falló): hasta entonces el reloj no corre. */
  const [loadedStoryId, setLoadedStoryId] = useState<string | null>(null);
  const [failedStoryId, setFailedStoryId] = useState<string | null>(null);
  /** Stories a las que ya reaccioné en esta apertura: el corazón queda lleno. */
  const [reactedStoryIds, setReactedStoryIds] = useState<ReadonlySet<string>>(() => new Set());
  const [reactBusy, setReactBusy] = useState(false);
  const [footerHeight, setFooterHeight] = useState(DEFAULT_FOOTER_HEIGHT);

  /*
   * Del cursor (identidad) a las posiciones (lo que la interfaz necesita para
   * pintar barras y saber si hay siguiente). Se recalcula en cada render a
   * partir del `feed` vigente: si el feed se reordena, el visor sigue en la
   * misma persona y en la misma story, que es justo lo que antes no pasaba.
   */
  const personIndex = cursor ? feed.findIndex((candidate) => candidate.userId === cursor.userId) : -1;
  const entry = personIndex === -1 ? null : (feed[personIndex] ?? null);
  const storyIndex = entry && cursor ? entry.stories.findIndex((item) => item.id === cursor.storyId) : -1;
  const story = entry && storyIndex !== -1 ? (entry.stories[storyIndex] ?? null) : null;
  const storyId = story?.id ?? null;
  const storyAccessToken = storyId && storyAccess?.storyId === storyId ? storyAccess.token : null;
  const storyMediaUri = useMemo(
    () => story?.mediaUrl ? resolveStoryMediaSource(story.mediaUrl, env.apiUrl) : null,
    [story?.mediaUrl],
  );
  useEffect(() => {
    if (!storyId) {
      setStoryAccess(null);
      return;
    }
    let cancelled = false;
    setStoryAccess(null);
    void secureStoreAuthStorage.getAccessToken()
      .then((token) => {
        if (!cancelled) setStoryAccess({ storyId, token });
      })
      .catch(() => {
        if (!cancelled) setStoryAccess({ storyId, token: null });
      });
    return () => {
      cancelled = true;
    };
  }, [storyId]);
  const mediaReady = Boolean(story && storyAccessToken && storyMediaUri);
  const mediaAccessFailed = storyAccess?.storyId === storyId && (!storyAccess.token || !storyMediaUri);
  const storyViewedByMe = story?.viewedByMe ?? false;
  const isMine = Boolean(entry && principal && entry.userId === principal.id);
  const canReply = Boolean(entry && principal && entry.userId !== principal.id);
  const isVideo = story?.mediaType === 'video';
  /** La medida sólo vale para la story que la produjo; para el resto, `null`. */
  const measuredMs = videoDuration && videoDuration.storyId === storyId ? videoDuration.ms : null;

  /**
   * El reproductor del vídeo en curso.
   *
   * La fuente es `null` en una foto: `useVideoPlayer` memoriza por fuente, así
   * que una tira de fotos seguidas reutiliza el mismo reproductor vacío y sólo
   * se crea uno nuevo al llegar a un vídeo. Cada vídeo estrena instancia, y por
   * eso el estado de silencio se lee de una referencia: el `setup` corre al
   * crear, cuando la variable de estado de este render todavía no existía.
   */
  const mutedRef = useRef(muted);
  const videoSource = useMemo(
    () =>
      isVideo && storyMediaUri && storyAccessToken
        // `useCaching`: volver atrás a un vídeo ya visto no lo descarga otra vez.
        ? { uri: storyMediaUri, headers: { Authorization: `Bearer ${storyAccessToken}` }, useCaching: true }
        : null,
    [isVideo, storyMediaUri, storyAccessToken],
  );
  const player = useVideoPlayer(
    videoSource,
    (instance) => {
      instance.muted = mutedRef.current;
      instance.loop = false;
      // Una story no sigue sonando con el teléfono bloqueado ni con la app detrás.
      instance.staysActiveInBackground = false;
    },
  );

  // El silencio se aplica sobre el reproductor vigente. `player` está en las
  // dependencias porque cambiar de vídeo crea otro: sin eso, desmutear en la
  // primera story y pasar a la segunda devolvía el sonido al silencio.
  useEffect(() => {
    mutedRef.current = muted;
    player.muted = muted;
  }, [muted, player]);


  /*
   * La duración de verdad.
   *
   * `sourceLoad` llega cuando el reproductor termina de leer los metadatos del
   * clip y trae su duración en segundos; es el único momento en que se puede
   * saber cuánto dura sin inventárselo. A partir de ahí manda esa cifra: la
   * barra y el temporizador se rehacen contra ella (ver `storyKey`).
   *
   * `useEventListener` reengancha solo al cambiar de reproductor y siempre
   * invoca la última versión de este cuerpo, así que `storyId` es el de este
   * render y no hace falta una referencia para leerlo.
   */
  useEventListener(player, 'sourceLoad', ({ duration }) => {
    if (!storyId || !Number.isFinite(duration) || duration <= 0) return;
    const ms = Math.round(duration * 1000);
    setVideoDuration((previous) =>
      previous && previous.storyId === storyId && previous.ms === ms ? previous : { storyId, ms },
    );
  });

  /*
   * Estado del reproductor, para no dejar un rectángulo negro sin explicación.
   *
   * Se repone al cambiar de reproductor y no sólo al recibir eventos: sin ese
   * efecto, un vídeo que falló dejaría su `error` puesto sobre el siguiente
   * hasta que éste emitiera, y el usuario leería «no se pudo cargar» encima de
   * un clip que estaba cargando perfectamente.
   */
  const [playerStatus, setPlayerStatus] = useState<VideoPlayerStatus>('idle');
  useEffect(() => {
    setPlayerStatus(player.status);
  }, [player]);
  useEventListener(player, 'statusChange', ({ status }) => setPlayerStatus(status));

  /*
   * ¿Se ve ya la story? Una foto, cuando `expo-image` avisa de que la pintó; un
   * vídeo, cuando el reproductor está listo. Antes el reloj arrancaba con la
   * petición en vuelo: con mala red una foto podía pasar sin haberse visto y
   * aun así quedar marcada como vista.
   *
   * Si falla, el reloj sí corre (con el tramo de una foto) para que el visor no
   * se quede atascado en un error; lo que no se hace es marcarla como vista.
   */
  const contentFailed = Boolean(storyId) && (
    mediaAccessFailed || failedStoryId === storyId || (isVideo && playerStatus === 'error')
  );
  const contentReady = mediaReady && (isVideo ? playerStatus === 'readyToPlay' : loadedStoryId === storyId);
  const durationMs = contentFailed
    ? IMAGE_DURATION_MS
    : segmentDurationMs(story?.mediaType ?? 'image', measuredMs);

  /**
   * Todas las razones para parar el reloj, en una sola expresión: el dedo
   * apoyado, la pausa del lector de pantalla, el arrastre, el borrado, las
   * hojas abiertas, la app en segundo plano y la story todavía sin pintar.
   */
  const paused = held || manualPaused || dragging || closing || busy || viewersOpen || replyOpen || !appActive
    || !(contentReady || contentFailed);

  /*
   * Reproducir es lo contrario de pausar, y «pausar» aquí es la misma palabra
   * para todo: mantener pulsado, la pausa del lector de pantalla, el arrastre,
   * la hoja de espectadores, el borrado y la app en segundo plano. Mantener
   * pulsado detiene el VÍDEO, no sólo la barra — que era justo la diferencia
   * entre pausar y disimular. Autoplay al entrar sale gratis de aquí: al
   * cambiar de vídeo `player` es otro y el efecto vuelve a correr.
   */
  useEffect(() => {
    if (!isVideo) return;
    if (paused) player.pause();
    else player.play();
  }, [isVideo, paused, player]);

  /** Lo que le queda a la story actual; sobrevive a las pausas. */
  const remainingRef = useRef(durationMs);
  /** El temporizador avanza a través de una referencia para no reiniciarse en cada render. */
  const advanceRef = useRef<() => void>(() => {});
  /**
   * Stories ya marcadas como vistas **en esta apertura del visor**.
   *
   * El matiz importa: `StoriesBar` monta y desmonta el visor, así que cada
   * apertura estrena un `Set` vacío. Por sí solo esto era «una llamada por
   * story y por apertura», que sobre una story ya vista es una llamada de más.
   * Por eso la guarda de abajo mira también `viewedByMe`, que viene en el
   * contrato y sí sobrevive al desmontaje.
   */
  const viewedRef = useRef<Set<string>>(new Set());
  /** El aviso de «esa story ya no está» se da una vez, no una por reconciliación. */
  const missingReportedRef = useRef(false);
  /** `onClose` estable para los efectos, sin que su identidad los vuelva a lanzar. */
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  const translateY = useSharedValue(0);

  // Al desmontar se cancela la animación de salida: su callback lleva un
  // `runOnJS` y, sin esto, podía quedar pendiente sobre un componente que ya no
  // existe. Cancelar la invoca con `finished === false`, y el `if (done)` de
  // más abajo es lo que impide que llame a `finishClose` una segunda vez.
  useEffect(() => {
    return () => {
      cancelAnimation(translateY);
    };
  }, [translateY]);

  // El reloj se para cuando la app deja de estar delante: sin esto, abrir el
  // vídeo en el reproductor del sistema consumía stories a espaldas del usuario.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setAppActive(state === 'active');
      setManualPaused((currentlyPaused) => storyManualPauseAfterAppStateChange(currentlyPaused, state));
    });
    return () => subscription.remove();
  }, []);

  // Marcada como vista AL MOSTRARLA, no al cerrar. Dos guardas y no una: el
  // `Set` evita repetir dentro de esta apertura, y `viewedByMe` evita repetir
  // entre aperturas — reabrir el visor no vuelve a anunciar como nueva una
  // story que el backend ya tiene registrada.
  //
  // Y sólo cuando de verdad se ve (`contentReady`): una story que no llegó a
  // cargar no cuenta como vista ni para el anillo ni para la lista del autor.
  useEffect(() => {
    if (!storyId || !contentReady || viewedRef.current.has(storyId)) return;
    viewedRef.current.add(storyId);
    if (storyViewedByMe) return;
    void storiesService.view(storyId).catch(() => {});
  }, [contentReady, storyId, storyViewedByMe]);

  /*
   * Precarga: la siguiente story y la primera de la siguiente persona se piden
   * mientras se mira la actual, con el mismo token, a la caché de `expo-image`.
   * Así tocar «siguiente» enseña la foto al instante en vez de un spinner. El
   * backend la sirve con `Cache-Control: private` y ETag, de modo que no se
   * descarga dos veces. Los vídeos no se precargan aquí: `expo-video` no tiene
   * precarga sin reproductor; con `useCaching` al menos no se repiten.
   */
  useEffect(() => {
    if (!cursor || !storyAccessToken) return;
    const headers = { Authorization: `Bearer ${storyAccessToken}` };
    const uris = storiesToPreload(feed, cursor)
      .filter((item) => item.mediaType === 'image')
      .map((item) => resolveStoryMediaSource(item.mediaUrl, env.apiUrl))
      .filter((uri): uri is string => uri !== null);
    if (uris.length === 0) return;
    void Image.prefetch(uris, { headers, cachePolicy: 'memory-disk' }).catch(() => false);
  }, [cursor, feed, storyAccessToken]);

  /*
   * Reconciliación del cursor con el feed que acaba de llegar.
   *
   * Decisiones, explícitas las dos, porque heredar una posición no es decidir:
   *
   *  - La PERSONA ya no está en el feed (se le caducaron las stories, se
   *    deshizo la conexión): se CIERRA. Saltar a la siguiente pondría delante a
   *    alguien que el usuario no pidió ver y le marcaría sus stories como
   *    vistas; cerrar devuelve el control sin consumir nada de nadie.
   *  - La persona sigue pero su STORY concreta ya no está (borrada o caducada
   *    mientras se miraba): se REANCLA a su primera sin ver. Aquí sí hay
   *    intención del usuario —está viendo a esta persona— y quedaría contenido
   *    suyo por ver; cerrar sería más brusco que seguir.
   */
  useEffect(() => {
    if (!cursor) {
      // Sólo se llega aquí desde el estado inicial: es el caso «`startUserId`
      // no estaba en el feed». Sin aviso, el toque del anillo parecería roto.
      if (!missingReportedRef.current) {
        missingReportedRef.current = true;
        notify.error('Esa story ya no está disponible.');
      }
      closeRef.current();
      return;
    }
    const reconciliation = reconcileStoryFeed(feed, cursor);
    if (reconciliation.kind === 'close') {
      closeRef.current();
      return;
    }
    if (reconciliation.kind === 'advance') {
      setCursor((previous) => (previous
        ? { ...previous, storyId: reconciliation.storyId, run: previous.run + 1 }
        : previous));
    }
  }, [cursor, feed]);

  /**
   * Alterna la pausa desde el lector de pantalla.
   *
   * Comprueba `actionName` porque el manejador es uno solo para todas las
   * acciones del pulsable: sin la comprobación, la siguiente acción que se
   * añada —un «compartir», por ejemplo— pausaría la story.
   *
   * Y lo anuncia: alternar sin decir nada deja al usuario sin saber si acaba de
   * pausar o de reanudar, que es la mitad de la acción.
   */
  const togglePause = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName !== PAUSE_ACTION) return;
      const next = !manualPaused;
      setManualPaused(next);
      AccessibilityInfo.announceForAccessibility(next ? 'Story en pausa' : 'Story reanudada');
    },
    [manualPaused],
  );

  const jumpFeedback = useCallback(() => {
    // Cambiar de persona es un salto de contexto, no un paso más: el toque
    // háptico lo dice sin ocupar pantalla.
    void Haptics.selectionAsync().catch(() => {});
  }, []);

  /** Mueve el ancla. El pulso `run` sube siempre: reinicia el tramo de la barra. */
  const moveTo = useCallback((userId: string, storyId: string) => {
    setCursor((previous) => (previous ? { userId, storyId, run: previous.run + 1 } : previous));
  }, []);

  /**
   * Desplazamiento horizontal del contenido: sigue al dedo al deslizar entre
   * personas y, al cambiar de persona, la nueva entra desde su lado. Es la
   * respuesta a «¿de dónde salió esto?», no un adorno: con Reduce Motion no se
   * mueve nada y el cambio es instantáneo.
   */
  const translateX = useSharedValue(0);
  const enterFrom = useCallback((direction: 1 | -1) => {
    if (reduceMotion) return;
    cancelAnimation(translateX);
    translateX.value = direction * PERSON_ENTER_OFFSET;
    translateX.value = withSpring(0, RETURN_SPRING);
  }, [reduceMotion, translateX]);

  /** Aplica un paso de navegación; cambiar de persona lleva háptico y entrada lateral. */
  const applyStep = useCallback((step: { userId: string; storyId: string; changedPerson: boolean }, direction: 1 | -1) => {
    if (step.changedPerson) {
      jumpFeedback();
      enterFrom(direction);
    }
    moveTo(step.userId, step.storyId);
  }, [enterFrom, jumpFeedback, moveTo]);

  const goNext = useCallback(() => {
    // Sin ancla válida no se decide nada: lo resuelve la reconciliación.
    if (!cursor || storyIndex === -1) return;
    const step = nextStoryStep(feed, cursor);
    if (step) applyStep(step, 1);
    else closeRef.current();
  }, [applyStep, cursor, feed, storyIndex]);

  const goPrevious = useCallback(() => {
    if (!cursor || storyIndex === -1) return;
    const step = previousStoryStep(feed, cursor);
    // Primera del todo: se reinicia la actual, como hace Instagram.
    if (step) applyStep(step, -1);
    else moveTo(cursor.userId, cursor.storyId);
  }, [applyStep, cursor, feed, moveTo, storyIndex]);

  /**
   * Deslizar en horizontal salta de persona entera. Hacia delante desde la
   * última persona cierra (no queda nadie); hacia atrás desde la primera, el
   * contenido vuelve a su sitio.
   */
  const goPerson = useCallback((direction: 1 | -1) => {
    if (!cursor) return;
    const step = adjacentPersonStep(feed, cursor.userId, direction);
    if (step) {
      applyStep(step, direction);
      return;
    }
    if (direction === 1) closeRef.current();
    else translateX.value = reduceMotion ? 0 : withSpring(0, RETURN_SPRING);
  }, [applyStep, cursor, feed, reduceMotion, translateX]);

  useEffect(() => {
    advanceRef.current = goNext;
  });

  // La clave del reloj va por identidad, no por posición: un reordenamiento del
  // feed ya no reinicia el temporizador de la story que se está viendo.
  //
  // `durationMs` forma parte de la clave por el vídeo: el reloj arranca con el
  // respaldo y, cuando `sourceLoad` trae la duración real, tiene que rearmarse
  // con ella. Sin esto el temporizador seguiría contando los 15 s de reserva
  // mientras la barra dibuja otra cosa, que es la divergencia exacta que esta
  // fase venía a cerrar. En una foto el valor es constante y no cambia nada.
  const storyKey = cursor ? `${cursor.userId}:${cursor.storyId}:${cursor.run}:${durationMs}` : 'none';

  // Declarado ANTES del temporizador a propósito: al cambiar de story la
  // limpieza del temporizador guarda lo que quedaba de la anterior, y este
  // cuerpo repone el tiempo completo antes de que el temporizador nuevo lo lea.
  useEffect(() => {
    remainingRef.current = durationMs;
  }, [durationMs, storyKey]);

  useEffect(() => {
    if (paused || !storyId) return;
    const duration = remainingRef.current;
    const startedAt = Date.now();
    const timer = setTimeout(() => {
      remainingRef.current = 0;
      advanceRef.current();
    }, duration);
    return () => {
      // Se limpia al pausar, al cambiar de story y al desmontar; lo que quedaba
      // se guarda para que reanudar no regale ni robe segundos.
      clearTimeout(timer);
      remainingRef.current = Math.max(0, duration - (Date.now() - startedAt));
    };
  }, [paused, storyId, storyKey]);

  // La interfaz superpuesta desaparece mientras se mantiene pulsado: es lo que
  // convierte «pausar» en «déjame ver la foto».
  const overlayOpacity = useSharedValue(1);
  useEffect(() => {
    cancelAnimation(overlayOpacity);
    const target = held ? 0 : 1;
    overlayOpacity.value = reduceMotion
      ? target
      : withTiming(target, { duration: 180, easing: PREMIUM_EASING });
  }, [held, overlayOpacity, reduceMotion]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));

  const finishClose = useCallback(() => {
    closeRef.current();
  }, []);

  /**
   * Arrastrar hacia abajo cierra, con la foto siguiendo al dedo.
   *
   * `activeOffsetY` y `failOffsetX` son lo que deja convivir el arrastre con los
   * toques de avance: hasta que el dedo no baja 16pt el gesto no se activa, así
   * que un toque sigue siendo un toque.
   */
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-16, 16])
        .failOffsetX([-24, 24])
        .onStart(() => {
          runOnJS(setDragging)(true);
        })
        .onUpdate((event) => {
          // Sólo hacia abajo: tirar hacia arriba no cierra nada, y dejar que la
          // imagen suba sugeriría una acción que no existe.
          translateY.value = Math.max(0, event.translationY);
        })
        .onEnd((event) => {
          const dismissed = event.translationY > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY;
          if (!dismissed) {
            translateY.value = withSpring(0, RETURN_SPRING);
            return;
          }
          // La pausa tiene que sobrevivir a `onFinalize`, que llega en cuanto se
          // levanta el dedo: hasta que el cierre no se consuma, el reloj no
          // vuelve a correr. Nadie apaga `closing`; el visor se desmonta.
          runOnJS(setClosing)(true);
          if (reduceMotion) {
            runOnJS(finishClose)();
            return;
          }
          translateY.value = withTiming(
            screenHeight,
            { duration: 200, easing: Easing.in(Easing.cubic) },
            (done) => {
              if (done) runOnJS(finishClose)();
            },
          );
        })
        .onFinalize(() => {
          runOnJS(setDragging)(false);
        }),
    [finishClose, reduceMotion, screenHeight, translateY],
  );

  /**
   * Deslizar en horizontal pasa a la persona siguiente o anterior, como en
   * Instagram. Convive con el arrastre vertical por los umbrales cruzados (cada
   * uno falla en el eje del otro) y con los toques porque no se activa hasta
   * moverse 20pt. El contenido sigue al dedo a medias: se nota que se puede
   * soltar sin comprometerse.
   */
  const personPan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-20, 20])
        .failOffsetY([-20, 20])
        .onStart(() => {
          runOnJS(setDragging)(true);
        })
        .onUpdate((event) => {
          translateX.value = reduceMotion ? 0 : event.translationX * 0.5;
        })
        .onEnd((event) => {
          const forward = event.translationX < -PERSON_SWIPE_DISTANCE || event.velocityX < -PERSON_SWIPE_VELOCITY;
          const backward = event.translationX > PERSON_SWIPE_DISTANCE || event.velocityX > PERSON_SWIPE_VELOCITY;
          if (forward || backward) {
            runOnJS(goPerson)(forward ? 1 : -1);
            return;
          }
          translateX.value = reduceMotion ? 0 : withSpring(0, RETURN_SPRING);
        })
        .onFinalize(() => {
          runOnJS(setDragging)(false);
        }),
    [goPerson, reduceMotion, translateX],
  );
  const gestures = useMemo(() => Gesture.Race(pan, personPan), [pan, personPan]);

  const contentStyle = useAnimatedStyle(() => {
    const progress = Math.min(1, translateY.value / screenHeight);
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: 1 - progress * 0.12 },
      ],
    };
  });

  // El fondo se aclara conforme la foto se va: la pantalla de detrás se
  // insinúa, que es lo que hace que el gesto se sienta reversible.
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, translateY.value / screenHeight) * 0.55,
  }));

  const viewers = useQuery({
    queryKey: ['stories', 'viewers', storyId],
    queryFn: () => {
      if (!storyId) throw new Error('No hay ninguna story activa.');
      return storiesService.viewers(storyId);
    },
    // Sólo el autor puede pedir la lista: en una story ajena el backend
    // responde 404, así que ni se intenta.
    enabled: isMine && Boolean(storyId),
    staleTime: 15_000,
  });

  if (!entry || !story) return null;
  const activeStoryId = story.id;
  /**
   * El total sólo se afirma cuando el backend lo ha dicho.
   *
   * Mientras la petición está en vuelo, `?? 0` haría que el control dijera «sin
   * vistas todavía» sobre una story que puede tener veinte: es un dato falso,
   * aunque dure medio segundo. Sin respuesta el control se queda en «Vistas» y
   * no se puede pulsar.
   */
  const viewerTotal = viewers.data?.total ?? null;
  const viewersPresentation = storyViewersPresentation(viewerTotal);
  const viewersDisabled = !viewersPresentation.isOpenable;

  async function handleDelete() {
    setBusy(true);
    try {
      const result = await confirmDelete({
        entity: 'story',
        message: 'Dejará de verse para el resto del gimnasio.',
      });
      if (!result.confirmed) return;
      await storiesService.remove(activeStoryId);
      // Se sigue en la siguiente story propia (o en la anterior) en vez de
      // cerrar: borrar una de tres no significa haber terminado de mirar.
      const ownerId = entry?.userId;
      const remaining = entry?.stories.filter((item) => item.id !== activeStoryId) ?? [];
      const target = entry?.stories[storyIndex + 1] ?? entry?.stories[storyIndex - 1];
      // El ancla se mueve ANTES de quitar la story de la caché: así la
      // reconciliación encuentra el cursor ya en la siguiente y no salta.
      if (ownerId && target && remaining.length > 0) moveTo(ownerId, target.id);
      queryClient.setQueryData<StoryFeedEntry[]>(['stories', 'feed'], (current) => current
        ?.map((item) => (item.userId === ownerId
          ? { ...item, stories: item.stories.filter((candidate) => candidate.id !== activeStoryId) }
          : item))
        .filter((item) => item.stories.length > 0));
      void queryClient.invalidateQueries({ queryKey: ['stories', 'feed'] });
      notify.success('Story eliminada.');
      if (!(ownerId && target && remaining.length > 0)) closeRef.current();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'No se pudo eliminar la story.');
    } finally {
      setBusy(false);
    }
  }

  async function handleReact() {
    if (!story || isMine || reactBusy || reactedStoryIds.has(story.id)) return;
    const reactedId = story.id;
    setReactBusy(true);
    try {
      await storiesService.react(reactedId, QUICK_REACTION, requestId());
      setReactedStoryIds((current) => new Set(current).add(reactedId));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      AccessibilityInfo.announceForAccessibility('Reacción enviada');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'No se pudo enviar la reacción.');
    } finally {
      setReactBusy(false);
    }
  }

  async function handleReply() {
    if (!story || isMine || replyBusy || replySubmittingRef.current) return;
    const text = replyDraft.trim();
    if (!text) return;
    let request = replyRequestRef.current;
    if (!request || request.storyId !== story.id || request.text !== text) {
      request = { storyId: story.id, text, requestId: requestId() };
      replyRequestRef.current = request;
    }
    replySubmittingRef.current = true;
    setReplyBusy(true);
    try {
      const message = await storiesService.reply(request.storyId, request.text, request.requestId);
      replySubmittingRef.current = false;
      replyRequestRef.current = null;
      onClose();
      router.push({
        pathname: '/chat/[id]',
        params: { id: message.conversationId, storyReplyMessageId: message.id },
      });
    } catch (error) {
      replySubmittingRef.current = false;
      notify.error(error instanceof Error ? error.message : 'No se pudo responder a la story.');
    } finally {
      setReplyBusy(false);
    }
  }

  /**
   * Acción de accesibilidad: mantener pulsado no existe para un lector de
   * pantalla.
   *
   * El nombre es propio y no `'longpress'` a propósito: para las acciones
   * estándar el sistema pone su propio nombre localizado e **ignora** la
   * etiqueta, así que el usuario oía «pulsación larga» y no «Pausar». Con un
   * nombre propio la etiqueta es lo que se anuncia.
   */
  const pauseAction = {
    name: PAUSE_ACTION,
    label: manualPaused ? 'Reanudar story' : 'Pausar story',
  };

  // La zona de avance termina antes de las acciones del pie en ambas clases
  // de story, para que responder nunca avance la story por accidente.
  const tapZoneBottom = isMine ? footerHeight : canReply ? minTouchTarget + spacing.xl + insets.bottom : 0;

  return (
    <Modal animationType="fade" onRequestClose={onClose} statusBarTranslucent transparent visible>
      {/* Dentro de un `Modal` los gestos necesitan su propia raíz: la del
          proveedor de la app no llega a esta ventana en Android. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: ink.black }, backdropStyle]} />

        <GestureDetector gesture={gestures}>
          <Animated.View style={[{ flex: 1, overflow: 'hidden', borderRadius: radii.xl }, contentStyle]}>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              {!mediaReady ? (
                <View pointerEvents="none" style={{ position: 'absolute', zIndex: 1, padding: spacing.lg }}>
                  <Text
                    accessibilityLiveRegion="polite"
                    accessibilityRole={mediaAccessFailed ? 'alert' : undefined}
                    style={{ color: colors.text, textAlign: 'center' }}
                  >
                    {mediaAccessFailed ? 'No se pudo cargar esta story.' : 'Cargando story…'}
                  </Text>
                </View>
              ) : null}
              {isVideo ? (
                // Sin controles nativos y sin pantalla completa: la story YA es
                // pantalla completa y su lenguaje son los toques laterales y el
                // dedo apoyado. Una barra de reproducción encima taparía la
                // mitad de esos gestos y ofrecería un modelo distinto para lo
                // mismo. El sonido y la pausa viven en la cabecera y en el
                // gesto, que es donde el usuario ya los busca.
                <VideoView
                  allowsPictureInPicture={false}
                  fullscreenOptions={{ enable: false }}
                  contentFit="contain"
                  nativeControls={false}
                  player={player}
                  style={{ width: '100%', height: '100%' }}
                />
              ) : (
                <Image
                  cachePolicy="memory-disk"
                  contentFit="contain"
                  recyclingKey={storyMediaUri ?? undefined}
                  source={
                    storyMediaUri && storyAccessToken
                      ? { uri: storyMediaUri, headers: { Authorization: `Bearer ${storyAccessToken}` } }
                      : null
                  }
                  onError={() => setFailedStoryId(activeStoryId)}
                  onLoad={() => setLoadedStoryId(activeStoryId)}
                  style={{ width: '100%', height: '100%' }}
                  transition={reduceMotion ? 0 : 160}
                />
              )}
            </View>

            {/* Zonas de avance: por encima de la imagen y por debajo de la
                cabecera y del pie, que es la única forma de que las capas se
                repartan la pantalla sin robarse toques. No necesitan tamaño
                mínimo: ocupan media pantalla cada una. */}
            {/* `accessibilityValue.text` y no `accessibilityState`: no hay un
                campo «pausado» en el estado, y reutilizar `selected` o
                `checked` diría algo que no es. El valor sí se lee al enfocar,
                así que quien llega al control después de pausar se entera. */}
            <Pressable
              accessibilityActions={[pauseAction]}
              accessibilityLabel="Story anterior"
              accessibilityRole="button"
              accessibilityValue={{ text: manualPaused ? 'En pausa' : 'Reproduciendo' }}
              delayLongPress={220}
              onAccessibilityAction={togglePause}
              onLongPress={() => setHeld(true)}
              onPress={goPrevious}
              onPressOut={() => setHeld(false)}
              style={{ position: 'absolute', top: headerHeight, bottom: tapZoneBottom, left: 0, width: '32%', zIndex: 1 }}
            />
            <Pressable
              accessibilityActions={[pauseAction]}
              accessibilityLabel="Siguiente story"
              accessibilityRole="button"
              accessibilityValue={{ text: manualPaused ? 'En pausa' : 'Reproduciendo' }}
              delayLongPress={220}
              onAccessibilityAction={togglePause}
              onLongPress={() => setHeld(true)}
              onPress={goNext}
              onPressOut={() => setHeld(false)}
              style={{ position: 'absolute', top: headerHeight, bottom: tapZoneBottom, right: 0, width: '68%', zIndex: 1 }}
            />

            {/* Un vídeo que aún no ha pintado su primer fotograma es un
                rectángulo negro con la barra corriendo por encima, y eso se lee
                como una app rota. `pointerEvents="none"`: es un cartel, no un
                control — los toques siguen llegando a las zonas de avance. */}
            {!isVideo && mediaReady && !contentReady ? (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: headerHeight,
                  left: 0,
                  right: 0,
                  bottom: tapZoneBottom,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing.sm,
                  paddingHorizontal: spacing.xl,
                  zIndex: 3,
                }}
              >
                {contentFailed ? (
                  <>
                    <Ionicons color={onMedia.textMuted} name="cloud-offline-outline" size={40} />
                    <Text style={{ color: onMedia.textMuted, fontSize: fontSizes.sm, textAlign: 'center', lineHeight: 20 }}>
                      Esta foto no se pudo cargar.
                    </Text>
                  </>
                ) : (
                  <ActivityIndicator accessibilityLabel="Cargando story" color={ink.white} size="small" />
                )}
              </View>
            ) : null}

            {isVideo && playerStatus !== 'readyToPlay' ? (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: headerHeight,
                  left: 0,
                  right: 0,
                  bottom: tapZoneBottom,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing.sm,
                  paddingHorizontal: spacing.xl,
                  zIndex: 3,
                }}
              >
                {playerStatus === 'error' ? (
                  <>
                    <Ionicons color={onMedia.textMuted} name="cloud-offline-outline" size={40} />
                    <Text
                      style={{
                        color: onMedia.textMuted,
                        fontSize: fontSizes.sm,
                        textAlign: 'center',
                        lineHeight: 20,
                      }}
                    >
                      Este vídeo no se pudo cargar.
                    </Text>
                  </>
                ) : (
                  <ActivityIndicator color={ink.white} size="small" />
                )}
              </View>
            ) : null}

            {story.caption ? (
              <Animated.View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, { zIndex: 3 }, overlayStyle]}
              >
                <StoryCaption bottom={tapZoneBottom + spacing.lg} text={story.caption} />
              </Animated.View>
            ) : null}

            {/* Cabecera: barras y autor. Se mide a sí misma para que las zonas
                de avance empiecen justo debajo y «Cerrar» siga siendo pulsable. */}
            <Animated.View
              onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
              pointerEvents={held ? 'none' : 'box-none'}
              style={[{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 4 }, overlayStyle]}
            >
              <View
                style={{
                  flexDirection: 'row',
                  gap: 4,
                  // En Android el inset puede quedarse corto frente a la barra de
                  // estado dibujada; sin el respaldo, los tramos caían bajo el reloj.
                  paddingTop: Math.max(insets.top, StatusBar.currentHeight ?? 0) + spacing.md,
                  paddingHorizontal: spacing.md,
                }}
              >
                {entry.stories.map((item, itemIndex) => (
                  <ProgressSegment
                    animated={!reduceMotion}
                    // La duración medida sólo se conoce de la story en curso —
                    // es la única cuyo vídeo está cargado. Los demás tramos no
                    // se animan (están llenos o vacíos), así que su duración
                    // nominal no llega a usarse para nada.
                    durationMs={
                      item.id === storyId
                        ? durationMs
                        : segmentDurationMs(item.mediaType, null)
                    }
                    key={item.id}
                    paused={paused}
                    remainingMsRef={remainingRef}
                    runToken={cursor?.run ?? 0}
                    status={itemIndex < storyIndex ? 'past' : itemIndex === storyIndex ? 'current' : 'future'}
                  />
                ))}
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  paddingHorizontal: spacing.md,
                  paddingTop: spacing.sm,
                }}
              >
                <SmallAvatar fullName={entry.fullName} photoUrl={entry.photoUrl} size={32} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ color: ink.white, fontSize: fontSizes.sm, fontWeight: semibold }}>
                    {entry.fullName}
                  </Text>
                  <Text style={{ color: alpha(ink.white, 0.7), fontSize: fontSizes.xs }}>
                    {[relativeTimeEs(story.createdAt), isMine ? storyTimeLeftLabel(story.expiresAt) : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                {/* El sonido sólo aparece cuando hay sonido que gobernar. Es un
                    conmutador y se anuncia como tal: la etiqueta dice lo que va
                    a pasar al pulsar, y el valor, en qué estado está ahora. */}
                {isVideo ? (
                  <PressableScale
                    accessibilityLabel={muted ? 'Activar el sonido' : 'Silenciar'}
                    haptic="selection"
                    onPress={() => setMuted((value) => !value)}
                    scaleTo={0.9}
                    style={{
                      width: minTouchTarget,
                      height: minTouchTarget,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Animated.View entering={FadeIn.duration(DURATION.quick)} key={muted ? 'muted' : 'sound'}>
                      <Ionicons
                        color={ink.white}
                        name={muted ? 'volume-mute-outline' : 'volume-high-outline'}
                        size={iconSizes.lg}
                      />
                    </Animated.View>
                  </PressableScale>
                ) : null}
                {isMine ? (
                  <PressableScale
                    accessibilityLabel="Eliminar esta story"
                    accessibilityState={{ disabled: busy, busy }}
                    disabled={busy}
                    haptic="none"
                    onPress={() => void handleDelete()}
                    scaleTo={0.9}
                    style={{
                      width: minTouchTarget,
                      height: minTouchTarget,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons color={busy ? colors.textDisabled : ink.white} name="trash-outline" size={iconSizes.lg} />
                  </PressableScale>
                ) : null}
                <PressableScale
                  accessibilityLabel="Cerrar"
                  haptic="none"
                  onPress={onClose}
                  scaleTo={0.9}
                  style={{
                    width: minTouchTarget,
                    height: minTouchTarget,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons color={ink.white} name="close" size={iconSizes.lg} />
                </PressableScale>
              </View>
            </Animated.View>

            {/* Pie: quién vio tu story. Sólo en las propias — nadie más tiene
                por qué saber quién mira a quién. */}
            {isMine ? (
              <Animated.View
                onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
                pointerEvents={held ? 'none' : 'box-none'}
                style={[
                  {
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    paddingHorizontal: spacing.md,
                    paddingBottom: insets.bottom + spacing.md,
                    paddingTop: spacing.sm,
                    alignItems: 'flex-start',
                    zIndex: 4,
                  },
                  overlayStyle,
                ]}
              >
                <Pressable
                  accessibilityLabel={viewersPresentation.accessibilityLabel}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: viewersDisabled }}
                  disabled={viewersDisabled}
                  onPress={() => setViewersOpen(true)}
                  style={({ pressed }) => ({
                    minHeight: minTouchTarget,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    paddingHorizontal: spacing.md,
                    borderRadius: radii.full,
                    backgroundColor: overlay.glass,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Ionicons color={ink.white} name="eye-outline" size={iconSizes.md} />
                  <Text style={{ color: ink.white, fontSize: fontSizes.sm, fontWeight: semibold }}>
                    {viewersPresentation.controlLabel}
                  </Text>
                </Pressable>
              </Animated.View>
            ) : null}
            {canReply ? (
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                pointerEvents="box-none"
                style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + spacing.md, zIndex: 5 }}
              >
                {replyOpen ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginHorizontal: spacing.md, padding: spacing.xs, borderRadius: radii.full, backgroundColor: overlay.scrim }}>
                    <TextInput
                      accessibilityLabel={`Responder a la story de ${entry?.fullName ?? 'este usuario'}`}
                      autoFocus
                      editable={!replyBusy}
                      maxLength={1000}
                      onChangeText={setReplyDraft}
                      onSubmitEditing={() => void handleReply()}
                      placeholder="Escribe una respuesta…"
                      placeholderTextColor={alpha(ink.white, 0.7)}
                      returnKeyType="send"
                      value={replyDraft}
                      style={{ minHeight: minTouchTarget, flex: 1, color: ink.white, paddingHorizontal: spacing.md, fontSize: fontSizes.sm }}
                    />
                    <PressableScale
                      accessibilityLabel="Enviar respuesta"
                      accessibilityRole="button"
                      accessibilityState={{ disabled: replyBusy || !replyDraft.trim(), busy: replyBusy }}
                      disabled={replyBusy || !replyDraft.trim()}
                      haptic="selection"
                      onPress={() => void handleReply()}
                      style={{ minWidth: minTouchTarget, minHeight: minTouchTarget, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm, borderRadius: radii.full, backgroundColor: colors.volt }}
                    >
                      <Text style={{ color: colors.background, fontSize: fontSizes.xs, fontWeight: semibold }}>{replyBusy ? 'Enviando…' : 'Enviar'}</Text>
                    </PressableScale>
                    <PressableScale
                      accessibilityLabel="Cancelar respuesta"
                      accessibilityRole="button"
                      accessibilityState={{ disabled: replyBusy }}
                      disabled={replyBusy}
                      haptic="none"
                      onPress={() => { setReplyOpen(false); setReplyDraft(''); }}
                      style={{ width: minTouchTarget, height: minTouchTarget, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Ionicons color={ink.white} name="close" size={iconSizes.md} />
                    </PressableScale>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.md }}>
                    <PressableScale
                      accessibilityLabel={`Responder a la story de ${entry?.fullName ?? 'este usuario'}`}
                      accessibilityRole="button"
                      haptic="selection"
                      onPress={() => setReplyOpen(true)}
                      style={{ flex: 1, minHeight: minTouchTarget, justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radii.full, borderWidth: 1, borderColor: alpha(ink.white, 0.55), backgroundColor: alpha(ink.black, 0.55) }}
                    >
                      <Text numberOfLines={1} style={{ color: ink.white, fontSize: fontSizes.sm }}>Responder a {entry?.fullName ?? 'esta story'}…</Text>
                    </PressableScale>
                    {/* Reacción de un toque: llega al chat de esa persona como un
                        corazón. Lleno = ya enviada; no se manda dos veces. */}
                    <PressableScale
                      accessibilityLabel={reactedStoryIds.has(activeStoryId) ? 'Reacción enviada' : 'Reaccionar con un corazón'}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: reactBusy || reactedStoryIds.has(activeStoryId), busy: reactBusy }}
                      disabled={reactBusy || reactedStoryIds.has(activeStoryId)}
                      haptic="none"
                      onPress={() => void handleReact()}
                      scaleTo={0.88}
                      style={{ width: minTouchTarget, height: minTouchTarget, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Ionicons
                        color={ink.white}
                        name={reactedStoryIds.has(activeStoryId) ? 'heart' : 'heart-outline'}
                        size={iconSizes.lg}
                      />
                    </PressableScale>
                  </View>
                )}
              </KeyboardAvoidingView>
            ) : null}
          </Animated.View>
        </GestureDetector>

        {viewersOpen && isMine ? (
          <ViewersSheet onClose={() => setViewersOpen(false)} storyId={activeStoryId} />
        ) : null}
      </GestureHandlerRootView>
    </Modal>
  );
}
