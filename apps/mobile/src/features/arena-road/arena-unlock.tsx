import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { alpha, arenaLockedVeil, colors, iconSizes, ink, onMedia, radii, spacing, stageBackground } from '@/theme';
import { arenaInkAt } from './arena-art';
import { ArenaBanner } from './arena-banner';
import type { RoadArena } from './road';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/**
 * La coreografía del desbloqueo, en ms desde que se abre.
 *
 * | t        | Acto                                                         |
 * |----------|--------------------------------------------------------------|
 * | 0–320    | El escenario se oscurece y la arena llega, aún bajo el velo  |
 * | 420–1040 | El candado tiembla, cada vez más fuerte                     |
 * | 1080     | Se rompe: destello, golpe háptico, el velo se va            |
 * | 1180     | «ARENA N DESBLOQUEADA» sube; los rayos empiezan a girar      |
 * | 1300     | El nombre cae de golpe y se asienta                         |
 * | 1700→    | Los hitos de la fase, uno a uno; el botón al final          |
 *
 * Un solo golpe háptico, en el instante en que el candado se rompe: es la causa
 * visible. Con movimiento reducido no hay temblor, ni escala, ni rayos: el velo
 * se funde y el texto aparece.
 */
const T = {
  enterIn: 320,
  shakeAt: 420,
  shakeStep: 78,
  breakAt: 1080,
  kickerAt: 1180,
  nameAt: 1300,
  listAt: 1700,
  listStagger: 110,
  buttonAt: 2150,
} as const;

/** Temblor del candado: grados, crecientes. */
const SHAKE = [-6, 6, -9, 9, -13, 13, -16, 0] as const;

export function ArenaUnlock({
  arena,
  intro,
  onClose,
}: {
  arena: RoadArena;
  /** Presentación (primera visita o repetición) en vez de desbloqueo recién ganado. */
  intro: boolean;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const tint = arenaInkAt(arena.order);
  const bannerWidth = Math.min(width - spacing.lg * 2, 420);

  const stage = useSharedValue(0);
  const bannerIn = useSharedValue(reduceMotion ? 1 : 0);
  const lockAngle = useSharedValue(0);
  const lockGone = useSharedValue(0);
  const veil = useSharedValue(1);
  const flash = useSharedValue(0);
  const rays = useSharedValue(0);
  const raysIn = useSharedValue(0);
  const kicker = useSharedValue(0);
  const name = useSharedValue(0);
  const button = useSharedValue(0);

  useEffect(() => {
    stage.value = withTiming(1, { duration: 260 });
    if (reduceMotion) {
      veil.value = withDelay(300, withTiming(0, { duration: 500 }));
      lockGone.value = withDelay(300, withTiming(1, { duration: 300 }));
      kicker.value = withDelay(500, withTiming(1, { duration: 300 }));
      name.value = withDelay(500, withTiming(1, { duration: 300 }));
      button.value = withDelay(900, withTiming(1, { duration: 300 }));
      return;
    }
    bannerIn.value = withTiming(1, { duration: T.enterIn, easing: EASE_OUT });
    lockAngle.value = withDelay(
      T.shakeAt,
      withSequence(...SHAKE.map((angle) => withTiming(angle, { duration: T.shakeStep, easing: Easing.inOut(Easing.quad) }))),
    );
    lockGone.value = withDelay(
      T.breakAt,
      withTiming(1, { duration: 260, easing: EASE_OUT }, (finished) => {
        if (finished) scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle.Heavy);
      }),
    );
    flash.value = withDelay(
      T.breakAt,
      withSequence(withTiming(0.85, { duration: 70 }), withTiming(0, { duration: 420, easing: EASE_OUT })),
    );
    veil.value = withDelay(T.breakAt, withTiming(0, { duration: 420, easing: EASE_OUT }));
    raysIn.value = withDelay(T.kickerAt, withTiming(1, { duration: 600 }));
    rays.value = withDelay(T.kickerAt, withRepeat(withTiming(1, { duration: 14000, easing: Easing.linear }), -1, false));
    kicker.value = withDelay(T.kickerAt, withTiming(1, { duration: 360, easing: EASE_OUT }));
    name.value = withDelay(T.nameAt, withTiming(1, { duration: 420, easing: EASE_OUT }));
    button.value = withDelay(T.buttonAt, withTiming(1, { duration: 320, easing: EASE_OUT }));
  }, [bannerIn, button, flash, kicker, lockAngle, lockGone, name, rays, raysIn, reduceMotion, stage, veil]);

  const stageStyle = useAnimatedStyle(() => ({ opacity: stage.value }));
  const bannerStyle = useAnimatedStyle(() => ({
    opacity: bannerIn.value,
    transform: [{ translateY: (1 - bannerIn.value) * 28 }, { scale: 0.92 + bannerIn.value * 0.08 }],
  }));
  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));
  const lockStyle = useAnimatedStyle(() => ({
    opacity: 1 - lockGone.value,
    transform: [{ rotate: `${lockAngle.value}deg` }, { scale: 1 + lockGone.value * 0.9 }],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const raysStyle = useAnimatedStyle(() => ({
    opacity: raysIn.value * 0.9,
    transform: [{ rotate: `${rays.value * 360}deg` }],
  }));
  const kickerStyle = useAnimatedStyle(() => ({
    opacity: kicker.value,
    transform: [{ translateY: (1 - kicker.value) * 12 }],
  }));
  const nameStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, name.value * 1.6),
    transform: [{ scale: 1.28 - name.value * 0.28 }],
  }));
  const buttonStyle = useAnimatedStyle(() => ({
    opacity: button.value,
    transform: [{ translateY: (1 - button.value) * 10 }],
  }));

  const raySize = Math.max(width, height) * 1.3;
  const raysPath = useMemo(() => sunburst(raySize / 2, 14), [raySize]);

  return (
    <Animated.View
      accessibilityViewIsModal
      style={[StyleSheet.absoluteFill, { backgroundColor: alpha(stageBackground.celebration, 0.94) }, stageStyle]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.rays,
          { width: raySize, height: raySize, left: (width - raySize) / 2, top: height * 0.36 - raySize / 2 },
          raysStyle,
        ]}
      >
        <Svg height={raySize} viewBox={`0 0 ${raySize} ${raySize}`} width={raySize}>
          <Path d={raysPath} fill={alpha(tint.glow, 0.12)} />
        </Svg>
      </Animated.View>

      <Pressable accessibilityLabel="Cerrar" onPress={onClose} style={StyleSheet.absoluteFill} />

      <View pointerEvents="box-none" style={[styles.column, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg }]}>
        <Animated.View style={kickerStyle}>
          <Text style={{ color: tint.glow, letterSpacing: 2.4, textAlign: 'center' }} variant="footnote" strong>
            {intro ? `ESTÁS EN LA ARENA ${arena.order}` : `ARENA ${arena.order} DESBLOQUEADA`}
          </Text>
        </Animated.View>

        <Animated.View style={[{ width: bannerWidth }, bannerStyle]}>
          <ArenaBanner arena={{ ...arena, state: 'done' }} teaser width={bannerWidth} />
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.bannerVeil, veilStyle]} />
          <Animated.View pointerEvents="none" style={[styles.bigLock, { borderColor: tint.glow }, lockStyle]}>
            <Ionicons color={onMedia.text} name="lock-closed" size={iconSizes.xl} />
          </Animated.View>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, flashStyle]} />
        </Animated.View>

        <Animated.View style={[styles.nameBlock, nameStyle]}>
          <Text style={{ color: onMedia.text, textAlign: 'center' }} variant="display">
            {arena.arenaName}
          </Text>
          <Text style={{ color: onMedia.textSoft, textAlign: 'center' }} variant="subhead">
            {`${intro ? 'Eres' : 'Ahora eres'} ${arena.level.name}. ${arena.level.tagline}`}
          </Text>
        </Animated.View>

        <View style={styles.list}>
          {arena.level.milestones.map((milestone, index) => (
            <MilestoneLine
              key={milestone}
              color={tint.b[1]}
              delay={reduceMotion ? 700 : T.listAt + index * T.listStagger}
              text={milestone}
            />
          ))}
        </View>

        <Animated.View style={[styles.cta, buttonStyle]}>
          <PressableScale
            accessibilityRole="button"
            haptic="light"
            onPress={onClose}
            style={[styles.button, { backgroundColor: tint.b[1] }]}
          >
            <Text style={{ color: ink.black }} variant="headline">
              Seguir subiendo
            </Text>
          </PressableScale>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

