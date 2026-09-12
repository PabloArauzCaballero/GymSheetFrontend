import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, Text, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Motion identity for the app — one archetype applied everywhere: **Premium**.
 * Calm and deliberate, never bouncy. Three constants, per the motion-design
 * brand-identity rule:
 *
 * 1. Signature curve: `(0.4, 0, 0.2, 1)` — used by ~80% of transitions.
 * 2. Duration palette: quick / standard / slow.
 * 3. Entrance pattern: rise 16px + fade, decelerating.
 *
 * Exits are deliberately shorter than entrances: users care about what arrives,
 * and a slow dismissal reads as lag.
 */
export const PREMIUM_EASING = Easing.bezier(0.4, 0, 0.2, 1);

export const DURATION = {
  /** Press feedback — must feel instant. */
  quick: 140,
  /** Cards and panels arriving. */
  standard: 280,
  /** Screen-level context switches. */
  slow: 420,
  /** Leaving is faster than arriving. */
  exit: 180,
} as const;

/**
 * Press spring tuned for **zero visible overshoot**: the Premium archetype
 * settles, it does not bounce. High damping plus low mass keeps it responsive
 * without wobble.
 */
const PRESS_SPRING = { damping: 26, stiffness: 340, mass: 0.5, overshootClamping: true } as const;

/** Micro-cascade delay; capped so the last row never waits on a queue. */
const STAGGER_MS = 40;
const MAX_STAGGERED = 6;

/**
 * Tactile surface. Scale plus a slight dim: two properties, "polished" on the
 * simplicity scale, and neither one touches layout so nothing around it shifts.
 */
export function PressableScale({
  children,
  onPress,
  disabled = false,
  accessibilityLabel,
  style,
}: {
  children: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const pressed = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : 1 - pressed.value * 0.03 }],
    opacity: 1 - pressed.value * 0.12,
  }));

  return (
    <AnimatedPressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        pressed.value = withSpring(1, PRESS_SPRING);
        // A light tick on contact. Fired on press-in, not on press-out, so the
        // phone answers the finger at the moment of touch rather than after the
        // action resolves — that delay is what reads as an unresponsive app.
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      onPressOut={() => {
        // Release settles a touch slower than the press — follow-through.
        pressed.value = withTiming(0, { duration: DURATION.quick, easing: PREMIUM_EASING });
      }}
      style={[animated, style]}
    >
      {children}
    </AnimatedPressable>
  );
}

/**
 * Entrance for stacked content: rise + fade, decelerating, staggered in reading
 * order so the eye is led down the screen exactly once.
 */
export function EnterUp({
  children,
  index = 0,
  style,
}: {
  children: ReactNode;
  index?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduceMotion = useReducedMotion();
  const delay = Math.min(index, MAX_STAGGERED) * STAGGER_MS;

  return (
    <Animated.View
      entering={
        reduceMotion
          ? // Reduced motion still needs the element to appear, just without travel.
            FadeIn.duration(1)
          : FadeInDown.duration(DURATION.standard)
              .easing(PREMIUM_EASING)
              .withInitialValues({ transform: [{ translateY: 16 }] })
              .delay(delay)
      }
      style={style}
    >
      {children}
    </Animated.View>
  );
}

/**
 * El latido de los chips. Gemelo exacto de `@keyframes chip-heartbeat` de la
 * web: mismos tiempos, misma escala, mismo silencio.
 *
 * Un corazon no hace una onda senoidal: da dos golpes seguidos y descansa. El
 * silencio ocupa dos tercios del ciclo a proposito — es lo que separa un acento
 * de un estrobo.
 *
 * La escala se queda en 1.045 porque un chip es una pildora pequeña pegada a un
 * texto: cualquier cosa mayor empuja visualmente a lo que tiene al lado y
 * convierte al chip en el elemento mas llamativo de la pantalla, que es justo
 * lo que un chip no debe ser.
 */
const BEAT = {
  /** Golpe fuerte. */
  up: 208,
  /** Vuelta. */
  down: 234,
  /** Golpe corto. */
  echoUp: 208,
  echoDown: 234,
  /** El descanso, que es lo que lo hace un latido y no un parpadeo. */
  rest: 1716,
} as const;

const BIG = 1.045;
const SMALL = 1.028;

/**
 * Envuelve un chip para que lata.
 *
 * `alignSelf: 'flex-start'` importa: sin el, esta capa se estira a todo el
 * ancho disponible y el escalado deja de tener el chip por centro, asi que el
 * chip cabecea en lugar de latir.
 *
 * Todos los chips laten a la vez, sin desfase: es lo mismo que hace la web, y
 * la simetria entre las dos plataformas es la que permite decir «los chips de
 * GymSheet laten asi» en vez de describir dos comportamientos distintos.
 */
export function Heartbeat({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    // Con «reducir movimiento» no se arranca nada: un bucle infinito es
    // exactamente lo que esa preferencia existe para apagar.
    if (reduceMotion) {
      scale.value = 1;
      return;
    }
    const ease = { easing: PREMIUM_EASING };
    scale.value = withRepeat(
      withSequence(
        withTiming(BIG, { duration: BEAT.up, ...ease }),
        withTiming(1, { duration: BEAT.down, ...ease }),
        withTiming(SMALL, { duration: BEAT.echoUp, ...ease }),
        withTiming(1, { duration: BEAT.echoDown, ...ease }),
        withTiming(1, { duration: BEAT.rest }),
      ),
      -1,
      false,
    );
    return () => {
      // Detener el bucle al desmontar: sin esto cada chip que sale de pantalla
      // deja su animacion viva en el hilo de UI.
      cancelAnimation(scale);
    };
  }, [reduceMotion, scale]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[{ alignSelf: 'flex-start' }, style, animated]}>{children}</Animated.View>
  );
}

/**
 * Un número que SUBE hasta su valor en vez de aparecer puesto.
 *
 * Gemelo del `CountUp` de la web: misma curva (ease-out cúbica), misma
 * duración, mismo respeto por «reducir movimiento» —con ella puesta salta
 * directo al valor final, porque una cifra que se mueve sola es justo lo que
 * esa preferencia pide evitar—.
 *
 * Vive en su propio componente y no dentro de quien lo usa por una razón
 * concreta: cuenta repintando, un fotograma por render, y aislarlo deja ese
 * repintado en un `Text` de dos líneas en vez de arrastrar en cada fotograma a
 * la tarjeta entera que lo rodea.
 *
 * `accessibilityLabel` lleva el valor final desde el primer momento: sin él, un
 * lector de pantalla narra la cuenta entera.
 */
export function CountUpText({
  value,
  durationMs = 900,
  style,
}: {
  value: number;
  durationMs?: number;
  style?: StyleProp<TextStyle>;
}) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (reduceMotion || value === 0) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    let start: number | null = null;
    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min(1, (timestamp - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [durationMs, reduceMotion, value]);

  return (
    <Text accessibilityLabel={value.toLocaleString('es-ES')} style={style}>
      {display.toLocaleString('es-ES')}
    </Text>
  );
}
