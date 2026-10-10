import { countUpDuration } from '@gymsheet/domain';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type AccessibilityRole,
  type AccessibilityState,
  type Insets,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { colors, glideSpring, pressSpring, radii, settleSpring } from '@/theme';

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
export const PRESS_SPRING = pressSpring;

/**
 * Para lo que se ASIENTA en un sitio —píldoras, anillos, hojas— en vez de
 * responder a un dedo: algo más lento que `PRESS_SPRING`, sin rebote. Es el
 * muelle de toda transición de posición, para que dos cosas que se mueven a la
 * vez en pantalla compartan el mismo carácter.
 */
export const SETTLE_SPRING = settleSpring;

/** Micro-cascade delay; capped so the last row never waits on a queue. */
const STAGGER_MS = 40;
const MAX_STAGGERED = 6;

/**
 * Qué responde el teléfono al tocar. Los hápticos son para confirmar y para
 * marcar una selección, no para decorar: `light` es el por defecto histórico de
 * la app y `none` es lo correcto para lo que sólo navega (volver, cerrar), donde
 * un golpe en cada toque acaba siendo ruido.
 */
export type PressHaptic = 'none' | 'light' | 'selection' | 'medium';

const HAPTICS: Record<Exclude<PressHaptic, 'none'>, () => void> = {
  light: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  selection: () => void Haptics.selectionAsync(),
};

/**
 * Tactile surface. Scale plus a slight dim: two properties, "polished" on the
 * simplicity scale, and neither one touches layout so nothing around it shifts.
 *
 * `scaleTo` baja de 0.97 para lo pequeño: un icono de 24 px que se hunde un 3 %
 * se hunde 0,7 px, que no se ve; 0.94 es lo que se nota sin salirse de la banda
 * de 0.95–1.05 que recomienda la guía de interacción para controles táctiles.
 * Con «Reducir movimiento» (leído EN VIVO, no al arrancar) no hay escala, sólo
 * el atenuado.
 */
export function PressableScale({
  children,
  onPress,
  onLongPress,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  accessibilityState,
  hitSlop,
  haptic = 'light',
  scaleTo = 0.97,
  style,
  testID,
}: {
  children: ReactNode;
  onPress: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  hitSlop?: number | Insets;
  haptic?: PressHaptic;
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const pressed = useSharedValue(0);
  const reduceMotion = useReduceMotion();

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : 1 - pressed.value * (1 - scaleTo) }],
    opacity: 1 - pressed.value * 0.12,
  }));

  return (
    <AnimatedPressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ ...accessibilityState, disabled: disabled || accessibilityState?.disabled }}
      disabled={disabled}
      hitSlop={hitSlop}
      onLongPress={onLongPress}
      onPress={onPress}
      onPressIn={() => {
        pressed.value = withSpring(1, PRESS_SPRING);
        // A tick on contact. Fired on press-in, not on press-out, so the phone
        // answers the finger at the moment of touch rather than after the
        // action resolves — that delay is what reads as an unresponsive app.
        if (haptic !== 'none') HAPTICS[haptic]();
      }}
      onPressOut={() => {
        // Release settles a touch slower than the press — follow-through.
        pressed.value = withTiming(0, { duration: DURATION.quick, easing: PREMIUM_EASING });
      }}
      style={[animated, style]}
      testID={testID}
    >
      {children}
    </AnimatedPressable>
  );
}

/**
 * Lo que aparece donde antes había un esqueleto. Sube 8 px y se desvela en
 * `DURATION.standard`: el contenido que llega tras una carga es un cambio de
 * estado, y un cambio que se produce de golpe se lee como un parpadeo. Más corto
 * que `EnterUp` a propósito —no hay cascada que guiar, sólo un relevo.
 */
