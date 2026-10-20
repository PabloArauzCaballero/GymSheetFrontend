import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Fragment, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { progressionService } from '@/api/services';
import { ErrorState, Skeleton } from '@/components/feedback';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { ArenaBanner } from '@/features/arena-road/arena-banner';
import { arenaInkAt } from '@/features/arena-road/arena-art';
import { ArenaUnlock } from '@/features/arena-road/arena-unlock';
import { buildRoad, formatPoints, type RoadArena } from '@/features/arena-road/road';
import { ROAD_CUES, RoadSegment } from '@/features/arena-road/road-segment';
import { useArenaUnlock } from '@/features/arena-road/use-arena-unlock';
import { useAuthStore } from '@/state/auth-store';
import { alpha, arenaTrack, colors, iconSizes, ink, minTouchTarget, onMedia, radii, spacing } from '@/theme';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
/** Separación entre la entrada de una arena y la siguiente, contando desde la tuya. */
const ENTER_STAGGER = 70;
const LOCK_SHAKE = [-12, 12, -9, 9, -5, 0] as const;

/**
 * El camino de arenas: de La Puerta a El Olimpo, de abajo arriba, como se sube.
 *
 * **Orquestación al entrar** (todo en el hilo de UI, sin un render por
 * fotograma):
 *
 * 1. La pantalla abre ya colocada sobre tu arena: no hay un desplazamiento
 *    animado que esperar.
 * 2. Las arenas aparecen escalonadas **desde la tuya hacia fuera**: lo primero
 *    que se ve es dónde estás.
 * 3. La pista de tu tramo se llena hasta tus puntos exactos y tu marcador cae
 *    encima con un muelle (`ROAD_CUES`).
 * 4. El candado de la siguiente arena tiembla una vez: lo que falta, a la vista.
 *
 * Si es la primera visita o acabas de entrar en una arena, encima se abre la
 * secuencia de desbloqueo (`ArenaUnlock`). Una pulsación larga sobre tu arena
 * la repite.
 */
export default function CaminoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const principal = useAuthStore((state) => state.principal);

  const progression = useQuery({ queryKey: ['progression', 'me'], queryFn: () => progressionService.get() });
  const data = progression.data;
  const road = useMemo(() => (data ? buildRoad(data.path, data.points) : null), [data]);
  const { show, replay, dismiss } = useArenaUnlock(road, principal?.id ?? null);

  const gutter = spacing.md;
  const contentWidth = Math.min(width - gutter * 2, 520);

  const scrollRef = useRef<ScrollView>(null);
  const placed = useRef(false);
  const placeOnCurrent = (bannerY: number) => {
    if (placed.current) return;
    placed.current = true;
    // La arena actual en la mitad de abajo: encima queda su tramo con tu marcador.
    scrollRef.current?.scrollTo({ y: Math.max(0, bannerY - height * 0.42), animated: false });
  };

  const lockRotation = useSharedValue(0);
  useEffect(() => {
    if (!road?.next || reduceMotion) return;
    lockRotation.value = withDelay(
      ROAD_CUES.markerAt + 420,
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
  const tint = arenaInkAt(Math.max(1, road.currentIndex + 1));
  const top = road.arenas.length - 1;
  const pointsLabel = `${formatPoints(data.points)} pts`;

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[alpha(tint.glow, 0.22), alpha(tint.glow, 0), alpha(colors.background, 0)]}
        locations={[0, 0.45, 1]}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          alignItems: 'center',
          paddingTop: insets.top + 84,
          paddingBottom: insets.bottom + 140,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summit}>
          <Ionicons color={arenaInkAt(road.arenas.length).b[1]} name="trophy" size={iconSizes.xl} />
          <Text style={{ color: onMedia.textSoft, textAlign: 'center' }} variant="footnote">
            La cima. Muy pocos llegan hasta aquí.
          </Text>
        </View>

        {road.arenas
          .map((arena, index) => ({ arena, index }))
          .reverse()
          .map(({ arena, index }) => (
            <Fragment key={arena.level.code}>
              {index < top ? <RoadSegment arena={arena} pointsLabel={pointsLabel} width={contentWidth} /> : null}
              <EnterOnMount
                delay={reduceMotion ? 0 : Math.abs(index - road.currentIndex) * ENTER_STAGGER}
                onLayoutY={arena.state === 'current' ? placeOnCurrent : undefined}
              >
                <Pressable
                  accessibilityHint={arena.state === 'current' ? 'Mantén pulsado para ver tu arena a pantalla completa' : undefined}
                  delayLongPress={380}
                  disabled={arena.state !== 'current'}
                  onLongPress={replay}
                >
                  <ArenaBanner
                    arena={arena}
                    lockRotation={arena.state === 'next' ? lockRotation : undefined}
                    width={contentWidth}
                  />
                </Pressable>
              </EnterOnMount>
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
      </ScrollView>

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
            {current ? `Arena ${current.order} de ${road.arenas.length} · ${current.arenaName}` : 'Tu primera arena te espera'}
          </Text>
        </View>
      </View>

      <NextBar current={current} next={road.next} bottom={insets.bottom} width={contentWidth} />

      {show ? <ArenaUnlock arena={show.arena} intro={show.intro} onClose={dismiss} /> : null}
    </View>
  );
}

/** Lo siguiente, siempre a la vista: cuánto falta y la barra del tramo. */
function NextBar({
  current,
  next,
  bottom,
  width,
}: {
  current: RoadArena | null;
  next: RoadArena | null;
  bottom: number;
  width: number;
}) {
  const tint = arenaInkAt(next?.order ?? current?.order ?? 1);
  const reduceMotion = useReducedMotion();
  const progress = current?.segmentProgress ?? 0;
  const fill = useSharedValue(reduceMotion ? progress : 0);
  useEffect(() => {
    fill.value = withDelay(
      reduceMotion ? 0 : ROAD_CUES.fillAt,
      withTiming(progress, { duration: reduceMotion ? 0 : ROAD_CUES.fillIn, easing: EASE_OUT }),
    );
  }, [fill, progress, reduceMotion]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <View pointerEvents="none" style={[styles.nextBar, { bottom: bottom + spacing.md, width }]}>
      <View style={styles.nextRow}>
        <Text numberOfLines={1} style={{ color: onMedia.text, flex: 1 }} variant="subhead" strong>
          {next ? `Siguiente: ${next.arenaName}` : 'Estás en la cima'}
        </Text>
        <Text style={{ color: tint.b[0] }} tabular variant="footnote" strong>
          {next ? `faltan ${formatPoints(next.pointsToEnter)} pts` : 'Leyenda'}
        </Text>
      </View>
      <View style={[styles.nextTrack, { backgroundColor: arenaTrack }]}>
        <Animated.View style={[styles.nextFill, { backgroundColor: tint.b[1] }, fillStyle]} />
      </View>
    </View>
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
    shown.value = withDelay(delay, withTiming(1, { duration: 420, easing: EASE_OUT }));
  }, [delay, shown]);
  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: reduceMotion ? [] : [{ translateY: (1 - shown.value) * 18 }, { scale: 0.97 + shown.value * 0.03 }],
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
  },
});
