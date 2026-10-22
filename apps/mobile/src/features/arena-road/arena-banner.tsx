import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Text } from '@/components/text';
import { alpha, arenaLockedVeil, arenaScrim, continuous, iconSizes, ink, onMedia, radii, spacing } from '@/theme';
import { ARENA_ART_HEIGHT, ARENA_ART_WIDTH, arenaArtXml, arenaInkFor } from './arena-art';
import { Embers } from './particles';
import { formatPoints, type RoadArena } from './road';

const ASPECT = ARENA_ART_HEIGHT / ARENA_ART_WIDTH;
const EASE_IN_OUT = Easing.bezier(0.45, 0, 0.25, 1);
/** La escena es un poco más grande que su ventana: así el paralaje no deja bordes. */
const ART_BLEED = 1.16;
const FRAME = 2;

/**
 * Una arena del camino: la escena, su número, su nombre y lo que trae.
 *
 * El estado se lee antes que el texto, como en los juegos de arenas:
 * - **la tuya** lleva marco de metal en su color, una sombra de su tono y
 *   brasas en el aire;
 * - **la siguiente** enseña cuánto falta y su candado se balancea pidiendo
 *   que lo abras;
 * - **las demás bloqueadas** quedan bajo un velo, con el nombre legible: el
 *   siguiente hito siempre se ve.
 *
 * Solo la arena actual tiene movimiento en bucle; dieciséis escenas vivas a
 * la vez serían ruido y batería.
 *
 * `parallax` (pt) lo calcula el camino a partir del desplazamiento: la escena
 * se mueve un poco más despacio que la ficha y gana profundidad.
 */
