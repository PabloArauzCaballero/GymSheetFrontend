import { Ionicons } from '@expo/vector-icons';
import {
  CARD_ASPECT,
  CARD_PERSPECTIVE,
  STILL_TIMELINE,
  cardTimeline,
  particleField,
  shakeKeyframes,
  tensionTicks,
  wobbleKeyframes,
  type CardHaptic,
} from '@gymsheet/domain';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PREMIUM_EASING } from '@/components/motion';
import { Button } from '@/components/ui';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';
import { CardBack, CardFront, Flash, Halo, Particles, Rays, Stamp } from './card-parts';
import { sceneOf, type CelebrationSubject } from './scene';

/**
 * La carta de recompensa: el único momento teatral de la app.
 *
 * Conseguir una insignia o subir de rango es lo único que la app tiene para
 * *dar*. El resto de pantallas siguen contenidas; esto es la excepción
 * declarada, y por eso copia el lenguaje que la gente ya reconoce como «premio»
 * en los juegos de cartas: llega de dorso, tiembla, revienta, se voltea y se
 * clava un sello.
 *
 * El guion no se decide aquí: sale de `cardTimeline` en `@gymsheet/domain`, el
 * mismo que usa la web. Todo lo que se mueve son valores compartidos de
 * Reanimated —ni un `setState` durante la escena— y cada temporizador muere al
 * desmontar.
 */

/**
 * Fondo casi negro, no negro: un haz sobre `#000` puro no tiene aire que
 * iluminar y en OLED el degradado se corta con borde visible.
 */
const STAGE_BACKGROUND = '#050507';

/** Entrada desde abajo con un micro rebote al aterrizar. */
const ENTER_SPRING = { damping: 13, stiffness: 120, mass: 0.9 } as const;
/** El sello rebasa y vuelve: el rebote es el golpe. */
const STAMP_SPRING = { damping: 9, stiffness: 260, mass: 0.7 } as const;

const IMPACT: Record<CardHaptic, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

/** Paso de cada tramo de la sacudida, en ms. */
const SHAKE_STEP = 42;

