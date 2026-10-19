import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { sessionClock, type BlockState } from '@/features/workout/workout-flow';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { colors, glideSpring, gutter, iconSizes, metricColors, minTouchTarget, radii, spacing } from '@/theme';

/** El cronómetro de la sesión. Aislado: su tic de un segundo no repinta la página. */
function SessionClock({ startIso }: { startIso: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (!id) {
        setNow(Date.now());
        id = setInterval(() => setNow(Date.now()), 1000);
      }
    };
    const stop = () => {
      if (id) {
        clearInterval(id);
        id = null;
      }
    };
    start();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        start();
      } else {
        stop();
      }
    });
    return () => {
      stop();
      sub.remove();
    };
  }, []);
  return (
    <Text accessibilityLabel={`Tiempo de sesión ${sessionClock(startIso, now)}`} tabular testID="session-clock" tone="secondary" variant="footnote">
      {sessionClock(startIso, now)}
    </Text>
  );
}

function RoundButton({ icon, label, onPress, testID }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; testID?: string }) {
  return (
    <PressableScale
      accessibilityLabel={label}
      haptic="none"
      onPress={onPress}
      scaleTo={0.9}
      style={{
        width: minTouchTarget,
        height: minTouchTarget,
        borderRadius: radii.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceHigh,
      }}
      testID={testID}
    >
      <Ionicons color={colors.text} name={icon} size={iconSizes.md + 2} />
    </PressableScale>
  );
}

/** Un tramo de la barra de progreso: transform scaleX con transformOrigin left corre en el compositor sin pases de layout. */
function Segment({ fill, current, state }: { fill: number; current: boolean; state: BlockState }) {
  const reduceMotion = useReduceMotion();
  const animated = useAnimatedStyle(() => {
    const clamped = Math.min(1, Math.max(0, fill));
    return { transform: [{ scaleX: reduceMotion ? clamped : withSpring(clamped, glideSpring) }] };
  }, [fill, reduceMotion]);
  // El tramo donde estás engorda: el «aquí» se ve sin contar rayas.
  const lift = useAnimatedStyle(() => {
    const scaleY = current ? 1.75 : 1;
    return { transform: [{ scaleY: reduceMotion ? scaleY : withSpring(scaleY, glideSpring) }] };
  }, [current, reduceMotion]);
  return (
    <Animated.View
      style={[
        {
          flex: 1,
          height: 4,
          borderRadius: radii.full,
          overflow: 'hidden',
          backgroundColor: current ? colors.borderControl : colors.surfaceHighest,
        },
        lift,
      ]}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '100%',
            transformOrigin: 'left',
            borderRadius: radii.full,
            // Omitido: el tramo se cierra en gris (no es trabajo hecho). Hecho: verde de «listo».
            backgroundColor: state === 'omitted' ? metricColors.skipped.ink : state === 'done' ? colors.success : colors.text,
            opacity: state === 'omitted' ? 0.55 : 1,
          },
          animated,
        ]}
      />
    </Animated.View>
  );
}

/**
 * Cabecera del entreno: cerrar (la sesión sigue en la mini-barra), qué día es
 * y cuánto llevas, y ⋯ con todo lo que no es registrar. Debajo, un tramo por
 * ejercicio, como las historias: de un vistazo se ve por dónde vas.
 */
export function FocusHeader({
  title,
  position,
  startIso,
  fills,
  states,
  page,
  topInset,
  onClose,
  onMore,
}: {
  title: string;
  /** «2 de 5» o «Resumen». */
  position: string;
  startIso: string;
  fills: readonly number[];
  states: readonly BlockState[];
  page: number;
  topInset: number;
  onClose: () => void;
  onMore: () => void;
}) {
  return (
    <View style={{ paddingTop: topInset + spacing.sm, paddingHorizontal: gutter, gap: spacing.smd }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd }}>
        <RoundButton icon="chevron-down" label="Minimizar el entreno" onPress={onClose} testID="workout-minimize" />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text accessibilityRole="header" numberOfLines={1} variant="headline">
            {title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Text tabular testID="workout-position" tone="secondary" variant="footnote">
              {position}
            </Text>
            <Text tone="muted" variant="footnote">
              ·
            </Text>
            <SessionClock startIso={startIso} />
          </View>
        </View>
        <RoundButton icon="ellipsis-horizontal" label="Opciones del entreno" onPress={onMore} testID="workout-more" />
      </View>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', gap: spacing.xs }}>
        {fills.map((fill, index) => (
          <Segment current={index === page} fill={fill} key={index} state={states[index] ?? 'pending'} />
        ))}
      </View>
    </View>
  );
}