export const ArenaBanner = memo(function ArenaBanner({
  arena,
  width,
  lockRotation,
  parallax,
  teaser = false,
  bare = false,
}: {
  arena: RoadArena;
  width: number;
  /** Grados del candado, para que el camino lo haga temblar. */
  lockRotation?: SharedValue<number>;
  parallax?: SharedValue<number>;
  /** Versión compacta de «Tu senda»: sin la segunda línea. */
  teaser?: boolean;
  /** Sin nombre: cuando el nombre ya está en grande fuera de la ficha. */
  bare?: boolean;
}) {
  const height = Math.round(width * ASPECT);
  const tint = arenaInkFor(arena.code, arena.order);
  const xml = useMemo(() => arenaArtXml(arena.code, arena.order), [arena.code, arena.order]);
  const current = arena.state === 'current';
  const next = arena.state === 'next';
  const locked = next || arena.state === 'locked';
  const reduceMotion = useReducedMotion();

  const float = useSharedValue(0.5);
  const bob = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    // Una sola cosa viva por ficha: la escena flota despacio en tu arena. El
    // halo que latía (pintaba un marco gris translúcido) y el destello
    // periódico se fueron: eran ruido y batería.
    if (current) float.value = withRepeat(withTiming(1, { duration: 3400, easing: EASE_IN_OUT }), -1, true);
    // El candado de la siguiente llama la atención tres veces y se calla.
    if (next) bob.value = withRepeat(withTiming(1, { duration: 1300, easing: EASE_IN_OUT }), 6, true);
  }, [bob, current, float, next, reduceMotion]);

  const artStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (parallax?.value ?? 0) + (float.value - 0.5) * 6 }, { scale: ART_BLEED }],
  }));
  const lockStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -bob.value * 5 }, { rotate: `${lockRotation?.value ?? 0}deg` }],
  }));
  const beckonStyle = useAnimatedStyle(() => ({
    opacity: 0.7 * (1 - bob.value),
    transform: [{ scale: 1 + bob.value * 0.5 }],
  }));

  const frameColors: readonly [string, string, ...string[]] = current
    ? [tint.b[0], tint.b[1], tint.b[2], tint.b[1]]
    : arena.state === 'done'
      ? [alpha(tint.b[0], 0.55), alpha(tint.b[2], 0.35)]
      : [alpha(ink.white, 0.14), alpha(ink.white, 0.04)];

  const kicker = `ARENA ${arena.order}`;
  const label = `${kicker}, ${arena.name}. ${statusLabel(arena)}`;
  const secondLine = locked
    ? statusLabel(arena)
    : arena.rankUp && arena.rank
      ? `Nuevo rango: ${arena.rank.name} · ${arena.tagline}`
      : arena.tagline;

  return (
    <View accessibilityLabel={label} accessible style={{ width, height }}>
      <LinearGradient
        colors={frameColors}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={[styles.frame, continuous, { shadowColor: current ? tint.glow : ink.black }]}
      >
        <View style={[styles.window, continuous]}>
          <Animated.View style={[StyleSheet.absoluteFill, artStyle]}>
            <SvgXml height="100%" width="100%" xml={xml} />
          </Animated.View>

          {current && !reduceMotion ? (
            <Embers colors={[tint.b[0], tint.glow]} count={8} height={height} width={width} />
          ) : null}

          {locked ? <View style={[StyleSheet.absoluteFill, { backgroundColor: arenaLockedVeil }]} /> : null}

          <LinearGradient
            colors={[alpha(ink.white, 0.16), alpha(ink.white, 0)]}
            locations={[0, 0.35]}
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
          />
          {bare ? null : (
            <LinearGradient
              colors={arenaScrim}
              locations={[0.38, 0.7, 1]}
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
            />
          )}
        </View>
      </LinearGradient>

      <View style={styles.topRow}>
        <View style={styles.chipRow}>
          <View style={[styles.chip, { backgroundColor: alpha(ink.black, 0.5), borderColor: alpha(tint.glow, 0.35) }]}>
            <Text style={{ color: tint.glow, letterSpacing: 1.4 }} variant="caption" strong>
              {kicker}
            </Text>
          </View>
          {arena.rankUp && !teaser ? (
            <View style={[styles.chip, { backgroundColor: alpha(tint.b[1], 0.92) }]}>
              <Ionicons color={ink.black} name="ribbon" size={iconSizes.xs} />
              <Text style={{ color: ink.black, letterSpacing: 0.6 }} variant="caption" strong>
                RANGO
              </Text>
            </View>
          ) : null}
        </View>
        <View style={[styles.chip, { backgroundColor: alpha(ink.black, 0.5) }]}>
          <Ionicons color={tint.b[0]} name="sparkles" size={iconSizes.xs} />
          <Text style={{ color: onMedia.text }} tabular variant="caption" strong>
            {`${formatPoints(arena.minPoints)} pts`}
          </Text>
        </View>
      </View>

      {locked ? (
        <View pointerEvents="none" style={styles.lockSlot}>
          {next ? <Animated.View style={[styles.beckon, { borderColor: tint.glow }, beckonStyle]} /> : null}
          <Animated.View
            style={[styles.lock, { borderColor: alpha(tint.glow, 0.7), shadowColor: tint.glow }, lockStyle]}
          >
            <Ionicons color={onMedia.text} name="lock-closed" size={iconSizes.lg} />
          </Animated.View>
        </View>
      ) : null}

      {bare ? null : (
        <View style={styles.caption}>
          <Text
            numberOfLines={1}
            style={[styles.name, { color: onMedia.text, textShadowColor: alpha(ink.black, 0.6) }]}
            variant="title"
          >
            {arena.name}
          </Text>
          {teaser ? null : (
            <Text numberOfLines={1} style={{ color: onMedia.textSoft }} variant="footnote">
              {secondLine}
            </Text>
          )}
        </View>
      )}
    </View>
  );
});

const STATUS: Record<RoadArena['state'], (arena: RoadArena) => string> = {
  current: () => 'Estás aquí',
  done: () => 'Superada',
  next: (arena) => `Te faltan ${formatPoints(arena.pointsToEnter)} pts para entrar`,
  locked: (arena) => `Se abre con ${formatPoints(arena.minPoints)} pts`,
};

function statusLabel(arena: RoadArena): string {
  return STATUS[arena.state](arena);
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    padding: FRAME,
    borderRadius: radii.xxl,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 22,
    elevation: 10,
  },
  window: {
    flex: 1,
    borderRadius: radii.xxl - FRAME,
    overflow: 'hidden',
  },
  topRow: {
    position: 'absolute',
    top: spacing.smd,
    left: spacing.smd,
    right: spacing.smd,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: alpha(ink.white, 0),
  },
  lockSlot: {
    position: 'absolute',
    alignSelf: 'center',
    top: '28%',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beckon: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
  },
  lock: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: alpha(ink.black, 0.55),
    shadowOpacity: 0.8,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  caption: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.smd,
    gap: spacing.xxs,
  },
  name: {
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
});
