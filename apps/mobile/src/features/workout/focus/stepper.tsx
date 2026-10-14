import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { numericInputProps } from '@/components/keyboard';
import { DURATION, PREMIUM_EASING, PRESS_SPRING } from '@/components/motion';
import { Text } from '@/components/text';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { colors, fontFamilies, heroNumberFontSize, iconSizes, metricColors, radii, releaseSpring, settleSpring, spacing, tabularNums, type MetricKey } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Lado del botón −/+: por encima de los 48 de la casa, para manos sudadas. */
const STEP_BUTTON = 56;
/** Mantener pulsado: espera antes de repetir, y cadencia de la repetición. */
const HOLD_DELAY_MS = 380;
const HOLD_EVERY_MS = 90;

/**
 * Botón −/+ que repite mientras se mantiene pulsado (subir 20 kg sin dar ocho
 * toques). Un tic háptico por paso: es un valor que pasa por muescas.
 */
export function StepButton({
  icon,
  label,
  onStep,
  metric,
  testID,
}: {
  icon: 'remove' | 'add';
  label: string;
  onStep: () => void;
  /** Con magnitud, el «+» lleva su color: subir es la acción que más se repite. */
  metric?: MetricKey;
  testID?: string;
}) {
  const pressed = useSharedValue(0);
  /** 0 → 1: la onda que sale del botón en cada paso. */
  const ripple = useSharedValue(1);
  const tone = metric && icon === 'add' ? metricColors[metric] : null;
  const reduceMotion = useReduceMotion();
  const latest = useRef(onStep);
  latest.current = onStep;
  const hold = useRef<{ delay: ReturnType<typeof setTimeout> | null; every: ReturnType<typeof setInterval> | null }>({
    delay: null,
    every: null,
  });

  const stop = () => {
    if (hold.current.delay) clearTimeout(hold.current.delay);
    if (hold.current.every) clearInterval(hold.current.every);
    hold.current = { delay: null, every: null };
  };
  useEffect(() => stop, []);

  const tick = () => {
    void Haptics.selectionAsync();
    latest.current();
    if (!reduceMotion) {
      ripple.value = 0;
      ripple.value = withTiming(1, { duration: 420, easing: PREMIUM_EASING });
    }
  };

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : 1 - pressed.value * 0.1 }],
    opacity: 1 - Math.max(0, pressed.value) * 0.12,
  }));
  const wave = useAnimatedStyle(() => ({
    opacity: (1 - ripple.value) * 0.5,
    transform: [{ scale: 1 + ripple.value * 0.55 }],
  }));

  return (
    <AnimatedPressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={spacing.xs}
      onPressIn={() => {
        pressed.value = withSpring(1, PRESS_SPRING);
        tick();
        stop();
        hold.current.delay = setTimeout(() => {
          hold.current.every = setInterval(tick, HOLD_EVERY_MS);
        }, HOLD_DELAY_MS);
      }}
      onPressOut={() => {
        pressed.value = reduceMotion ? withTiming(0, { duration: DURATION.quick, easing: PREMIUM_EASING }) : withSpring(0, releaseSpring);
        stop();
      }}
      style={[
        {
          width: STEP_BUTTON,
          height: STEP_BUTTON,
          borderRadius: radii.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tone ? tone.tint : colors.surfaceHighest,
          borderWidth: tone ? 1 : 0,
          borderColor: tone ? tone.edge : 'transparent',
        },
        animated,
      ]}
      testID={testID}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', width: STEP_BUTTON, height: STEP_BUTTON, borderRadius: STEP_BUTTON / 2, borderWidth: 2, borderColor: tone ? tone.ink : colors.textSecondary },
          wave,
        ]}
      />
      <Ionicons color={tone ? tone.ink : colors.text} name={icon} size={iconSizes.lg} />
    </AnimatedPressable>
  );
}

/**
 * Un valor de la serie con sus dos botones: − a la izquierda, + a la derecha y
 * la cifra, grande, en medio. La cifra es un campo: se toca y se teclea. Cada
 * magnitud lleva su color (peso azul, repeticiones violeta) en un glifo junto
 * al rótulo; la cifra se queda en blanco, que es lo que se lee.
 *
 * Al pulsar − o + la cifra da un pequeño salto en la dirección del cambio: es
 * la respuesta a «¿me hizo caso?» cuando el dedo tapa el botón.
 */
