import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '@/components/text';
import { alpha, arenaTrack, colors, iconSizes, ink, onMedia, radii, spacing } from '@/theme';
import { arenaInkAt } from './arena-art';
import type { RoadArena } from './road';

export const SEGMENT_HEIGHT = 236;
const TRACK = 8;
const DOT = 16;
const MARKER = 46;
/** Dónde caen los tres hitos a lo largo del tramo (desde abajo). */
const MILESTONE_AT = [0.22, 0.5, 0.78] as const;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/** Cuándo empieza cada cosa al abrir el camino (ms). */
export const ROAD_CUES = {
  fillAt: 380,
  fillIn: 950,
  markerAt: 1240,
} as const;

/**
 * El tramo de pista que sale de una arena hacia la siguiente, con los hitos
 * típicos de esa fase a los lados y, si estás en él, tu marcador.
 *
 * Se lee de abajo arriba, como se sube: la pista se rellena desde la arena de
 * abajo. Los hitos son orientativos (el sistema no los mide), así que se
 * encienden por avance del tramo, no se tachan: un punto encendido dice «por
 * aquí suele caer», no «conseguido».
 */
export const RoadSegment = memo(function RoadSegment({
  arena,
  width,
  pointsLabel,
}: {
  arena: RoadArena;
  width: number;
  /** Texto bajo el marcador («5.000 pts»); solo en el tramo actual. */
  pointsLabel: string;
}) {
  const reduceMotion = useReducedMotion();
  const tint = arenaInkAt(arena.order);
  const current = arena.state === 'current';
  const target = arena.segmentProgress;

  const fill = useSharedValue(current && !reduceMotion ? 0 : target);
  const marker = useSharedValue(current && !reduceMotion ? 0 : 1);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!current || reduceMotion) return;
    fill.value = withDelay(ROAD_CUES.fillAt, withTiming(target, { duration: ROAD_CUES.fillIn, easing: EASE_OUT }));
    marker.value = withDelay(ROAD_CUES.markerAt, withSpring(1, { duration: 520, dampingRatio: 0.55 }));
    pulse.value = withDelay(
      ROAD_CUES.markerAt + 400,
      withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false),
    );
  }, [current, fill, marker, pulse, reduceMotion, target]);

  const fillHeight = useDerivedValue(() => fill.value * SEGMENT_HEIGHT);
  const fillStyle = useAnimatedStyle(() => ({ height: fillHeight.value }));
  const markerStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, marker.value * 2),
    transform: [{ translateY: -fillHeight.value }, { scale: 0.6 + marker.value * 0.4 }],
  }));
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 0.9 }],
  }));

  const center = width / 2;
  const labelWidth = center - DOT - spacing.md;

  return (
    <View style={{ width, height: SEGMENT_HEIGHT }}>
      <View style={[styles.track, { left: center - TRACK / 2, backgroundColor: arenaTrack }]}>
        <Animated.View style={[styles.fill, fillStyle]}>
          <LinearGradient colors={[tint.b[0], tint.b[1]]} style={StyleSheet.absoluteFill} />
        </Animated.View>
      </View>

      {arena.level.milestones.slice(0, MILESTONE_AT.length).map((milestone, index) => {
        const at = MILESTONE_AT[index] ?? 0.5;
        const lit = arena.segmentProgress >= at;
        const onLeft = index % 2 === 0;
        const bottom = at * SEGMENT_HEIGHT - DOT / 2;
        return (
          <View key={milestone} style={StyleSheet.absoluteFill} pointerEvents="none">
            <View
              style={[
                styles.dot,
                {
                  left: center - DOT / 2,
                  bottom,
                  backgroundColor: lit ? tint.b[1] : colors.surfaceHighest,
                  borderColor: lit ? tint.b[0] : alpha(ink.white, 0.16),
                },
              ]}
            >
              {lit ? <View style={styles.dotCore} /> : null}
            </View>
            <View
              style={[
                styles.label,
                {
                  width: labelWidth,
                  bottom: bottom - spacing.xs,
                  ...(onLeft ? { right: center + DOT } : { left: center + DOT }),
                  alignItems: onLeft ? 'flex-end' : 'flex-start',
                },
              ]}
            >
              <Text
                style={{ color: lit ? onMedia.text : colors.textMuted, textAlign: onLeft ? 'right' : 'left' }}
                variant="footnote"
                strong={lit}
              >
                {milestone}
              </Text>
            </View>
          </View>
        );
      })}

      {current ? (
        <Animated.View
          accessibilityLabel={`Tú, con ${pointsLabel}`}
          style={[styles.marker, { left: center - MARKER / 2 }, markerStyle]}
        >
          <Animated.View style={[styles.pulse, { borderColor: arena.level.color }, pulseStyle]} />
          <View style={[styles.markerBody, { borderColor: arena.level.color }]}>
            <Ionicons
              color={onMedia.text}
              name={arena.level.icon.replace('-outline', '') as keyof typeof Ionicons.glyphMap}
              size={iconSizes.md}
            />
          </View>
          <View style={[styles.youTag, { backgroundColor: arena.level.color }]}>
            <Text style={{ color: ink.black, letterSpacing: 0.8 }} tabular variant="caption" strong>
              {`TÚ · ${pointsLabel}`}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
});

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
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
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
  marker: {
    position: 'absolute',
    bottom: -MARKER / 2,
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
  },
  youTag: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    minWidth: 96,
    alignItems: 'center',
  },
});
