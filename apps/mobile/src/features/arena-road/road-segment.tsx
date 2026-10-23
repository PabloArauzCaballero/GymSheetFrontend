import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Text } from '@/components/text';
import { alpha, arenaTrack, colors, iconSizes, ink, onMedia, radii, spacing, type ArenaInk } from '@/theme';
import { arenaInkFor } from './arena-art';
import { Shockwave, SparkBurst } from './particles';
import type { RoadArena } from './road';

export const SEGMENT_HEIGHT = 236;
const TRACK = 10;
const DOT = 18;
const MARKER = 48;
/** Dónde caen los tres hitos a lo largo del tramo (desde abajo). */
const MILESTONE_AT = [0.22, 0.5, 0.78] as const;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
/** Sobreimpulso del aterrizaje del marcador: pasa un poco y vuelve. */
const EASE_LAND = Easing.bezier(0.34, 1.56, 0.64, 1);

/**
 * Cuándo empieza cada cosa al abrir el camino (ms). La pista espera a que la
 * cámara haya bajado hasta tu arena (`CAMERA` en `camino.tsx`).
 */
export const ROAD_CUES = {
  fillAt: 1250,
  fillIn: 1100,
  markerAt: 2350,
  markerIn: 620,
} as const;

/**
 * El tramo de pista que sale de una arena hacia la siguiente, con los hitos
 * típicos de esa fase a los lados y, si estás en él, tu marcador.
 *
 * Se lee de abajo arriba, como se sube. En tu tramo la pista se llena con un
 * brillo que corre hacia arriba, cada hito **se enciende con un golpe** en el
 * instante en que la pista lo alcanza, y tu marcador cae desde arriba con una
 * onda expansiva y chispas. Los hitos son orientativos (el sistema no los
 * mide): encendido dice «por aquí suele caer», no «conseguido».
 */
export const RoadSegment = memo(function RoadSegment({
  arena,
  width,
  pointsLabel,
}: {
  arena: RoadArena;
  width: number;
  /** Texto de tu pestaña («4.691»); solo en el tramo actual. */
  pointsLabel: string;
}) {
  const reduceMotion = useReducedMotion();
  const tint = arenaInkFor(arena.code, arena.order);
  const current = arena.state === 'current';
  const animate = current && !reduceMotion;
  const target = arena.segmentProgress;
  // El marcador nunca baja de la base del tramo: debajo empieza la ficha de la
  // arena y lo taparía (con 0 pts quedaba medio escondido).
  const markerLift = Math.max(target * SEGMENT_HEIGHT, MARKER / 2 + spacing.xs);

  const fill = useSharedValue(animate ? 0 : target);
  const marker = useSharedValue(animate ? 0 : 1);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    if (!animate) return;
    fill.value = withDelay(ROAD_CUES.fillAt, withTiming(target, { duration: ROAD_CUES.fillIn, easing: EASE_OUT }));
    marker.value = withDelay(
      ROAD_CUES.markerAt,
      withTiming(1, { duration: ROAD_CUES.markerIn, easing: EASE_LAND }, (finished) => {
        if (finished) scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle.Medium);
      }),
    );
    // Un solo destello mientras se llena: un bucle infinito aquí era ruido.
    shimmer.value = withDelay(
      ROAD_CUES.fillAt,
      withTiming(1, { duration: ROAD_CUES.fillIn, easing: Easing.inOut(Easing.quad) }),
    );
  }, [animate, fill, marker, shimmer, target]);

  const fillStyle = useAnimatedStyle(() => ({ height: fill.value * SEGMENT_HEIGHT }));
  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value < 1 ? 1 : 0,
    transform: [{ translateY: interpolate(shimmer.value, [0, 1], [40, -fill.value * SEGMENT_HEIGHT - 40]) }],
  }));
  // Cae desde 90 pt más arriba con sobreimpulso: aterriza, no aparece.
  const markerStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, marker.value * 3),
    transform: [
      { translateY: -markerLift - (1 - marker.value) * 90 },
      { scale: 0.7 + Math.min(marker.value, 1.1) * 0.3 },
    ],
  }));

  const center = width / 2;
  // Las etiquetas empiezan donde acaba el marcador: así nunca lo pisan.
  const labelGap = MARKER / 2 + spacing.sm;
  const labelWidth = center - labelGap - spacing.sm;
  const landAt = ROAD_CUES.markerAt + ROAD_CUES.markerIn * 0.55;

  return (
    <View style={{ width, height: SEGMENT_HEIGHT }}>
      <View style={[styles.track, { left: center - TRACK / 2, backgroundColor: arenaTrack }]}>
        <Animated.View style={[styles.fill, fillStyle]}>
          <LinearGradient colors={[tint.b[0], tint.b[1], tint.b[2]]} style={StyleSheet.absoluteFill} />
          {current ? (
            <Animated.View style={[styles.shimmer, shimmerStyle]}>
              <LinearGradient
                colors={[alpha(ink.white, 0), alpha(ink.white, 0.85), alpha(ink.white, 0)]}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          ) : null}
        </Animated.View>
      </View>

      {arena.milestones.slice(0, MILESTONE_AT.length).map((milestone, index) => (
        <Milestone
          at={MILESTONE_AT[index] ?? 0.5}
          center={center}
          fill={fill}
          key={milestone}
          labelGap={labelGap}
          labelWidth={labelWidth}
          onLeft={index % 2 === 0}
          text={milestone}
          tint={tint}
        />
      ))}

      {current ? (
        <>
          {animate ? (
            <View pointerEvents="none" style={[styles.burstAt, { left: center, bottom: markerLift }]}>
              <Shockwave color={tint.glow} delay={landAt} size={MARKER} to={3.2} />
              <SparkBurst
                colors={[tint.b[0], tint.glow, ink.white]}
                count={16}
                delay={landAt}
                maxDistance={84}
                minDistance={34}
                seed={arena.order * 13}
              />
            </View>
          ) : null}
          <Animated.View
            accessibilityLabel={`Tú, con ${pointsLabel} puntos ganados`}
            style={[styles.marker, { left: center - MARKER / 2 }, markerStyle]}
          >
            <MarkerPulse color={tint.glow} enabled={animate} />
            <View style={[styles.markerBody, { borderColor: tint.b[0], shadowColor: tint.glow }]}>
              <Ionicons
                color={onMedia.text}
                name={(arena.rank?.icon ?? 'flame').replace('-outline', '') as keyof typeof Ionicons.glyphMap}
                size={iconSizes.md}
              />
            </View>
            {/* «TÚ» encima del marcador y estrecho: las etiquetas de los hitos
                empiezan donde acaba el marcador, así nunca se pisan. */}
            <View style={[styles.youTag, { backgroundColor: tint.b[1] }]}>
              <Text numberOfLines={1} style={{ color: ink.black, letterSpacing: 1 }} variant="caption" strong>
                TÚ
              </Text>
            </View>
          </Animated.View>
        </>
      ) : null}
    </View>
  );
});

