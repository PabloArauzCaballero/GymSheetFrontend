import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Fragment, memo, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { progressionService } from '@/api/services';
import { ErrorState, Skeleton } from '@/components/feedback';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { ARENA_ART_HEIGHT, ARENA_ART_WIDTH, arenaInkFor } from '@/features/arena-road/arena-art';
import { ArenaBanner } from '@/features/arena-road/arena-banner';
import { ArenaUnlock } from '@/features/arena-road/arena-unlock';
import { buildRoad, formatPoints, type RoadArena } from '@/features/arena-road/road';
import { ROAD_CUES, RoadSegment } from '@/features/arena-road/road-segment';
import { useArenaUnlock } from '@/features/arena-road/use-arena-unlock';
import { useAuthStore } from '@/state/auth-store';
import { alpha, arenaTrack, colors, iconSizes, ink, minTouchTarget, onMedia, radii, spacing } from '@/theme';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);
/** Separación entre la entrada de una arena y la siguiente, contando desde la tuya. */
const ENTER_STAGGER = 80;
const LOCK_SHAKE = [-12, 12, -9, 9, -5, 0] as const;

/**
 * La cámara de entrada: arranca unas arenas más arriba (las que te esperan) y
 * baja hasta la tuya. Termina justo cuando la pista empieza a llenarse.
 */
const CAMERA = {
  startAbove: 900,
  at: 150,
  duration: ROAD_CUES.fillAt - 200,
} as const;

/** Cuánto se mueve la escena por cada punto de desplazamiento: profundidad. */
const PARALLAX = 0.1;
const PARALLAX_MAX = 14;

/**
 * El camino de arenas: de La Puerta al Salón de Leyendas, de abajo arriba,
 * como se sube.
 *
 * **Orquestación al entrar** (todo en el hilo de UI, sin un render por
 * fotograma):
 *
 * 1. La cámara aparece unas arenas más arriba —lo que te espera— y baja con
 *    calma hasta la tuya. Si tocas la pantalla, se detiene: manda el dedo.
 * 2. Las arenas aparecen escalonadas **desde la tuya hacia fuera**.
 * 3. La pista de tu tramo se llena, cada hito se enciende al pasar y tu
 *    marcador cae con onda expansiva y chispas (`ROAD_CUES`).
 * 4. El candado de la siguiente arena tiembla: lo que falta, a la vista.
 *
 * Al desplazarse, cada escena se mueve un poco más despacio que su ficha
 * (paralaje). Si es la primera visita o acabas de entrar en una arena, encima
 * se abre el desbloqueo (`ArenaUnlock`). Una pulsación larga sobre tu arena lo
 * repite.
 *
 * El camino sube con `arenaPoints`, los puntos **ganados**: los puntos son
 * moneda (se canjean por strikes, se pierden con penalizaciones) y gastarlos
 * nunca devuelve a nadie a una arena anterior.
 */
