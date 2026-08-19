import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { DURATION, PREMIUM_EASING } from '@/components/motion';
import { accentContrast, colors, fontSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

const AnimatedView = Animated.createAnimatedComponent(View);

/**
 * Casilla de verificación con su etiqueta.
 *
 * Deliberadamente no es un `Switch`: un interruptor promete un estado que
 * persiste —una preferencia—, y esto es una acción momentánea sobre lo que hay
 * en pantalla ahora. La casilla dice «esto está marcado en este formulario»,
 * que es exactamente lo que ocurre.
 *
 * Toda la fila es el área de toque, no sólo el cuadrado. Un objetivo de 20pt
 * es la diferencia entre un control que se usa y uno que se falla dos veces de
 * cada tres; el cuadrado es el dibujo, la fila es el botón.
 *
 * La marca aparece con un rebote corto y el relleno con una transición suave:
 * marcar algo debe sentirse como un chasquido, no como un desvanecido.
 */
export function Checkbox({
  checked,
  onChange,
  label,
  accessibilityHint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  accessibilityHint?: string;
}) {
  const reduceMotion = useReducedMotion();

  const box = useAnimatedStyle(() => ({
    backgroundColor: withTiming(checked ? colors.volt : 'transparent', {
      duration: DURATION.quick,
      easing: PREMIUM_EASING,
    }),
    borderColor: withTiming(checked ? colors.volt : colors.border, {
      duration: DURATION.quick,
      easing: PREMIUM_EASING,
    }),
  }));

  const mark = useAnimatedStyle(() => ({
    opacity: withTiming(checked ? 1 : 0, { duration: reduceMotion ? 0 : 120 }),
    transform: [
      {
        scale: reduceMotion
          ? 1
          : withSpring(checked ? 1 : 0.4, { damping: 12, stiffness: 260, mass: 0.5 }),
      },
    ],
  }));

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      hitSlop={spacing.sm}
      onPress={() => onChange(!checked)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        minHeight: minTouchTarget,
        alignSelf: 'flex-start',
        paddingRight: spacing.sm,
      }}
    >
      <AnimatedView
        style={[
          {
            width: 22,
            height: 22,
            borderRadius: radii.sm,
            borderWidth: 1.5,
            alignItems: 'center',
            justifyContent: 'center',
          },
          box,
        ]}
      >
        <Animated.View style={mark}>
          <Ionicons color={accentContrast()} name="checkmark" size={15} />
        </Animated.View>
      </AnimatedView>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, fontWeight: semibold }}>
        {label}
      </Text>
    </Pressable>
  );
}
