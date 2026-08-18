import { useEffect, useState } from 'react';
import { Modal, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Button } from '@/components/ui';
import { PressableScale } from '@/components/motion';
import { useTourStore } from '@/state/tour-store';
import { colors, fontSizes, iconSizes, radii, spacing } from '@/theme';

type TourStep = {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly title: string;
  readonly body: string;
};

/**
 * What the app is, in the order someone actually meets it.
 *
 * Each step names a tab and says what it is *for*, not what it contains: "aquí
 * están tus rutinas" describes a screen, "esto responde qué te toca hoy"
 * describes a reason to open it. The difference is whether the tour teaches the
 * product or merely narrates the navigation bar.
 */
const STEPS: readonly TourStep[] = [
  {
    icon: 'sparkles-outline',
    title: 'Bienvenido a GymSheet',
    body: 'Tu entrenamiento, tus cargas y tu progreso en un solo sitio. Te lo enseñamos en menos de un minuto.',
  },
  {
    icon: 'albums-outline',
    title: 'Rutinas',
    body: 'Tu semana de un vistazo: qué toca hoy y qué días entrenas. Toca un día para abrir su rutina.',
  },
  {
    icon: 'barbell-outline',
    title: 'Ejercicios',
    body: 'El catálogo por zona del cuerpo y músculo, con la lámina de cada ejercicio para reconocerlo al instante.',
  },
  {
    icon: 'flame-outline',
    title: 'Entrenos',
    body: 'Registra series con un toque: repite la anterior o súmale kilos. El cronómetro de descanso arranca solo.',
  },
  {
    icon: 'person-outline',
    title: 'Tu perfil',
    body: 'Tus datos, tu membresía y la descarga de tu avance en PDF o CSV. Desde aquí puedes volver a ver este tutorial.',
  },
];

/**
 * Guided tour.
 *
 * The card zooms in rather than sliding: a step that scales up from the centre
 * reads as something being *presented*, while a slide reads as one more screen
 * in a stack the user is trying to get through. Each step re-runs the zoom, so
 * advancing feels like a new card is handed over instead of text swapping in
 * place — which at this size is nearly invisible.
 */
export function TourOverlay() {
  const visible = useTourStore((state) => state.visible);
  const complete = useTourStore((state) => state.complete);
  const [step, setStep] = useState(0);
  const reduceMotion = useReducedMotion();

  const scale = useSharedValue(reduceMotion ? 1 : 0.86);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (!visible) return;
    if (reduceMotion) {
      scale.value = 1;
      opacity.value = 1;
      return;
    }
    // Restart from slightly small on every step so the zoom is the transition,
    // not just the entrance.
    scale.value = 0.86;
    opacity.value = 0;
    scale.value = withSpring(1, { damping: 14, stiffness: 170, mass: 0.7 });
    opacity.value = withTiming(1, { duration: 220 });
  }, [opacity, reduceMotion, scale, step, visible]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const close = () => {
    setStep(0);
    void complete();
  };

  if (!current) return null;

  return (
    <Modal animationType="fade" transparent visible={visible}>
      {/* Scrim rather than an opaque screen: seeing the app dimmed behind the
          card is what tells the user the tour is *about* this app. */}
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.86)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.lg,
        }}
      >
        <Animated.View
          style={[
            {
              width: '100%',
              maxWidth: 420,
              gap: spacing.md,
              alignItems: 'center',
              padding: spacing.xl,
              borderRadius: radii.xl,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            },
            animated,
          ]}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: radii.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.surfaceHigh,
              borderWidth: 1,
              borderColor: colors.volt,
            }}
          >
            <Ionicons color={colors.volt} name={current.icon} size={iconSizes.xl} />
          </View>

          <Text
            style={{
              color: colors.text,
              fontSize: fontSizes.xl,
              fontWeight: '600',
              textAlign: 'center',
              letterSpacing: fontSizes.xl * -0.03,
            }}
          >
            {current.title}
          </Text>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: fontSizes.sm,
              lineHeight: 22,
              textAlign: 'center',
            }}
          >
            {current.body}
          </Text>

          {/* Dots, not a numbered counter: the point is "almost done", and a
              shape communicates that faster than "4 de 5". */}
          <View style={{ flexDirection: 'row', gap: spacing.xs, paddingVertical: spacing.xs }}>
            {STEPS.map((item, index) => (
              <View
                key={item.title}
                style={{
                  width: index === step ? 18 : 6,
                  height: 6,
                  borderRadius: radii.full,
                  backgroundColor: index === step ? colors.volt : colors.surfaceHighest,
                }}
              />
            ))}
          </View>

          <View style={{ width: '100%', gap: spacing.sm }}>
            <Button
              label={isLast ? 'Empezar' : 'Siguiente'}
              onPress={() => (isLast ? close() : setStep((value) => value + 1))}
            />
            {!isLast ? (
              <PressableScale
                accessibilityLabel="Saltar tutorial"
                onPress={close}
                style={{ alignItems: 'center', paddingVertical: spacing.xs }}
              >
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
                  Saltar
                </Text>
              </PressableScale>
            ) : null}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