export default function CaminoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const principal = useAuthStore((state) => state.principal);

  const progression = useQuery({ queryKey: ['progression', 'me'], queryFn: () => progressionService.get() });
  const data = progression.data;
  const earned = data ? (data.arenaPoints ?? data.points) : 0;
  const road = useMemo(() => (data ? buildRoad(data.arenas, data.path, earned) : null), [data, earned]);
  const { show, replay, dismiss } = useArenaUnlock(road, principal?.id ?? null);

  const gutter = spacing.md;
  const contentWidth = Math.min(width - gutter * 2, 520);

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(0);
  const camera = useSharedValue(0);
  const flying = useSharedValue(false);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
    onBeginDrag: () => {
      flying.value = false;
      cancelAnimation(camera);
    },
  });
  useAnimatedReaction(
    () => camera.value,
    (y) => {
      if (flying.value) scrollTo(scrollRef, 0, y, false);
    },
  );

  const placed = useRef(false);
  const placeOnCurrent = (bannerY: number) => {
    if (placed.current) return;
    placed.current = true;
    // La arena actual en la mitad de abajo: encima queda su tramo con tu marcador.
    const target = Math.max(0, bannerY - height * 0.42);
    if (reduceMotion) {
      scrollRef.current?.scrollTo({ y: target, animated: false });
      return;
    }
    const start = Math.max(0, target - CAMERA.startAbove);
    scrollRef.current?.scrollTo({ y: start, animated: false });
    camera.value = start;
    flying.value = true;
    camera.value = withDelay(
      CAMERA.at,
      withTiming(target, { duration: CAMERA.duration, easing: EASE_IN_OUT }, () => {
        flying.value = false;
      }),
    );
  };

  const lockRotation = useSharedValue(0);
  useEffect(() => {
    if (!road?.next || reduceMotion) return;
    lockRotation.value = withDelay(
      ROAD_CUES.markerAt + ROAD_CUES.markerIn + 300,
      withSequence(...LOCK_SHAKE.map((angle) => withTiming(angle, { duration: 70 }))),
    );
  }, [lockRotation, reduceMotion, road?.next]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/trayectoria'));

  if (!road || !data) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + spacing.xxl, paddingHorizontal: gutter }]}>
        <BackButton onPress={goBack} top={insets.top} />
        {progression.isError ? (
          <ErrorState error={progression.error} onRetry={() => void progression.refetch()} />
        ) : (
          <View style={{ gap: spacing.lg }}>
            <Skeleton height={200} />
            <Skeleton height={200} />
          </View>
        )}
      </View>
    );
  }

  const current = road.arenas[road.currentIndex] ?? null;
  const tint = arenaInkFor(current?.code ?? '', Math.max(1, road.currentIndex + 1));
  const last = road.arenas.length - 1;
  const summitTint = arenaInkFor(road.arenas[last]?.code ?? '', road.arenas.length);
  const pointsLabel = formatPoints(earned);

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[alpha(tint.glow, 0.24), alpha(tint.glow, 0), alpha(colors.background, 0)]}
        locations={[0, 0.45, 1]}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />

      <Animated.ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          alignItems: 'center',
          paddingTop: insets.top + 96,
          paddingBottom: insets.bottom + 150,
        }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summit}>
          <Ionicons color={summitTint.b[1]} name="diamond" size={iconSizes.xl} />
          <Text style={{ color: onMedia.textSoft, textAlign: 'center' }} variant="footnote">
            La cima. Muy pocos llegan hasta aquí.
          </Text>
        </View>

        {road.arenas
          .map((arena, index) => ({ arena, index }))
          .reverse()
          .map(({ arena, index }) => (
            <Fragment key={arena.code}>
              {index < last ? <RoadSegment arena={arena} pointsLabel={pointsLabel} width={contentWidth} /> : null}
              <ArenaStage
                arena={arena}
                delay={reduceMotion ? 0 : Math.abs(index - road.currentIndex) * ENTER_STAGGER}
                lockRotation={arena.state === 'next' ? lockRotation : undefined}
                onCurrentY={arena.state === 'current' ? placeOnCurrent : undefined}
                onReplay={replay}
                scrollY={scrollY}
                viewport={height}
                width={contentWidth}
              />
            </Fragment>
          ))}

        <View style={styles.start}>
          <View style={[styles.startFlag, { backgroundColor: arenaTrack }]}>
            <Ionicons color={onMedia.text} name="flag" size={iconSizes.md} />
          </View>
          <Text style={{ color: onMedia.textSoft, textAlign: 'center' }} variant="footnote">
            Aquí empezaste. Cada entrenamiento te sube un poco.
          </Text>
        </View>
      </Animated.ScrollView>

      <View pointerEvents="box-none" style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <LinearGradient
          colors={[colors.background, alpha(colors.background, 0)]}
          pointerEvents="none"
          style={styles.headerFade}
        />
        <BackButton onPress={goBack} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: onMedia.text }} variant="title">
            El camino
          </Text>
          <Text style={{ color: onMedia.textMuted }} variant="caption">
            {current ? `Arena ${current.order} de ${road.arenas.length} · ${current.name}` : 'Tu primera arena te espera'}
          </Text>
        </View>
      </View>

      <NextBar bottom={insets.bottom} current={current} earned={pointsLabel} next={road.next} width={contentWidth} />

      {show ? <ArenaUnlock arena={show.arena} intro={show.intro} onClose={dismiss} /> : null}
    </View>
  );
}

/**
 * Una arena en el camino: entra escalonada, calcula su paralaje a partir del
 * desplazamiento y, si es la tuya, avisa de su posición para colocar la cámara.
 */
const ArenaStage = memo(function ArenaStage({
  arena,
  width,
  delay,
  scrollY,
  viewport,
  lockRotation,
  onCurrentY,
  onReplay,
}: {
  arena: RoadArena;
  width: number;
  delay: number;
  scrollY: SharedValue<number>;
  viewport: number;
  lockRotation?: SharedValue<number>;
  onCurrentY?: (y: number) => void;
  onReplay: () => void;
}) {
  const y = useSharedValue(0);
  const cardHeight = (width * ARENA_ART_HEIGHT) / ARENA_ART_WIDTH;
  const parallax = useDerivedValue(() => {
    const offset = (scrollY.value + viewport / 2 - (y.value + cardHeight / 2)) * PARALLAX;
    return Math.max(-PARALLAX_MAX, Math.min(PARALLAX_MAX, offset));
  });
  const current = arena.state === 'current';
  return (
    <EnterOnMount
      delay={delay}
      onLayoutY={(layoutY) => {
        y.value = layoutY;
        onCurrentY?.(layoutY);
      }}
    >
      <Pressable
        accessibilityHint={current ? 'Mantén pulsado para ver tu arena a pantalla completa' : undefined}
        delayLongPress={380}
        disabled={!current}
        onLongPress={onReplay}
      >
        <ArenaBanner arena={arena} lockRotation={lockRotation} parallax={parallax} width={width} />
      </Pressable>
    </EnterOnMount>
  );
});