function MilestoneLine({ text, color, delay }: { text: string; color: string; delay: number }) {
  const reduceMotion = useReducedMotion();
  const shown = useSharedValue(0);
  useEffect(() => {
    shown.value = withDelay(delay, withTiming(1, { duration: 320, easing: EASE_OUT }));
  }, [delay, shown]);
  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: reduceMotion ? [] : [{ translateX: (1 - shown.value) * -14 }],
  }));
  return (
    <Animated.View style={[styles.milestone, style]}>
      <View style={[styles.milestoneDot, { backgroundColor: color }]} />
      <Text style={{ color: onMedia.text, flex: 1 }} variant="subhead">
        {text}
      </Text>
    </Animated.View>
  );
}

/** Rayos alternos alrededor del centro de un cuadrado de lado `2 * r`. */
function sunburst(r: number, count: number): string {
  let d = '';
  const step = (Math.PI * 2) / count;
  for (let index = 0; index < count; index += 1) {
    const a = index * step;
    const b = a + step / 2;
    d += `M${r} ${r}L${(r + Math.cos(a) * r).toFixed(1)} ${(r + Math.sin(a) * r).toFixed(1)}L${(r + Math.cos(b) * r).toFixed(1)} ${(r + Math.sin(b) * r).toFixed(1)}Z`;
  }
  return d;
}

const styles = StyleSheet.create({
  rays: {
    position: 'absolute',
  },
  column: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  bannerVeil: {
    backgroundColor: arenaLockedVeil,
    borderRadius: radii.xxl,
  },
  bigLock: {
    position: 'absolute',
    alignSelf: 'center',
    top: '28%',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: alpha(ink.black, 0.55),
  },
  flash: {
    backgroundColor: ink.white,
    borderRadius: radii.xxl,
  },
  nameBlock: {
    gap: spacing.xs,
    alignItems: 'center',
  },
  list: {
    alignSelf: 'stretch',
    gap: spacing.smd,
    paddingHorizontal: spacing.sm,
  },
  milestone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
  },
  milestoneDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cta: {
    alignSelf: 'stretch',
  },
  button: {
    minHeight: 52,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: alpha(colors.text, 0.12),
  },
});
