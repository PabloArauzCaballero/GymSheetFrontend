import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { alpha, arenaLockedVeil, iconSizes, ink, onMedia, radii, spacing, stageBackground } from '@/theme';
import { ARENA_ART_HEIGHT, ARENA_ART_WIDTH, arenaInkFor } from './arena-art';
import { ArenaBanner } from './arena-banner';
import { Embers, Shockwave, SparkBurst } from './particles';
import type { RoadArena } from './road';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const EASE_IN_OUT = Easing.bezier(0.45, 0, 0.25, 1);

/**
 * La coreografía del desbloqueo, en ms desde que se abre. Un solo sitio para
 * todos los tiempos: cambiar uno no descuadra a los demás.
 *
 * | t         | Acto                                                                |
 * |-----------|---------------------------------------------------------------------|
 * | 0–260     | El escenario se oscurece                                            |
 * | 120–760   | La arena cae en 3D, inclinada, y aterriza: temblor, polvo, golpe     |
 * | 860–1560  | El candado se carga de luz y tiembla cada vez más                    |
 * | 1600      | Se parte: dos mitades y el arco salen volando; onda, destello,       |
 * |           | chispas, golpe fuerte y temblor. El velo se va                       |
 * | 1700→     | Rayos en contrarrotación y brasas; brillo que cruza la escena        |
 * | 1820      | La placa se despliega; 1900 el nombre cae de golpe (golpe de éxito)  |
 * | 2250      | La insignia de rango, si esta arena trae ascenso                     |
 * | 2450→     | Los hitos, uno a uno; 2950 el botón, que luego late                  |
 *
 * Tres golpes hápticos y ninguno de adorno: el aterrizaje, la rotura y el
 * nombre, cada uno en el fotograma de su causa. Con movimiento reducido no hay
 * caída, temblor, partículas ni rayos: el velo se funde y el texto aparece.
 */
const T = {
  stageIn: 260,
  dropAt: 120,
  dropIn: 640,
  chargeAt: 860,
  chargeStep: 70,
  breakAt: 1600,
  raysAt: 1700,
  sheenAt: 1900,
  plateAt: 1820,
  nameAt: 1900,
  rankAt: 2250,
  listAt: 2450,
  listStagger: 120,
  buttonAt: 2950,
} as const;