/** Un hito: se enciende con un golpe cuando la pista lo alcanza. */
function Milestone({
  text,
  at,
  fill,
  onLeft,
  center,
  labelGap,
  labelWidth,
  tint,
}: {
  text: string;
  at: number;
  fill: SharedValue<number>;
  onLeft: boolean;
  center: number;
  labelGap: number;
  labelWidth: number;
  tint: ArenaInk;
}) {
  const lit = useSharedValue(0);
  const pop = useSharedValue(0);
  useAnimatedReaction(
    () => fill.value >= at,
    (reached, before) => {
      if (!reached || before === true) return;
      lit.value = withTiming(1, { duration: 180 });
      // Ya encendido al montar (tramo superado): sin golpe.
      if (before === null) return;
      pop.value = withSequence(withTiming(1, { duration: 140 }), withSpring(0, { duration: 420, dampingRatio: 0.5 }));
    },
  );
  // Los colores se resuelven aquí, en JS: dentro del worklet solo se eligen.
  // Llamar a `alpha()` desde el hilo de UI tumba la app («Remote Function»).
  const litFill = tint.b[1];
  const litBorder = tint.b[0];
  const offFill = colors.surfaceHighest;
  const offBorder = alpha(ink.white, 0.16);
  const dotStyle = useAnimatedStyle(() => ({
    backgroundColor: lit.value > 0.5 ? litFill : offFill,
    borderColor: lit.value > 0.5 ? litBorder : offBorder,
    transform: [{ scale: 1 + pop.value * 0.7 }],
  }));
  const coreStyle = useAnimatedStyle(() => ({ opacity: lit.value }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: pop.value * 0.8,
    transform: [{ scale: 1 + pop.value * 1.6 }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + lit.value * 0.45,
    transform: [{ translateX: (onLeft ? -1 : 1) * pop.value * 4 }],
  }));
  const bottom = at * SEGMENT_HEIGHT - DOT / 2;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.dotRing, { left: center - DOT / 2, bottom, borderColor: tint.glow }, ringStyle]} />
      <Animated.View style={[styles.dot, { left: center - DOT / 2, bottom }, dotStyle]}>
        <Animated.View style={[styles.dotCore, coreStyle]} />
      </Animated.View>
      <Animated.View
        style={[
          styles.label,
          {
            width: labelWidth,
            bottom: bottom - spacing.xs,
            ...(onLeft ? { right: center + labelGap } : { left: center + labelGap }),
            alignItems: onLeft ? 'flex-end' : 'flex-start',
          },
          labelStyle,
        ]}
      >
        <Text style={{ color: onMedia.text, textAlign: onLeft ? 'right' : 'left' }} variant="footnote">
          {text}
        </Text>
      </Animated.View>
    </View>
  );
}

function MarkerPulse({ color, enabled }: { color: string; enabled: boolean }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (!enabled) return;
    pulse.value = withDelay(
      ROAD_CUES.markerAt + ROAD_CUES.markerIn,
      withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false),
    );
  }, [enabled, pulse]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.6 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 1.1 }],
  }));
  return <Animated.View style={[styles.pulse, { borderColor: color }, style]} />;
}

const styles = StyleSheet.create({
  track: {
    position: 'absolute',
    top: -spacing.sm,
    bottom: -spacing.sm,
    width: TRACK,
    borderRadius: TRACK / 2,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  fill: {
    width: '100%',
    borderRadius: TRACK / 2,
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 46,
  },
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotRing: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
  },
  dotCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ink.white,
  },
  label: {
    position: 'absolute',
  },
  burstAt: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
  marker: {
    position: 'absolute',
    bottom: -MARKER / 2,
    zIndex: 2,
    width: MARKER,
    height: MARKER,
    alignItems: 'center',
  },
  pulse: {
    position: 'absolute',
    width: MARKER,
    height: MARKER,
    borderRadius: MARKER / 2,
    borderWidth: 3,
  },
  markerBody: {
    width: MARKER,
    height: MARKER,
    borderRadius: MARKER / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHigh,
    shadowOpacity: 0.9,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  youTag: {
    position: 'absolute',
    bottom: MARKER + spacing.xs,
    left: (MARKER - 40) / 2,
    height: 22,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
  },
});
