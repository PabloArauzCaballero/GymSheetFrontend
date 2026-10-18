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
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
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
import { scheduleOnRN } from 'react-native-worklets';
import { RewardCardBack, RewardCardFront } from '@/components/cards/reward-card';
import { PREMIUM_EASING } from '@/components/motion';
import { PrizeCode } from '@/components/progression/prize-code';
import { Button } from '@/components/ui';
import {
  alpha,
  colors,
  fontSizes,
  iconSizes,
  minTouchTarget,
  radii,
  semibold,
  spacing,
  stageBackground,
  textVariants,
} from '@/theme';
import { Flash, Halo, Particles, Rays, Stamp } from './card-parts';
import { sceneOf, type CelebrationSubject } from './scene';

/**
 * La carta de recompensa: el único momento teatral de la app.
 *
 * Conseguir una insignia o subir de rango es lo único que la app tiene para
 * *dar*. Copia el lenguaje que la gente ya reconoce como «premio» en los
 * juegos de cartas: llega de dorso, tiembla, revienta, se voltea y se clava un
 * sello. Después se queda viva: flota, el foil la recorre y se inclina con el
 * dedo.
 *
 * El guion sale de `cardTimeline` en `@gymsheet/domain`, el mismo que usa la
 * web. Todo lo que se mueve son valores compartidos de Reanimated —ni un
 * `setState` durante la escena— y cada temporizador muere al desmontar.
 *
 * Avanzar está **cerrado con llave** hasta que la carta se ha leído: antes los
 * botones existían a opacidad cero y un toque adelantado (o doble) saltaba una
 * carta y dejaba temporizadores hápticos de la anterior sonando encima de la
 * siguiente.
 */

const STAGE_BACKGROUND = stageBackground.celebration;

/** Entrada desde abajo con un micro rebote al aterrizar. */
const ENTER_SPRING = { damping: 13, stiffness: 120, mass: 0.9 } as const;
/** El sello rebasa y vuelve: el rebote es el golpe. */
const STAMP_SPRING = { damping: 9, stiffness: 260, mass: 0.7 } as const;
/** La carta vuelve a su sitio al soltarla. */
const TILT_SPRING = { duration: 420, dampingRatio: 0.72 } as const;

const IMPACT: Record<CardHaptic, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