/** Temblor del candado mientras se carga: grados, crecientes. */
const CHARGE = [-5, 5, -7, 7, -9, 9, -12, 12, -14, 14] as const;
/** Temblor de la pantalla: puntos, decrecientes. */
const SHAKE_LAND = [7, -6, 4, -2, 0] as const;
const SHAKE_BREAK = [12, -11, 9, -6, 4, -2, 0] as const;
const SHAKE_STEP = 42;
const LANDED_AT = T.dropAt + T.dropIn * 0.7;

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
  const tint = arenaInkFor(arena.code, arena.order);
  const bannerWidth = Math.min(width - spacing.lg * 2, 420);
  const bannerHeight = Math.round((bannerWidth * ARENA_ART_HEIGHT) / ARENA_ART_WIDTH);
  const full = !reduceMotion;

  const stage = useSharedValue(0);
  const drop = useSharedValue(full ? 0 : 1);
  const shake = useSharedValue(0);
  const charge = useSharedValue(0);
  const lockAngle = useSharedValue(0);
  const broken = useSharedValue(0);
  const veil = useSharedValue(1);
  const flash = useSharedValue(0);
  const raysIn = useSharedValue(0);
  const spin = useSharedValue(0);
  const sheen = useSharedValue(-1);
  const kicker = useSharedValue(0);
  const plate = useSharedValue(0);
  const name = useSharedValue(0);
  const rank = useSharedValue(0);
  const button = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    stage.value = withTiming(1, { duration: T.stageIn });
    if (!full) {
      veil.value = withDelay(300, withTiming(0, { duration: 500 }));
      broken.value = withDelay(300, withTiming(1, { duration: 300 }));
      kicker.value = withDelay(500, withTiming(1, { duration: 300 }));
      plate.value = withDelay(500, withTiming(1, { duration: 300 }));
      name.value = withDelay(500, withTiming(1, { duration: 300 }));
      rank.value = withDelay(600, withTiming(1, { duration: 300 }));
      button.value = withDelay(900, withTiming(1, { duration: 300 }));
      return;
    }
    // Caída y aterrizaje.
    drop.value = withDelay(
      T.dropAt,
      withSpring(1, { duration: T.dropIn, dampingRatio: 0.62 }, (finished) => {
        if (finished) scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle.Medium);
      }),
    );
    // Carga del candado.
    charge.value = withDelay(
      T.chargeAt,
      withTiming(1, { duration: T.breakAt - T.chargeAt, easing: Easing.in(Easing.quad) }),
    );
    lockAngle.value = withDelay(
      T.chargeAt,
      withSequence(...CHARGE.map((angle) => withTiming(angle, { duration: T.chargeStep }))),
    );
    // Rotura.
    broken.value = withDelay(
      T.breakAt,
      withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }),
    );
    flash.value = withDelay(
      T.breakAt,
      withSequence(
        withTiming(0.95, { duration: 60 }, (finished) => {
          if (finished) scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle.Heavy);
        }),
        withTiming(0, { duration: 520, easing: EASE_OUT }),
      ),
    );
    veil.value = withDelay(T.breakAt, withTiming(0, { duration: 380, easing: EASE_OUT }));
    shake.value = withSequence(
      withDelay(LANDED_AT, withSequence(...SHAKE_LAND.map((x) => withTiming(x, { duration: SHAKE_STEP })))),
      withDelay(
        T.breakAt - LANDED_AT - SHAKE_LAND.length * SHAKE_STEP,
        withSequence(...SHAKE_BREAK.map((x) => withTiming(x, { duration: SHAKE_STEP }))),
      ),
    );
    // Gloria.
    raysIn.value = withDelay(T.raysAt, withTiming(1, { duration: 700 }));
    spin.value = withDelay(T.raysAt, withRepeat(withTiming(1, { duration: 22000, easing: Easing.linear }), -1, false));
    sheen.value = withDelay(T.sheenAt, withTiming(1, { duration: 900, easing: EASE_IN_OUT }));
    kicker.value = withDelay(T.raysAt, withTiming(1, { duration: 380, easing: EASE_OUT }));
    plate.value = withDelay(T.plateAt, withSpring(1, { duration: 520, dampingRatio: 0.55 }));
    name.value = withDelay(
      T.nameAt,
      withSpring(1, { duration: 560, dampingRatio: 0.5 }, (finished) => {
        if (finished) scheduleOnRN(Haptics.notificationAsync, Haptics.NotificationFeedbackType.Success);
      }),
    );
    rank.value = withDelay(T.rankAt, withSpring(1, { duration: 520, dampingRatio: 0.5 }));
    button.value = withDelay(T.buttonAt, withTiming(1, { duration: 360, easing: EASE_OUT }));
    glow.value = withDelay(
      T.buttonAt + 400,
      withRepeat(withTiming(1, { duration: 1100, easing: EASE_IN_OUT }), -1, true),
    );
  }, [broken, button, charge, drop, flash, full, glow, kicker, lockAngle, name, plate, rank, raysIn, shake, sheen, spin, stage, veil]);

  const stageStyle = useAnimatedStyle(() => ({ opacity: stage.value }));
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const bannerStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, drop.value * 2.5),
    transform: [
      { perspective: 900 },
      { translateY: (1 - drop.value) * -height * 0.45 },
      { rotateX: `${(1 - drop.value) * 68}deg` },
      { scale: 0.62 + drop.value * 0.38 },
    ],
  }));
  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));
  const chargeRing = useAnimatedStyle(() => ({
    opacity: charge.value * (1 - broken.value),
    transform: [{ scale: 1 + charge.value * 0.7 }],
  }));
  const lockWhole = useAnimatedStyle(() => ({
    opacity: broken.value > 0 ? 0 : 1,
    transform: [{ rotate: `${lockAngle.value}deg` }, { scale: 1 + charge.value * 0.12 }],
  }));
  const shackle = useAnimatedStyle(() => ({
    opacity: broken.value > 0 ? 1 - broken.value : 0,
    transform: [
      { translateY: -broken.value * 70 },
      { translateX: broken.value * 18 },
      { rotate: `${broken.value * 70}deg` },
    ],
  }));
  const leftHalf = useAnimatedStyle(() => ({
    opacity: broken.value > 0 ? 1 - broken.value : 0,
    transform: [
      { translateX: -broken.value * 80 },
      { translateY: broken.value * 50 + broken.value * broken.value * 60 },
      { rotate: `${-broken.value * 75}deg` },
    ],
  }));
  const rightHalf = useAnimatedStyle(() => ({
    opacity: broken.value > 0 ? 1 - broken.value : 0,
    transform: [
      { translateX: broken.value * 80 },
      { translateY: broken.value * 40 + broken.value * broken.value * 60 },
      { rotate: `${broken.value * 80}deg` },
    ],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const raysA = useAnimatedStyle(() => ({
    opacity: raysIn.value * 0.95,
    transform: [{ rotate: `${spin.value * 360}deg` }, { scale: 0.8 + raysIn.value * 0.2 }],
  }));
  const raysB = useAnimatedStyle(() => ({
    opacity: raysIn.value * 0.7,
    transform: [{ rotate: `${-spin.value * 520}deg` }],
  }));
  const sheenStyle = useAnimatedStyle(() => ({
    opacity: sheen.value > -1 && sheen.value < 1 ? 1 : 0,
    transform: [{ translateX: sheen.value * bannerWidth * 1.2 }, { rotate: '20deg' }],
  }));
  const kickerStyle = useAnimatedStyle(() => ({
    opacity: kicker.value,
    transform: [{ translateY: (1 - kicker.value) * -16 }, { scale: 0.9 + kicker.value * 0.1 }],
  }));
  const plateStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, plate.value * 2),
    transform: [{ scaleX: Math.max(0.01, plate.value) }],
  }));
  const nameStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, name.value * 2),
    transform: [{ scale: full ? 2.3 - name.value * 1.3 : 1 }],
  }));
  const rankStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, rank.value * 2),
    transform: [{ scale: 0.4 + rank.value * 0.6 }, { rotate: `${(1 - rank.value) * -12}deg` }],
  }));
  const buttonStyle = useAnimatedStyle(() => ({
    opacity: button.value,
    transform: [{ translateY: (1 - button.value) * 14 }, { scale: 1 + glow.value * 0.025 }],
    shadowOpacity: 0.35 + glow.value * 0.45,
  }));

  const raySize = Math.max(width, height) * 1.5;
  const raysPath = useMemo(() => sunburst(raySize / 2, 16), [raySize]);
  const thinRays = useMemo(() => sunburst(raySize / 2, 28), [raySize]);
  const raysTop = height * 0.33 - raySize / 2;
  const lockCenterY = bannerHeight * 0.42;

  return (
    <Animated.View
      accessibilityViewIsModal
      style={[StyleSheet.absoluteFill, { backgroundColor: stageBackground.celebration }, stageStyle]}
    >
      <Svg height={height} style={StyleSheet.absoluteFill} width={width}>
        <Defs>
          <RadialGradient cx="50%" cy="33%" id="unlock-glow" r="65%">
            <Stop offset="0" stopColor={tint.glow} stopOpacity={0.42} />
            <Stop offset="0.5" stopColor={tint.sky[1]} stopOpacity={0.35} />
            <Stop offset="1" stopColor={stageBackground.celebration} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect fill="url(#unlock-glow)" height={height} width={width} />
      </Svg>

      {full ? (
        <>
          <Animated.View
            pointerEvents="none"
            style={[styles.abs, { width: raySize, height: raySize, left: (width - raySize) / 2, top: raysTop }, raysA]}
          >
            <Svg height={raySize} width={raySize}>
              <Path d={raysPath} fill={alpha(tint.glow, 0.1)} />
            </Svg>
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[styles.abs, { width: raySize, height: raySize, left: (width - raySize) / 2, top: raysTop }, raysB]}
          >
            <Svg height={raySize} width={raySize}>
              <Path d={thinRays} fill={alpha(tint.b[0], 0.06)} />
            </Svg>
          </Animated.View>
          <Embers colors={[tint.b[0], tint.glow, ink.white]} count={18} delay={T.breakAt} height={height} width={width} />
        </>
      ) : null}

      <Pressable accessibilityLabel="Cerrar" onPress={onClose} style={StyleSheet.absoluteFill} />

      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.column,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg },
          shakeStyle,
        ]}
      >
        <Animated.View style={kickerStyle}>
          <Text style={{ color: tint.glow, letterSpacing: 2.6, textAlign: 'center' }} variant="footnote" strong>
            {intro ? `ESTÁS EN LA ARENA ${arena.order}` : `¡ARENA ${arena.order} DESBLOQUEADA!`}
          </Text>
        </Animated.View>

        <Animated.View style={[{ width: bannerWidth, height: bannerHeight }, bannerStyle]}>
          <ArenaBanner arena={{ ...arena, state: 'done' }} bare width={bannerWidth} />
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.bannerVeil, veilStyle]} />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.bannerClip]}>
            <Animated.View style={[styles.sheen, { height: bannerHeight * 2 }, sheenStyle]}>
              <LinearGradient
                colors={[alpha(ink.white, 0), alpha(ink.white, 0.5), alpha(ink.white, 0)]}
                end={{ x: 1, y: 0 }}
                start={{ x: 0, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>

          {/* El candado, centrado en la escena. */}
          <View pointerEvents="none" style={[styles.lockAnchor, { top: lockCenterY, left: bannerWidth / 2 }]}>
            <Animated.View
              style={[styles.chargeRing, { borderColor: tint.glow, shadowColor: tint.glow }, chargeRing]}
            />
            <Animated.View style={[styles.lockWhole, lockWhole]}>
              <View style={[styles.shackleShape, { borderColor: onMedia.text }]} />
              <View style={[styles.lockBody, { backgroundColor: tint.b[1] }]}>
                <View style={styles.keyhole} />
              </View>
            </Animated.View>
            <Animated.View style={[styles.shackleOnly, shackle]}>
              <View style={[styles.shackleShape, { borderColor: onMedia.text }]} />
            </Animated.View>
            <Animated.View style={[styles.halfLeft, { backgroundColor: tint.b[1] }, leftHalf]} />
            <Animated.View style={[styles.halfRight, { backgroundColor: tint.b[2] }, rightHalf]} />
            {full ? (
              <>
                <Shockwave color={tint.glow} delay={T.breakAt} duration={720} size={90} thickness={4} to={5} />
                <Shockwave color={ink.white} delay={T.breakAt + 90} duration={620} size={60} thickness={2} to={4} />
                <SparkBurst
                  colors={[tint.b[0], tint.glow, ink.white, tint.b[1]]}
                  count={28}
                  delay={T.breakAt}
                  duration={1100}
                  gravity={90}
                  maxDistance={220}
                  minDistance={70}
                  seed={arena.order * 31}
                />
              </>
            ) : null}
          </View>
          {full ? (
            <View pointerEvents="none" style={[styles.lockAnchor, { top: bannerHeight, left: bannerWidth / 2 }]}>
              <Shockwave
                color={alpha(tint.glow, 0.7)}
                delay={LANDED_AT}
                duration={560}
                size={bannerWidth * 0.5}
                thickness={2}
                to={2.2}
              />
            </View>
          ) : null}
        </Animated.View>

        <View style={styles.nameBlock}>
          <Animated.View
            style={[styles.plate, { backgroundColor: alpha(tint.b[1], 0.18), borderColor: alpha(tint.b[0], 0.6) }, plateStyle]}
          />
          <Animated.View style={nameStyle}>
            <Text style={[styles.name, { color: onMedia.text, textShadowColor: alpha(tint.glow, 0.8) }]} variant="display">
              {arena.name}
            </Text>
          </Animated.View>
          <Animated.View style={kickerStyle}>
            <Text style={{ color: onMedia.textSoft, textAlign: 'center' }} variant="subhead">
              {arena.tagline}
            </Text>
          </Animated.View>
        </View>

        {arena.rankUp && arena.rank ? (
          <Animated.View style={[styles.rankBadge, { backgroundColor: tint.b[1], shadowColor: tint.glow }, rankStyle]}>
            <Ionicons color={ink.black} name="ribbon" size={iconSizes.md} />
            <Text style={{ color: ink.black }} variant="headline">
              {`${intro ? 'Tu rango' : 'Nuevo rango'}: ${arena.rank.name}`}
            </Text>
          </Animated.View>
        ) : null}

        <View style={styles.list}>
          {arena.milestones.map((milestone, index) => (
            <MilestoneLine
              key={milestone}
              color={tint.b[1]}
              delay={full ? T.listAt + index * T.listStagger : 700}
              text={milestone}
            />
          ))}
        </View>

        <Animated.View style={[styles.cta, { shadowColor: tint.glow }, buttonStyle]}>
          <PressableScale accessibilityRole="button" haptic="light" onPress={onClose} style={styles.buttonPress}>
            <LinearGradient
              colors={[tint.b[0], tint.b[1], tint.b[2]]}
              end={{ x: 0, y: 1 }}
              start={{ x: 0, y: 0 }}
              style={styles.button}
            >
              <Text style={{ color: ink.black }} variant="headline">
                Seguir subiendo
              </Text>
            </LinearGradient>
          </PressableScale>
        </Animated.View>
      </Animated.View>

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: ink.white }, flashStyle]} />
    </Animated.View>
  );
}