export function CardStage({
  subject,
  position,
  total,
  onAdvance,
  onReplay,
  onClose,
}: {
  subject: CelebrationSubject;
  position: number;
  total: number;
  onAdvance: () => void;
  onReplay: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const scene = useMemo(() => sceneOf(subject), [subject]);
  const { tier } = scene;
  const timeline = reduceMotion ? STILL_TIMELINE : cardTimeline(tier);
  const particles = useMemo(
    () => (reduceMotion ? [] : particleField(tier.particles, scene.seed)),
    [reduceMotion, scene.seed, tier.particles],
  );

  const cardWidth = Math.min(220, screenWidth * 0.58);
  const cardHeight = cardWidth / CARD_ASPECT;
  const hasNext = position < total;

  const enter = useSharedValue(reduceMotion ? 1 : 0);
  const wobble = useSharedValue(0);
  const glow = useSharedValue(reduceMotion ? 0.6 : 0);
  const raysIn = useSharedValue(0);
  const raysSpin = useSharedValue(0);
  const flash = useSharedValue(0);
  const sparks = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const shakeY = useSharedValue(0);
  const flip = useSharedValue(reduceMotion ? 1 : 0);
  const stamp = useSharedValue(reduceMotion ? 1 : 0);
  const heading = useSharedValue(reduceMotion ? 1 : 0);
  const flavor = useSharedValue(reduceMotion ? 1 : 0);
  const actions = useSharedValue(reduceMotion ? 1 : 0);
  const sheen = useSharedValue(0);

  useEffect(() => {
    // Movimiento reducido: al estado final, nunca al inicial. La carta existe,
    // de frente y leída; sólo se omite lo que se mueve y lo que golpea la mano.
    if (reduceMotion) return;

    const t = timeline;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, run: () => void) => timers.push(setTimeout(run, ms));

    // 1 — Entra de dorso desde abajo.
    enter.value = withDelay(t.enter.at, withSpring(1, ENTER_SPRING));

    // 2 — Tensión: tiembla cada vez más, el halo crece y los rayos asoman.
    const wobbleValues = wobbleKeyframes(tier.wobbleDeg);
    const wobbleStep = t.tension.dur / (wobbleValues.length - 1);
    wobble.value = withDelay(
      t.tension.at,
      withSequence(
        ...wobbleValues
          .slice(1)
          .map((value) => withTiming(value, { duration: wobbleStep, easing: Easing.inOut(Easing.sin) })),
      ),
    );
    glow.value = withDelay(
      t.tension.at,
      withSequence(
        withTiming(1, { duration: t.tension.dur, easing: Easing.in(Easing.quad) }),
        withTiming(0.6, { duration: 700, easing: PREMIUM_EASING }),
      ),
    );
    if (tier.rays > 0) {
      raysIn.value = withDelay(t.tension.at, withTiming(1, { duration: t.tension.dur, easing: PREMIUM_EASING }));
      if (tier.raysSpin) {
        raysSpin.value = withDelay(
          t.tension.at,
          withRepeat(withTiming(360, { duration: 24000, easing: Easing.linear }), -1, false),
        );
      }
    }
    tensionTicks(t.tension.dur).forEach((tick) => {
      at(t.tension.at + tick, () => void Haptics.selectionAsync());
    });

    // 3 — Reventón: fogonazo, chispas y sacudida de pantalla.
    flash.value = withDelay(t.burst.at, withTiming(1, { duration: t.burst.dur * 2.4, easing: Easing.out(Easing.cubic) }));
    if (particles.length > 0) {
      const flight = Math.max(...particles.map((particle) => particle.delay + particle.duration));
      sparks.value = withDelay(t.burst.at, withTiming(flight, { duration: flight, easing: Easing.linear }));
    }
    if (tier.shake > 0) {
      const shake = shakeKeyframes(tier.shake);
      shakeX.value = withDelay(
        t.burst.at,
        withSequence(...shake.x.slice(1).map((value) => withTiming(value, { duration: SHAKE_STEP }))),
      );
      shakeY.value = withDelay(
        t.burst.at,
        withSequence(...shake.y.slice(1).map((value) => withTiming(value, { duration: SHAKE_STEP }))),
      );
    }
    at(t.burst.at, () => void Haptics.impactAsync(IMPACT[tier.haptic]));

    // 4 — Volteo: el frente aparece a mitad de giro.
    flip.value = withDelay(t.flip.at, withTiming(1, { duration: t.flip.dur, easing: Easing.bezier(0.2, 0.8, 0.2, 1) }));
    sheen.value = withDelay(
      t.flip.at + t.flip.dur * 0.6,
      tier.holo === 'none'
        ? withTiming(1, { duration: 900, easing: PREMIUM_EASING })
        : withRepeat(
            withSequence(
              withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
              withDelay(1900, withTiming(0, { duration: 0 })),
            ),
            -1,
            false,
          ),
    );

    // 5 — Sello y texto.
    stamp.value = withDelay(t.stamp.at, withSpring(1, STAMP_SPRING));
    at(t.stamp.at + 60, () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid));
    heading.value = withDelay(t.text.at, withTiming(1, { duration: t.text.dur, easing: PREMIUM_EASING }));
    flavor.value = withDelay(t.text.at + t.text.step, withTiming(1, { duration: t.text.dur, easing: PREMIUM_EASING }));
    actions.value = withDelay(
      t.text.at + t.text.step * 2,
      withTiming(1, { duration: t.text.dur, easing: PREMIUM_EASING }),
    );
    at(t.text.at, () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

    return () => {
      timers.forEach(clearTimeout);
      [enter, wobble, glow, raysIn, raysSpin, flash, sparks, shakeX, shakeY, flip, stamp, heading, flavor, actions, sheen].forEach(
        (value) => cancelAnimation(value),
      );
    };
    // Los valores compartidos son estables; el guion se vuelve a correr
    // remontando la escena con otra `key`, no cambiando dependencias.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  /** Una celebración que sólo existe como luz no existe para quien no la ve. */
  useEffect(() => {
    const timer = setTimeout(() => {
      AccessibilityInfo.announceForAccessibility(scene.announcement);
    }, 450);
    return () => clearTimeout(timer);
  }, [scene.announcement]);

  /** Tocar la carta la vuelve a voltear: de frente a dorso y de vuelta con rebase. */
  const reflip = () => {
    if (reduceMotion) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    flip.value = withSequence(
      withTiming(0, { duration: 260, easing: Easing.in(Easing.cubic) }),
      withTiming(1, { duration: 460, easing: Easing.out(Easing.back(1.6)) }),
    );
    sheen.value = withSequence(withTiming(0, { duration: 0 }), withDelay(300, withTiming(1, { duration: 900 })));
  };

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }, { translateY: shakeY.value }],
  }));

  const lift = screenHeight * 0.55;
  const cardStyle = useAnimatedStyle(() => {
    const turn = Math.min(1, Math.max(0, flip.value));
    return {
      opacity: Math.min(1, enter.value * 2),
      transform: [
        { translateY: (1 - enter.value) * lift },
        { scale: 0.82 + enter.value * 0.18 + Math.sin(turn * Math.PI) * 0.12 },
        { rotateZ: `${wobble.value}deg` },
      ],
    };
  });
  // Las dos caras giran juntas; la opacidad a mitad de giro es la red de
  // seguridad para Android, donde `backfaceVisibility` no siempre se respeta.
  const backStyle = useAnimatedStyle(() => ({
    opacity: flip.value < 0.5 ? 1 : 0,
    transform: [{ perspective: CARD_PERSPECTIVE }, { rotateY: `${flip.value * 180}deg` }],
  }));
  const frontStyle = useAnimatedStyle(() => ({
    opacity: flip.value >= 0.5 ? 1 : 0,
    transform: [{ perspective: CARD_PERSPECTIVE }, { rotateY: `${flip.value * 180 - 180}deg` }],
  }));
  const headingStyle = useAnimatedStyle(() => ({
    opacity: heading.value,
    transform: [{ translateY: (1 - heading.value) * 14 }],
  }));
  const flavorStyle = useAnimatedStyle(() => ({
    opacity: flavor.value,
    transform: [{ translateY: (1 - flavor.value) * 14 }],
  }));
  const actionsStyle = useAnimatedStyle(() => ({ opacity: actions.value }));

  const face = { position: 'absolute', width: cardWidth, height: cardHeight, backfaceVisibility: 'hidden' } as const;

  return (
    <View accessibilityViewIsModal style={{ flex: 1, backgroundColor: STAGE_BACKGROUND }}>
      <Animated.View style={[{ flex: 1 }, shakeStyle]}>
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          {tier.rays > 0 && !reduceMotion ? (
            <Rays alpha={tier.rays} appear={raysIn} size={Math.max(screenWidth, screenHeight) * 1.25} spin={raysSpin} tint={tier.glow} />
          ) : null}
          <Halo level={glow} size={cardWidth * 1.9} tint={tier.glow} />
        </View>

        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.lg,
            paddingTop: insets.top + minTouchTarget,
            paddingHorizontal: spacing.lg,
          }}
        >
          <View style={{ width: cardWidth, height: cardHeight, alignItems: 'center', justifyContent: 'center' }}>
            <Pressable
              accessibilityHint="Toca para voltearla otra vez"
              accessibilityLabel={`${scene.heading} ${scene.title}`}
              accessibilityRole="imagebutton"
              onPress={reflip}
            >
              <Animated.View style={[{ width: cardWidth, height: cardHeight }, cardStyle]}>
                <Animated.View style={[face, backStyle]}>
                  <CardBack tier={tier} width={cardWidth} />
                </Animated.View>
                <Animated.View style={[face, frontStyle]}>
                  <CardFront
                    height={cardHeight}
                    pointsDelayMs={timeline.text.at}
                    scene={scene}
                    sweep={sheen}
                    width={cardWidth}
                  />
                </Animated.View>
              </Animated.View>
            </Pressable>

            {reduceMotion ? null : (
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                <Flash progress={flash} size={cardHeight * 1.2} />
                <Particles clock={sparks} particles={particles} reach={cardWidth} tier={tier} />
              </View>
            )}
            {scene.stamp ? <Stamp label={scene.stamp} progress={stamp} tier={tier} /> : null}
          </View>

          <View style={{ alignItems: 'center', gap: spacing.xs, maxWidth: 340 }}>
            <Animated.View style={headingStyle}>
              <Text
                accessibilityRole="header"
                style={{
                  color: colors.text,
                  fontSize: fontSizes['2xl'],
                  fontWeight: semibold,
                  letterSpacing: fontSizes['2xl'] * -0.03,
                  textAlign: 'center',
                }}
              >
                {scene.heading}
              </Text>
            </Animated.View>
            <Animated.View style={flavorStyle}>
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.md, lineHeight: 24, textAlign: 'center' }}>
                {scene.flavor}
              </Text>
            </Animated.View>
          </View>
        </View>

        <Animated.View
          style={[
            { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.md },
            actionsStyle,
          ]}
        >
          <Button label={hasNext ? 'Siguiente' : 'Seguir'} onPress={onAdvance} />
          {reduceMotion ? null : <Button label="Volver a verla" onPress={onReplay} variant="ghost" />}
        </Animated.View>
      </Animated.View>

      {total > 1 ? (
        <Text
          style={{
            position: 'absolute',
            top: insets.top + spacing.sm + 12,
            left: spacing.lg,
            color: colors.textMuted,
            fontSize: fontSizes.sm,
            fontWeight: semibold,
            fontVariant: ['tabular-nums'],
          }}
        >
          {`${position} de ${total}`}
        </Text>
      ) : null}

      <Pressable
        accessibilityLabel="Cerrar la recompensa"
        accessibilityRole="button"
        onPress={onClose}
        style={{
          position: 'absolute',
          top: insets.top + spacing.sm,
          right: spacing.md,
          width: minTouchTarget,
          height: minTouchTarget,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radii.full,
        }}
      >
        <Ionicons color={colors.textMuted} name="close" size={iconSizes.lg} />
      </Pressable>
    </View>
  );
}