/** Lo siguiente, siempre a la vista: cuánto falta y la barra del tramo. */
function NextBar({
  current,
  next,
  earned,
  bottom,
  width,
}: {
  current: RoadArena | null;
  next: RoadArena | null;
  /** Puntos ganados ya formateados: lo que mueve el camino. */
  earned: string;
  bottom: number;
  width: number;
}) {
  const tint = arenaInkFor(next?.code ?? current?.code ?? '', next?.order ?? current?.order ?? 1);
  const reduceMotion = useReducedMotion();
  const progress = current?.segmentProgress ?? 0;
  const fill = useSharedValue(reduceMotion ? progress : 0);
  const enter = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    enter.value = withDelay(reduceMotion ? 0 : 500, withTiming(1, { duration: 420, easing: EASE_OUT }));
    fill.value = withDelay(
      reduceMotion ? 0 : ROAD_CUES.fillAt,
      withTiming(progress, { duration: reduceMotion ? 0 : ROAD_CUES.fillIn, easing: EASE_OUT }),
    );
  }, [enter, fill, progress, reduceMotion]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  const barStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 40 }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.nextBar, { bottom: bottom + spacing.md, width }, barStyle]}>
      <View style={styles.nextRow}>
        <Text numberOfLines={1} style={{ color: onMedia.text, flex: 1 }} variant="subhead" strong>
          {next ? `Siguiente: ${next.name}` : 'Estás en la cima'}
        </Text>
        <Text style={{ color: tint.b[0] }} tabular variant="footnote" strong>
          {next ? `faltan ${formatPoints(next.pointsToEnter)} pts` : 'Leyenda'}
        </Text>
      </View>
      <Text style={{ color: onMedia.textMuted }} tabular variant="caption">
        {`Llevas ${earned} pts ganados. Canjear puntos no te baja de arena.`}
      </Text>
      <View style={[styles.nextTrack, { backgroundColor: arenaTrack }]}>
        <Animated.View style={[styles.nextFill, fillStyle]}>
          <LinearGradient
            colors={[tint.b[0], tint.b[1]]}
            end={{ x: 1, y: 0 }}
            start={{ x: 0, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

function EnterOnMount({
  delay,
  onLayoutY,
  children,
}: {
  delay: number;
  onLayoutY?: (y: number) => void;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const shown = useSharedValue(0);
  useEffect(() => {
    shown.value = withDelay(delay, withTiming(1, { duration: 520, easing: EASE_OUT }));
  }, [delay, shown]);
  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: reduceMotion
      ? []
      : [{ perspective: 800 }, { translateY: (1 - shown.value) * 26 }, { rotateX: `${(1 - shown.value) * 18}deg` }, { scale: 0.94 + shown.value * 0.06 }],
  }));
  return (
    <Animated.View onLayout={onLayoutY ? (event) => onLayoutY(event.nativeEvent.layout.y) : undefined} style={style}>
      {children}
    </Animated.View>
  );
}

function BackButton({ onPress, top }: { onPress: () => void; top?: number }) {
  return (
    <PressableScale
      accessibilityLabel="Volver"
      accessibilityRole="button"
      haptic="none"
      hitSlop={spacing.sm}
      onPress={onPress}
      scaleTo={0.92}
      style={[styles.back, top === undefined ? null : { position: 'absolute', top: top + spacing.xs, left: spacing.md }]}
    >
      <Ionicons color={onMedia.text} name="chevron-back" size={iconSizes.md} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  headerFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -spacing.xl,
    height: spacing.xl,
  },
  back: {
    width: minTouchTarget,
    height: minTouchTarget,
    borderRadius: minTouchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: alpha(ink.white, 0.1),
  },
  summit: {
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  start: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  startFlag: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBar: {
    position: 'absolute',
    alignSelf: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: alpha(colors.surfaceHigh, 0.96),
    borderWidth: 1,
    borderColor: alpha(ink.white, 0.08),
    shadowColor: ink.black,
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nextTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  nextFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