function MilestoneLine({ text, color, delay }: { text: string; color: string; delay: number }) {
  const reduceMotion = useReducedMotion();
  const shown = useSharedValue(0);
  useEffect(() => {
    shown.value = withDelay(delay, withSpring(1, { duration: 480, dampingRatio: 0.7 }));
  }, [delay, shown]);
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, shown.value * 1.5),
    transform: reduceMotion ? [] : [{ translateX: (1 - shown.value) * -24 }],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    transform: reduceMotion ? [] : [{ scale: shown.value }],
  }));
  return (
    <Animated.View style={[styles.milestone, style]}>
      <Animated.View style={[styles.milestoneDot, { backgroundColor: color }, checkStyle]}>
        <Ionicons color={ink.black} name="flag" size={iconSizes.xs} />
      </Animated.View>
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

const LOCK = 64;

const styles = StyleSheet.create({
  abs: {
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
  bannerClip: {
    borderRadius: radii.xxl,
    overflow: 'hidden',
  },
  sheen: {
    position: 'absolute',
    top: '-50%',
    left: '-30%',
    width: 110,
  },
  lockAnchor: {
    position: 'absolute',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chargeRing: {
    position: 'absolute',
    width: LOCK * 1.5,
    height: LOCK * 1.5,
    borderRadius: LOCK * 0.75,
    borderWidth: 3,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  lockWhole: {
    position: 'absolute',
    alignItems: 'center',
    top: -LOCK * 0.62,
  },
  shackleOnly: {
    position: 'absolute',
    alignItems: 'center',
    top: -LOCK * 0.62,
  },
  shackleShape: {
    width: LOCK * 0.62,
    height: LOCK * 0.5,
    borderWidth: 7,
    borderBottomWidth: 0,
    borderTopLeftRadius: LOCK * 0.31,
    borderTopRightRadius: LOCK * 0.31,
  },
  lockBody: {
    width: LOCK,
    height: LOCK * 0.74,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyhole: {
    width: 10,
    height: 18,
    borderRadius: 5,
    backgroundColor: alpha(ink.black, 0.6),
  },
  halfLeft: {
    position: 'absolute',
    left: -LOCK / 2,
    top: -LOCK * 0.62 + LOCK * 0.5,
    width: LOCK / 2,
    height: LOCK * 0.74,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  halfRight: {
    position: 'absolute',
    left: 0,
    top: -LOCK * 0.62 + LOCK * 0.5,
    width: LOCK / 2,
    height: LOCK * 0.74,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  nameBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    alignSelf: 'stretch',
    paddingVertical: spacing.sm,
  },
  plate: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: radii.xl,
    borderWidth: 1,
  },
  name: {
    textAlign: 'center',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    shadowOpacity: 0.8,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
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
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cta: {
    alignSelf: 'stretch',
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  buttonPress: {
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  button: {
    minHeight: 54,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