export function Reveal({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const reduceMotion = useReduceMotion();
  return (
    <Animated.View
      entering={
        reduceMotion
          ? FadeIn.duration(1)
          : FadeInDown.duration(DURATION.standard)
              .easing(PREMIUM_EASING)
              .withInitialValues({ transform: [{ translateY: 8 }] })
      }
      style={style}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Entrada, salida y reacomodo de las filas de una lista que crece o se acorta
 * (series registradas, mensajes). La salida dura la mitad de la entrada —lo que
 * se va no debe retrasar a lo que llega— y el reacomodo mueve a las demás filas
 * al sitio nuevo en vez de dejar que salten.
 *
 * Con «Reducir movimiento» las filas aparecen y desaparecen sin viaje.
 */
export function useListMotion() {
  const reduceMotion = useReduceMotion();
  if (reduceMotion) {
    return { entering: FadeIn.duration(1), exiting: FadeOut.duration(1), layout: undefined };
  }
  return {
    entering: FadeInDown.duration(DURATION.standard)
      .easing(PREMIUM_EASING)
      .withInitialValues({ transform: [{ translateY: 10 }] }),
    exiting: FadeOut.duration(DURATION.exit),
    layout: LinearTransition.duration(DURATION.standard).easing(PREMIUM_EASING),
  };
}

/**
 * El número que cambia: da un golpe de escala breve para que se note que ha
 * cambiado, sin moverlo de sitio. No late al montarse —un número que ya estaba
 * ahí no es una novedad— y no se repite si el valor es el mismo.
 */
export function BadgePop({
  value,
  children,
  style,
}: {
  value: string | number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);
  const previous = useRef(value);

  useEffect(() => {
    if (previous.current === value) return;
    previous.current = value;
    if (reduceMotion) return;
    scale.value = withSequence(
      withTiming(1.28, { duration: 90, easing: PREMIUM_EASING }),
      withSpring(1, SETTLE_SPRING),
    );
  }, [reduceMotion, scale, value]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

type SegmentLayout = { x: number; y: number; width: number; height: number };

/**
 * Control segmentado cuya píldora ACTIVA SE DESLIZA hasta la opción nueva, en vez
 * de apagarse en una y encenderse en otra. Es el cambio de estado más frecuente
 * de la app y el que más se nota cuando salta: el fondo viaja, y eso es lo que le
 * dice al ojo qué ha cambiado y de dónde viene.
 *
 * `renderItem` pinta cada opción; la píldora va detrás. Mide el hueco de cada
 * opción en vez de suponer anchos iguales, así que sirve igual para etiquetas de
 * distinto largo y para botones de icono. Selecciona con un háptico de selección
 * (no al volver a tocar la ya activa) y con «Reducir movimiento» la píldora
 * salta sin viajar.
 */
export function SegmentedPill<T extends string>({
  options,
  value,
  onChange,
  pillColor,
  style,
  itemStyle,
  renderItem,
  gap = 0,
  fill = false,
}: {
  options: readonly { value: T; accessibilityLabel?: string }[];
  /** Las opciones se reparten el ancho a partes iguales (pestañas). */
  fill?: boolean;
  value: T;
  onChange: (next: T) => void;
  /** Relleno de la opción activa; por defecto el de los controles. */
  pillColor?: string;
  /** El contenedor: fondo, borde, relleno. */
  style?: StyleProp<ViewStyle>;
  /** Cada opción: tamaño y alineación del contenido. */
  itemStyle?: StyleProp<ViewStyle>;
  renderItem: (option: { value: T }, active: boolean) => ReactNode;
  gap?: number;
}) {
  const reduceMotion = useReduceMotion();
  const layouts = useRef(new Map<string, SegmentLayout>());
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const w = useSharedValue(0);
  const h = useSharedValue(0);
  const shown = useSharedValue(0);
  const placed = useRef(false);

  const moveTo = useCallback(
    (key: string) => {
      const layout = layouts.current.get(key);
      if (!layout) return;
      if (!placed.current || reduceMotion) {
        x.value = layout.x;
        y.value = layout.y;
        w.value = layout.width;
        h.value = layout.height;
        shown.value = 1;
        placed.current = true;
        return;
      }
      // «Glide» (C8.1): el indicador viaja sin rebote.
      x.value = withSpring(layout.x, glideSpring);
      y.value = withSpring(layout.y, glideSpring);
      w.value = withSpring(layout.width, glideSpring);
      h.value = withSpring(layout.height, glideSpring);
    },
    [h, reduceMotion, shown, w, x, y],
  );

  useEffect(() => {
    moveTo(value);
  }, [moveTo, value]);

  const pill = useAnimatedStyle(() => ({
    left: x.value,
    top: y.value,
    width: w.value,
    height: h.value,
    opacity: shown.value,
  }));

  return (
    <View style={style}>
      <View style={{ flexDirection: 'row', gap }}>
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', borderRadius: radii.full, backgroundColor: pillColor ?? colors.surfaceHighest }, pill]}
        />
        {options.map((option) => {
          const active = option.value === value;
          return (
            <View
              key={option.value}
              style={fill ? { flex: 1 } : undefined}
              onLayout={(event) => {
                layouts.current.set(option.value, event.nativeEvent.layout);
                if (option.value === value) moveTo(option.value);
              }}
            >
              <PressableScale
                accessibilityLabel={option.accessibilityLabel}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                haptic={active ? 'none' : 'selection'}
                onPress={() => onChange(option.value)}
                style={itemStyle}
              >
                {renderItem(option, active)}
              </PressableScale>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** La etiqueta de una opción de `SegmentedPill`: cambia de color con la píldora, no antes. */
export function SegmentLabel({
  label,
  active,
  activeColor,
  inactiveColor,
  style,
}: {
  label: string;
  active: boolean;
  activeColor: string;
  inactiveColor: string;
  style?: StyleProp<TextStyle>;
}) {
  // Los colores entran como valores sueltos y no como `colors.*` dentro del
  // worklet: ver el comentario de `Checkbox` sobre la marca del gimnasio.
  const animated = useAnimatedStyle(() => ({
    color: withTiming(active ? activeColor : inactiveColor, {
      duration: DURATION.standard,
      easing: PREMIUM_EASING,
    }),
  }));
  return <Animated.Text style={[style, animated]}>{label}</Animated.Text>;
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
  const reduceMotion = useReduceMotion();
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
  const reduceMotion = useReduceMotion();
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
 * Gemelo del `CountUp` de la web: misma duración según la magnitud del salto
 * (`countUpDuration`, de `@gymsheet/domain`), misma curva de salida cúbica y
 * mismo respeto por «reducir movimiento», que salta directo al valor final.
 *
 * Cuenta en el hilo de UI: un valor compartido de Reanimated escribe el texto
 * de un `TextInput` no editable a través de props animadas. Así ningún
 * fotograma de la cuenta pasa por un render de React.
 *
 * El ancho lo reserva un `Text` invisible con la cifra final. Un `TextInput`
 * medido con «0» no crece cuando su texto cambia desde el hilo nativo, y la
 * cifra quedaría recortada; con la caja ya del tamaño final, además, el número
 * no empuja lo que tiene al lado mientras sube.
 *
 * Cuando `value` cambia después de montar, cuenta desde lo que se ve en ese
 * momento, no desde cero.
 *
 * El lector de pantalla recibe la cifra final una sola vez, en la etiqueta del
 * contenedor, y nunca la cuenta.
 */
export function CountUpText({
  value,
  from = 0,
  durationMs,
  delayMs = 0,
  prefix = '',
  suffix = '',
  style,
}: {
  value: number;
  /** Desde dónde cuenta. 0 por defecto: el número se gana cada vez que se ve. */
  from?: number;
  /** Si se omite, sale de la magnitud del salto (`countUpDuration`). */
  durationMs?: number;
  delayMs?: number;
  /** Texto fijo antes de la cifra, p. ej. «+». */
  prefix?: string;
  /** Texto fijo después de la cifra, p. ej. « pts». */
  suffix?: string;
  style?: StyleProp<TextStyle>;
}) {
  const reduceMotion = useReduceMotion();
  const current = useSharedValue(reduceMotion ? value : from);

  useEffect(() => {
    const start = current.value;
    const duration = durationMs ?? countUpDuration(start, value);
    if (reduceMotion || duration === 0) {
      cancelAnimation(current);
      current.value = value;
      return;
    }
    current.value = withDelay(
      delayMs,
      withTiming(value, { duration, easing: Easing.out(Easing.cubic) }),
    );
    return () => {
      // Al desmontar o al cambiar de destino: la cuenta en curso se detiene
      // donde está y la siguiente arranca desde ahí.
      cancelAnimation(current);
    };
  }, [current, delayMs, durationMs, reduceMotion, value]);

  const animatedProps = useAnimatedProps(
    () => ({ text: `${prefix}${formatThousandsEs(current.value)}${suffix}` }) as TextInputProps,
  );

  const finalText = `${prefix}${formatThousandsEs(value)}${suffix}`;
  const textStyle = [COUNTER_BASE, style];

  return (
    <View accessibilityLabel={finalText} accessibilityRole="text" accessible>
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[textStyle, { opacity: 0 }]}
      >
        {finalText}
      </Text>
      <AnimatedTextInput
        accessibilityElementsHidden
        animatedProps={animatedProps}
        caretHidden
        defaultValue={`${prefix}${formatThousandsEs(reduceMotion ? value : from)}${suffix}`}
        editable={false}
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        scrollEnabled={false}
        style={[textStyle, StyleSheet.absoluteFill, COUNTER_INPUT]}
        underlineColorAndroid="transparent"
      />
    </View>
  );
}

// Reanimated 4 ya anima `text` en un TextInput sin registrarlo antes: el
// antiguo `addWhitelistedNativeProps` es un no-op desde esa versión.
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

/** Dígitos de ancho fijo: la cifra no baila mientras cuenta. */
const COUNTER_BASE: TextStyle = { fontVariant: ['tabular-nums'] };

/** Un `TextInput` trae relleno y ajustes de fuente propios; aquí debe medir como un `Text`. */
const COUNTER_INPUT: TextStyle = {
  padding: 0,
  margin: 0,
  includeFontPadding: false,
  textAlignVertical: 'center',
  textAlign: 'right',
};

/**
 * Separador de miles de `es-ES`, apto para worklets.
 *
 * `toLocaleString` no es fiable dentro del hilo de UI. La regla es la de CLDR
 * para el español: el punto solo aparece desde los cinco dígitos, de modo que
 * 1240 queda «1240» y 12400 queda «12.400», igual que en la web.
 */
export function formatThousandsEs(input: number): string {
  'worklet';
  const rounded = Math.round(input);
  const digits = String(Math.abs(rounded));
  let out = digits;
  if (digits.length >= 5) {
    out = '';
    for (let index = 0; index < digits.length; index += 1) {
      if (index > 0 && (digits.length - index) % 3 === 0) out += '.';
      out += digits[index];
    }
  }
  return rounded < 0 ? `-${out}` : out;
}
