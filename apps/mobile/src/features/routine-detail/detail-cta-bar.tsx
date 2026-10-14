import { BlurView } from 'expo-blur';
import { useReducedMotion } from 'react-native-reanimated';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';
import { canActivateProgram } from '@gymsheet/hooks';
import type { Routine } from '@gymsheet/types';
import { PrimaryCta, type PrimaryIntent } from '@/features/routine-detail/detail-actions';
import { alpha, colors, gutter, spacing } from '@/theme';

/** Por qué «Activar» no se puede usar, o `undefined` si se puede. */
export function activateBlockReason(routine: Routine): string | undefined {
  if (canActivateProgram(routine)) return undefined;
  return routine.estado === 'ARCHIVED' ? 'Está archivada: no se puede activar.' : 'Añade ejercicios para poder activarla.';
}

/** Alto que reserva el final del scroll para que la barra no tape nada. */
export const CTA_BAR_SPACE = 56 + spacing.xl;

/**
 * Barra fija con el único CTA principal, sobre vidrio: el contenido se
 * desenfoca por debajo al deslizarse. Entra desde abajo con muelle.
 */
export function DetailCtaBar(props: {
  intent: PrimaryIntent;
  onPress: () => void;
  loading?: boolean;
  done?: boolean;
  disabledReason?: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View
      entering={reduceMotion ? undefined : SlideInDown.springify().damping(22).stiffness(200)}
      style={{ marginHorizontal: -gutter, overflow: 'hidden' }}
    >
      <BlurView intensity={40} style={StyleSheet.absoluteFill} tint="dark" />
      <View
        style={{
          paddingHorizontal: gutter,
          paddingTop: spacing.smd,
          paddingBottom: spacing.smd,
          backgroundColor: alpha(colors.surfaceLowest, 0.62),
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
        }}
      >
        <PrimaryCta {...props} disabledReason={props.disabledReason} />
      </View>
    </Animated.View>
  );
}
