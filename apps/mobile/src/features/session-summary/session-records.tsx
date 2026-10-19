import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import type { SessionRecord } from '@gymsheet/domain';
import { Card, Divider } from '@/components/layout';
import { Text } from '@/components/text';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { celebrateSpring, iconSizes, metricColors, motion, radii, spacing } from '@/theme';

const kg = (value: number) => `${value.toLocaleString('es-ES', { maximumFractionDigits: 1 })} kg`;

/**
 * El sello «Nuevo récord»: el **único rebote** de la app (C8.1, `celebrateSpring`).
 * Entra una vez, con háptico `success` en el mismo instante; con «reducir
 * movimiento» solo aparece por opacidad. Va en oro (la tinta de los récords,
 * no el acento): el acento de la pantalla es de la acción, y en la portada del
 * resumen el oro es lo que dice «hoy hubo marca».
 */
export function RecordSeal({ count }: { count: number }) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(reduceMotion ? 1 : 0.6);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = motion.enter;
    opacity.value = withDelay(delay, withTiming(1, { duration: motion.instant }));
    if (!reduceMotion) scale.value = withDelay(delay, withSpring(1, celebrateSpring));
    const timer = setTimeout(() => {
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, delay);
    return () => clearTimeout(timer);
  }, [opacity, reduceMotion, scale]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[
        {
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          paddingHorizontal: spacing.smd,
          paddingVertical: spacing.xs,
          borderRadius: radii.full,
          borderWidth: 1,
          borderColor: metricColors.record.edge,
          backgroundColor: metricColors.record.tint,
        },
        style,
      ]}
    >
      <Ionicons color={metricColors.record.ink} name="trophy" size={iconSizes.sm} />
      <Text strong style={{ color: metricColors.record.ink }} tabular variant="subhead">
        {count === 1 ? 'Nuevo récord' : `${count} récords nuevos`}
      </Text>
    </Animated.View>
  );
}

/**
 * Récords de la sesión: ejercicio, la serie que lo bate y la marca anterior.
 * El sello que los anuncia vive en la portada (`SessionHero`); aquí va el detalle.
 */
export function SessionRecords({ records }: { records: readonly SessionRecord[] }) {
  if (records.length === 0) return null;
  return (
    <View style={{ gap: spacing.sm }} testID="session-records">
      <Text accessibilityRole="header" variant="headline">
        {records.length === 1 ? 'Tu récord de hoy' : 'Tus récords de hoy'}
      </Text>
      <Card list>
        {records.map((record, index) => (
          <View key={record.exerciseId}>
            {index > 0 ? <Divider /> : null}
            <View
              accessibilityLabel={`Récord en ${record.exerciseName}: ${kg(record.pesoKg)} por ${record.repeticiones}. Antes ${kg(record.previousKg ?? 0)}`}
              accessible
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd, minHeight: 64, paddingVertical: spacing.sm }}
            >
              <Ionicons
                accessibilityElementsHidden
                color={metricColors.record.ink}
                importantForAccessibility="no-hide-descendants"
                name="trophy-outline"
                size={iconSizes.md}
              />
              <View style={{ flex: 1, gap: spacing.xxs }}>
                <Text numberOfLines={2} variant="headline">
                  {record.exerciseName}
                </Text>
                <Text tabular tone="muted" variant="footnote">
                  {record.previousKg !== null ? `Antes ${kg(record.previousKg)}` : 'Primera marca'}
                </Text>
              </View>
              <Text strong tabular variant="body">
                {`${kg(record.pesoKg)} × ${record.repeticiones}`}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    </View>
  );
}