/** Paso de cada tramo de la sacudida, en ms. */
const SHAKE_STEP = 42;
/** Inclinación máxima al arrastrar, en grados. */
const MAX_TILT = 16;
/** Arrastre (pt) o velocidad (pt/s) con que la carta se da por pasada. */
const SWIPE_DISTANCE = 96;
const SWIPE_VELOCITY = 720;
const EXIT_MS = 190;

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
  const { tier, material } = scene;
  const timeline = reduceMotion ? STILL_TIMELINE : cardTimeline(tier);
  const particles = useMemo(
    () => (reduceMotion ? [] : particleField(tier.particles, scene.seed)),
    [reduceMotion, scene.seed, tier.particles],
  );

  const cardWidth = Math.min(236, screenWidth * 0.62, (screenHeight - insets.top - insets.bottom) * 0.3);
  const cardHeight = cardWidth / CARD_ASPECT;
  const hasNext = position < total;
  const remaining = Math.min(2, total - position);
  const readyAt = timeline.text.at + timeline.text.step * 2;

  // La llave: hasta `ready` no se avanza, y una vez pedido no se pide dos veces.
  const [ready, setReady] = useState(reduceMotion);
  const leavingRef = useRef(false);

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
  const sheen = useSharedValue(reduceMotion ? 0.5 : 0);
  const float = useSharedValue(0);
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const dragX = useSharedValue(0);
  const exit = useSharedValue(0);
  const unlocked = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    // Movimiento reducido: al estado final, nunca al inicial. La carta existe,
    // de frente y leída; sólo se omite lo que se mueve y lo que golpea la mano.
    if (reduceMotion) return;

    const t = timeline;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, run: () => void) => timers.push(setTimeout(run, ms));

    // 1 — Entra de dorso desde abajo.
    enter.set(withDelay(t.enter.at, withSpring(1, ENTER_SPRING)));

    // 2 — Tensión: tiembla cada vez más, el halo crece y los rayos asoman.
    const wobbleValues = wobbleKeyframes(tier.wobbleDeg);
    const wobbleStep = t.tension.dur / (wobbleValues.length - 1);
    wobble.set(
      withDelay(
        t.tension.at,
        withSequence(
          ...wobbleValues
            .slice(1)
            .map((value) => withTiming(value, { duration: wobbleStep, easing: Easing.inOut(Easing.sin) })),
        ),
      ),
    );
    glow.set(
      withDelay(
        t.tension.at,
        withSequence(
          withTiming(1, { duration: t.tension.dur, easing: Easing.out(Easing.quad) }),
          withTiming(0.7, { duration: 700, easing: PREMIUM_EASING }),
        ),
      ),
    );
    if (tier.rays > 0) {
      raysIn.set(withDelay(t.tension.at, withTiming(1, { duration: t.tension.dur, easing: PREMIUM_EASING })));
      if (tier.raysSpin) {
        raysSpin.set(
          withDelay(t.tension.at, withRepeat(withTiming(360, { duration: 24000, easing: Easing.linear }), -1, false)),
        );
      }
    }
    tensionTicks(t.tension.dur).forEach((tick) => {
      at(t.tension.at + tick, () => void Haptics.selectionAsync());
    });

    // 3 — Reventón: fogonazo, chispas y sacudida de pantalla.
    flash.set(withDelay(t.burst.at, withTiming(1, { duration: t.burst.dur * 2.4, easing: Easing.out(Easing.cubic) })));
    if (particles.length > 0) {
      const flight = Math.max(...particles.map((particle) => particle.delay + particle.duration));
      sparks.set(withDelay(t.burst.at, withTiming(flight, { duration: flight, easing: Easing.linear })));
    }
    if (tier.shake > 0) {
      const shake = shakeKeyframes(tier.shake);
      shakeX.set(
        withDelay(t.burst.at, withSequence(...shake.x.slice(1).map((value) => withTiming(value, { duration: SHAKE_STEP })))),
      );
      shakeY.set(
        withDelay(t.burst.at, withSequence(...shake.y.slice(1).map((value) => withTiming(value, { duration: SHAKE_STEP })))),
      );
    }
    at(t.burst.at, () => void Haptics.impactAsync(IMPACT[tier.haptic]));

    // 4 — Volteo: el frente aparece a mitad de giro.
    flip.set(withDelay(t.flip.at, withSpring(1, { duration: t.flip.dur + 160, dampingRatio: 0.78 })));
    // El foil no se apaga: cruza la carta, descansa y vuelve. Cuanto más rara, más a menudo.
    const pause = tier.holo === 'rainbow' ? 900 : tier.holo === 'soft' ? 1500 : 2600;
    sheen.set(
      withDelay(
        t.flip.at + t.flip.dur * 0.6,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
            withDelay(pause, withTiming(0, { duration: 0 })),
          ),
          -1,
          false,
        ),
      ),
    );
    // Reposo: la carta flota. Es el único bucle de la escena y tiene causa: es el premio.
    float.set(
      withDelay(t.rest, withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true)),
    );

    // 5 — Sello y texto.
    stamp.set(withDelay(t.stamp.at, withSpring(1, STAMP_SPRING)));
    at(t.stamp.at + 60, () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid));
    heading.set(withDelay(t.text.at, withTiming(1, { duration: t.text.dur, easing: PREMIUM_EASING })));
    flavor.set(withDelay(t.text.at + t.text.step, withTiming(1, { duration: t.text.dur, easing: PREMIUM_EASING })));
    actions.set(withDelay(readyAt, withTiming(1, { duration: t.text.dur, easing: PREMIUM_EASING })));
    at(t.text.at, () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    at(readyAt, () => {
      unlocked.set(1);
      setReady(true);
    });

    return () => {
      timers.forEach(clearTimeout);
      [
        enter, wobble, glow, raysIn, raysSpin, flash, sparks, shakeX, shakeY, flip, stamp, heading, flavor, actions,
        sheen, float, tiltX, tiltY, dragX, exit,
      ].forEach((value) => cancelAnimation(value));
    };
    // Los valores compartidos son estables; el guion se vuelve a correr
    // remontando la escena con otra `key`, no cambiando dependencias.
  }, [reduceMotion]);

  /** Una celebración que sólo existe como luz no existe para quien no la ve. */
  useEffect(() => {
    const timer = setTimeout(() => {
      AccessibilityInfo.announceForAccessibility(scene.announcement);
    }, 450);
    return () => clearTimeout(timer);
  }, [scene.announcement]);

  /**
   * Pasar a la siguiente (o salir): una sola vez por carta. La carta sale por la
   * izquierda y sólo entonces se remonta la escena: así nunca conviven dos guiones.
   */
  const leave = () => {
    if (!ready || leavingRef.current) return;
    leavingRef.current = true;
    if (reduceMotion) {
      onAdvance();
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    exit.set(withTiming(1, { duration: EXIT_MS, easing: Easing.bezier(0.4, 0, 1, 1) }));
    setTimeout(onAdvance, EXIT_MS);
  };
  const replay = () => {
    if (!ready || leavingRef.current) return;
    leavingRef.current = true;
    onReplay();
  };
  const close = () => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    onClose();
  };

  /** Tocar la carta la vuelve a voltear: de frente a dorso y de vuelta. */
  const reflip = Gesture.Tap()
    .enabled(!reduceMotion)
    .onEnd(() => {
      'worklet';
      if (unlocked.get() < 1) return;
      scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle.Light);
      flip.set(
        withSequence(
          withTiming(0, { duration: 240, easing: Easing.bezier(0.4, 0, 1, 1) }),
          withSpring(1, { duration: 520, dampingRatio: 0.7 }),
        ),
      );
    });

  /** Arrastrar la inclina (y mueve el foil); un arrastre largo a la izquierda la pasa. */
  const tilt = Gesture.Pan()
    .enabled(!reduceMotion)
    .onChange((event) => {
      'worklet';
      if (unlocked.get() < 1) return;
      tiltX.set(Math.max(-1, Math.min(1, event.translationX / (cardWidth * 0.9))));
      tiltY.set(Math.max(-1, Math.min(1, event.translationY / (cardHeight * 0.9))));
      dragX.set(event.translationX < 0 ? event.translationX * 0.55 : event.translationX * 0.2);
    })
    .onEnd((event) => {
      'worklet';
      const passed = event.translationX < -SWIPE_DISTANCE || event.velocityX < -SWIPE_VELOCITY;
      tiltX.set(withSpring(0, TILT_SPRING));
      tiltY.set(withSpring(0, TILT_SPRING));
      if (passed && unlocked.get() >= 1) {
        scheduleOnRN(leave);
        return;
      }
      dragX.set(withSpring(0, { ...TILT_SPRING, velocity: event.velocityX }));
    });

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.get() }, { translateY: shakeY.get() }],
  }));

  const lift = screenHeight * 0.55;
  const cardStyle = useAnimatedStyle(() => {
    const turn = Math.min(1, Math.max(0, flip.get()));
    const out = exit.get();
    return {
      opacity: Math.min(1, enter.get() * 2) * (1 - out),
      transform: [
        { translateX: dragX.get() - out * screenWidth * 0.7 },
        { translateY: (1 - enter.get()) * lift + (float.get() - 0.5) * 8 },
        { perspective: CARD_PERSPECTIVE },
        { rotateY: `${tiltX.get() * MAX_TILT}deg` },
        { rotateX: `${-tiltY.get() * MAX_TILT}deg` },
        { scale: 0.82 + enter.get() * 0.18 + Math.sin(turn * Math.PI) * 0.12 },
        { rotateZ: `${wobble.get() - out * 10}deg` },
      ],
    };
  });
  // Las dos caras giran juntas; la opacidad a mitad de giro es la red de
  // seguridad para Android, donde `backfaceVisibility` no siempre se respeta.
  const backStyle = useAnimatedStyle(() => ({
    opacity: flip.get() < 0.5 ? 1 : 0,
    transform: [{ perspective: CARD_PERSPECTIVE }, { rotateY: `${flip.get() * 180}deg` }],
  }));
  const frontStyle = useAnimatedStyle(() => ({
    opacity: flip.get() >= 0.5 ? 1 : 0,
    transform: [{ perspective: CARD_PERSPECTIVE }, { rotateY: `${flip.get() * 180 - 180}deg` }],
  }));
  const deckStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, enter.get() * 2) * 0.9 }));
  const headingStyle = useAnimatedStyle(() => ({
    opacity: heading.get() * (1 - exit.get()),
    transform: [{ translateY: (1 - heading.get()) * 14 }],
  }));
  const flavorStyle = useAnimatedStyle(() => ({
    opacity: flavor.get() * (1 - exit.get()),
    transform: [{ translateY: (1 - flavor.get()) * 14 }],
  }));
  const actionsStyle = useAnimatedStyle(() => ({
    opacity: actions.get(),
    transform: [{ translateY: (1 - actions.get()) * 12 }],
  }));

  const face = { position: 'absolute', width: cardWidth, height: cardHeight, backfaceVisibility: 'hidden' } as const;
  const content = {
    rarity: scene.rarity,
    art: scene.art,
    title: scene.title,
    rarityLabel: scene.rarityLabel,
    points: scene.points,
    code: scene.code,
  } as const;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View accessibilityViewIsModal style={{ flex: 1, backgroundColor: STAGE_BACKGROUND }}>
        <Animated.View style={[{ flex: 1 }, shakeStyle]}>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
            {tier.rays > 0 && !reduceMotion ? (
              <Rays
                alpha={Math.min(tier.rays, 0.34)}
                appear={raysIn}
                size={Math.max(screenWidth, screenHeight) * 1.25}
                spin={raysSpin}
                tint={material.glow}
              />
            ) : null}
            <Halo level={glow} size={cardWidth * 1.9} tint={material.shadow} />
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
              {/* El mazo: lo que queda por abrir asoma detrás. */}
              {Array.from({ length: remaining }, (_, index) => remaining - index).map((depth) => (
                <Animated.View
                  key={depth}
                  pointerEvents="none"
                  style={[
                    {
                      position: 'absolute',
                      width: cardWidth,
                      height: cardHeight,
                      borderRadius: cardWidth * 0.085,
                      borderCurve: 'continuous',
                      borderWidth: 1,
                      borderColor: alpha(material.label, 0.35),
                      backgroundColor: colors.surfaceHigh,
                      transform: [{ translateY: depth * 10 }, { scale: 1 - depth * 0.05 }, { rotateZ: `${depth * 2.5}deg` }],
                    },
                    deckStyle,
                  ]}
                />
              ))}

              <GestureDetector gesture={Gesture.Simultaneous(tilt, reflip)}>
                <Animated.View
                  accessibilityHint="Toca para voltearla otra vez. Desliza a la izquierda para pasar."
                  accessibilityLabel={`${scene.heading} ${scene.title}`}
                  accessibilityRole="image"
                  accessible
                  style={[
                    {
                      width: cardWidth,
                      height: cardHeight,
                      shadowColor: material.shadow,
                      shadowOpacity: 0.55,
                      shadowRadius: 28,
                      shadowOffset: { width: 0, height: 14 },
                    },
                    cardStyle,
                  ]}
                >
                  <Animated.View style={[face, backStyle]}>
                    <RewardCardBack height={cardHeight} rarity={scene.rarity} width={cardWidth} />
                  </Animated.View>
                  <Animated.View style={[face, frontStyle]}>
                    <RewardCardFront
                      content={content}
                      height={cardHeight}
                      pointsDelayMs={timeline.text.at}
                      sweep={sheen}
                      tiltX={tiltX}
                      tiltY={tiltY}
                      width={cardWidth}
                    />
                  </Animated.View>
                </Animated.View>
              </GestureDetector>

              {reduceMotion ? null : (
                <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                  <Flash progress={flash} size={cardHeight * 1.2} />
                  <Particles clock={sparks} particles={particles} reach={cardWidth} tier={tier} />
                </View>
              )}
              {scene.stamp ? <Stamp exit={exit} label={scene.stamp} material={material} progress={stamp} /> : null}
            </View>

            <View style={{ alignItems: 'center', gap: spacing.xs, maxWidth: 340 }}>
              <Animated.View style={headingStyle}>
                <Text
                  accessibilityRole="header"
                  maxFontSizeMultiplier={1.3}
                  style={[textVariants.display, { color: colors.text, fontSize: fontSizes.xl, lineHeight: Math.round(fontSizes.xl * 1.12), textAlign: 'center' }]}
                >
                  {scene.heading}
                </Text>
              </Animated.View>
              <Animated.View style={flavorStyle}>
                <Text
                  maxFontSizeMultiplier={1.3}
                  style={{ color: colors.textSecondary, fontSize: fontSizes.md, lineHeight: 24, textAlign: 'center' }}
                >
                  {scene.flavor}
                </Text>
              </Animated.View>
              {scene.code ? (
                // El premio es real: el código se enseña en recepción, así que va
                // grande, seleccionable y con copiar. Llega con el texto, no antes.
                <Animated.View style={[{ marginTop: spacing.sm, alignItems: 'center' }, flavorStyle]}>
                  <PrizeCode code={scene.code} ink={material.label} />
                </Animated.View>
              ) : null}
            </View>
          </View>

          <Animated.View
            // Antes de `ready` los botones no existen para el dedo: ni toque adelantado ni doble.
            pointerEvents={ready ? 'auto' : 'none'}
            style={[
              { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.md },
              actionsStyle,
            ]}
          >
            <Button
              label={hasNext ? `Siguiente · ${position} de ${total}` : total > 1 ? 'Listo' : 'Seguir'}
              onPress={leave}
            />
            {reduceMotion ? null : <Button label="Volver a verla" onPress={replay} variant="ghost" />}
          </Animated.View>
        </Animated.View>

        {total > 1 ? (
          <View
            accessibilityLabel={`Recompensa ${position} de ${total}`}
            accessible
            style={{
              position: 'absolute',
              top: insets.top + spacing.sm,
              left: spacing.lg,
              height: minTouchTarget,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {Array.from({ length: total }, (_, index) => (
              <View
                key={index}
                style={{
                  width: index + 1 === position ? 20 : 8,
                  height: 8,
                  borderRadius: radii.full,
                  backgroundColor: index + 1 <= position ? material.label : colors.surfaceHighest,
                }}
              />
            ))}
            <Text style={{ marginLeft: spacing.xs, color: colors.textMuted, fontSize: fontSizes.footnote, fontWeight: semibold, fontVariant: ['tabular-nums'] }}>
              {`${position} de ${total}`}
            </Text>
          </View>
        ) : null}

        <Pressable
          accessibilityLabel="Cerrar la recompensa"
          accessibilityRole="button"
          onPress={close}
          style={{
            position: 'absolute',
            top: insets.top + spacing.sm,
            right: spacing.md,
            width: minTouchTarget,
            height: minTouchTarget,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radii.full,
            backgroundColor: colors.surfaceHigh,
          }}
        >
          <Ionicons color={colors.textSecondary} name="close" size={iconSizes.md} />
        </Pressable>
      </View>
    </GestureHandlerRootView>
  );
}