export function Stepper({
  label,
  unit,
  value,
  placeholder = '—',
  decimal = false,
  onChangeText,
  onStep,
  spoken,
  metric,
  icon,
  testID,
}: {
  label: string;
  unit?: string;
  value: string;
  placeholder?: string;
  decimal?: boolean;
  onChangeText: (next: string) => void;
  onStep: (direction: -1 | 1) => void;
  /** «kilos», «repeticiones»: lo que dicen los botones al lector de pantalla. */
  spoken: string;
  metric: MetricKey;
  icon: keyof typeof Ionicons.glyphMap;
  testID?: string;
}) {
  const reduceMotion = useReduceMotion();
  const kick = useSharedValue(0);
  const tone = metricColors[metric];
  const step = (direction: -1 | 1) => {
    onStep(direction);
    if (reduceMotion) return;
    // Sube al sumar, baja al restar, y vuelve con muelle.
    kick.value = withSequence(withTiming(-direction, { duration: 70, easing: PREMIUM_EASING }), withSpring(0, settleSpring));
  };
  const animated = useAnimatedStyle(() => ({
    transform: [{ translateY: kick.value * 6 }, { scale: 1 + Math.abs(kick.value) * 0.08 }],
  }));
  // Destello del color de la magnitud bajo la cifra: «ha cambiado», visto aunque el dedo tape el botón.
  const glow = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.abs(kick.value) * 1.6),
    transform: [{ scaleX: 0.4 + Math.min(1, Math.abs(kick.value)) * 0.6 }],
  }));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd }}>
      <StepButton icon="remove" label={`Menos ${spoken}`} onStep={() => step(-1)} testID={testID ? `${testID}-minus` : undefined} />
      <View style={{ flex: 1, alignItems: 'stretch' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs }}>
          <Ionicons color={tone.ink} name={icon} size={iconSizes.sm} />
          <Text tone="muted" variant="caption">
            {(unit ? `${label} · ${unit}` : label).toUpperCase()}
          </Text>
        </View>
        {/* El campo ocupa todo el ancho entre los botones: con un ancho mínimo, «72,5» se cortaba en «72». */}
        <Animated.View style={animated}>
          <TextInput
            accessibilityLabel={unit ? `${label}, ${unit}` : label}
            keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
            maxFontSizeMultiplier={1.2}
            {...numericInputProps}
            maxLength={6}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textDisabled}
            selectTextOnFocus
            style={[
              {
                paddingVertical: 0,
                color: colors.text,
                fontFamily: fontFamilies.display,
                fontSize: heroNumberFontSize,
                textAlign: 'center',
              },
              tabularNums,
            ]}
            testID={testID}
            value={value}
          />
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[{ alignSelf: 'center', width: 56, height: 3, borderRadius: 2, backgroundColor: tone.ink }, glow]}
        />
      </View>
      <StepButton icon="add" label={`Más ${spoken}`} metric={metric} onStep={() => step(1)} testID={testID ? `${testID}-plus` : undefined} />
    </View>
  );
}

/** RIR: cuántas repeticiones quedaban en el depósito. Opcional; un toque. */
export function RirPicker({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const options = ['0', '1', '2', '3', '4'];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <Ionicons color={metricColors.effort.ink} name="flame-outline" size={iconSizes.md} />
      <View style={{ flex: 1 }}>
        <Text strong variant="subhead">
          RIR
        </Text>
        <Text numberOfLines={1} tone="muted" variant="caption">
          En reserva
        </Text>
      </View>
      {options.map((option) => {
        const active = value === option;
        return (
          <RirChip active={active} key={option} option={option} onPress={() => onChange(active ? '' : option)} />
        );
      })}
    </View>
  );
}

/** Una opción de RIR: al elegirla da un golpe de escala (0.86 → 1 con muelle) y se enciende en ámbar. */
function RirChip({ option, active, onPress }: { option: string; active: boolean; onPress: () => void }) {
  const reduceMotion = useReduceMotion();
  const pop = useSharedValue(1);
  useEffect(() => {
    if (!active || reduceMotion) return;
    pop.value = withSequence(withTiming(0.86, { duration: 70 }), withSpring(1, releaseSpring));
  }, [active, pop, reduceMotion]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  return (
    <AnimatedPressable
            accessibilityLabel={`RIR ${option}${option === '4' ? ' o más' : ''}`}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            hitSlop={spacing.xs}
            onPress={() => {
              void Haptics.selectionAsync();
              onPress();
            }}
            style={[{
              width: 40,
              height: 40,
              borderRadius: radii.full,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1.5,
              borderColor: active ? metricColors.effort.ink : 'transparent',
              backgroundColor: active ? metricColors.effort.tint : colors.surfaceHighest,
            }, style]}
            testID={`set-rir-${option}`}
          >
            <Text strong style={{ color: active ? metricColors.effort.ink : colors.textSecondary }} tabular variant="subhead">
              {option === '4' ? '4+' : option}
            </Text>
    </AnimatedPressable>
  );
}
