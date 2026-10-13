import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { sessionClock } from '@/features/workout/workout-flow';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { colors, glideSpring, gutter, iconSizes, minTouchTarget, radii, spacing } from '@/theme';

/** El cronómetro de la sesión. Aislado: su tic de un segundo no repinta la página. */
function SessionClock({ startIso }: { startIso: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
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

/** Un tramo de la barra de progreso: el relleno es absoluto y sin hijos, así que animar su ancho no recoloca nada. */
function Segment({ fill, current }: { fill: number; current: boolean }) {
  const reduceMotion = useReduceMotion();
  const animated = useAnimatedStyle(() => {
    const width = `${Math.round(Math.min(1, Math.max(0, fill)) * 100)}%` as const;
    return { width: reduceMotion ? width : withSpring(width, glideSpring) };
  }, [fill, reduceMotion]);
  return (
    <View
      style={{
        flex: 1,
        height: 4,
        borderRadius: radii.full,
        overflow: 'hidden',
        backgroundColor: current ? colors.borderControl : colors.surfaceHighest,
      }}
    >
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: radii.full, backgroundColor: colors.text }, animated]} />
    </View>
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
          <Segment current={index === page} fill={fill} key={index} />
        ))}
      </View>
    </View>
  );
}
