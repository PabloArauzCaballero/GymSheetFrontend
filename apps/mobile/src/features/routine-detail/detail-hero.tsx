import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cardSubtitle } from '@gymsheet/hooks';
import type { Routine } from '@gymsheet/types';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { GOAL_LABEL } from '@/lib/format';
import { MediaChip } from '@/features/routine-catalog/media-chip';
import { RoutineCover } from '@/features/routine-catalog/routine-cover';
import { coverImageUri } from '@/features/routine-detail/routine-plan';
import { glassButton, gutter, heroTopScrim, iconSizes, ink, minTouchTarget, radii, spacing } from '@/theme';

/** Botón redondo de vidrio que flota sobre la portada (volver, ⋯). */
export function GlassButton({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <PressableScale
      accessibilityLabel={label}
      haptic="none"
      onPress={onPress}
      scaleTo={0.92}
      style={{
        width: minTouchTarget,
        height: minTouchTarget,
        borderRadius: radii.full,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: glassButton.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      testID={testID}
    >
      <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: glassButton.bg }]} />
      <Ionicons color={glassButton.ink} name={icon} size={iconSizes.md + 2} />
    </PressableScale>
  );
}

/**
 * Portada del detalle (rediseño 2026-10-11): la imagen de un ejercicio a todo
 * el ancho con un velo hacia el lienzo; encima, el objetivo y el título en
 * blanco. Volver y ⋯ flotan en vidrio para leerse sobre cualquier foto. La
 * altura sigue al ancho (≈ 4:3.4) con tope, para que en un iPhone pequeño el
 * botón principal siga entrando en la primera pantalla.
 */
export function DetailHero({ routine, onMore }: { routine: Routine; onMore?: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const height = Math.min(420, Math.max(320, Math.round(width * 0.86))) + insets.top * 0.5;
  const days = routine.dias.length;

  return (
    <RoutineCover goal={routine.objetivo} style={{ height }} uri={routine.portadaUrl ?? coverImageUri(routine)}>
      <LinearGradient
        colors={heroTopScrim}
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: insets.top + 96,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: insets.top + spacing.sm,
          left: gutter,
          right: gutter,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <GlassButton icon="chevron-back" label="Volver" onPress={() => router.back()} testID="routine-back" />
        {onMore ? (
          <GlassButton icon="ellipsis-horizontal" label="Más opciones" onPress={onMore} testID="routine-more" />
        ) : null}
      </View>

      <View
        style={{
          position: 'absolute',
          left: gutter,
          right: gutter,
          bottom: spacing.lg,
          gap: spacing.smd,
        }}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {routine.esOficial ? <MediaChip icon="checkmark-circle" label="Recomendada por REPP" /> : null}
          {routine.objetivo ? <MediaChip label={GOAL_LABEL[routine.objetivo]} /> : null}
          {!routine.esOficial && routine.esMia ? (
            <MediaChip
              icon={routine.visibilidad === 'PUBLIC' ? 'globe-outline' : 'lock-closed-outline'}
              label={routine.visibilidad === 'PUBLIC' ? 'Pública' : 'Privada'}
            />
          ) : null}
        </View>
        <Text
          accessibilityLabel={`${routine.nombre}. ${cardSubtitle({ diasPorSemana: days, duracionSemanas: routine.duracionSemanas })}`}
          accessibilityRole="header"
          numberOfLines={3}
          style={{ color: ink.white }}
          testID="routine-title"
          variant="display"
        >
          {routine.nombre}
        </Text>
      </View>
    </RoutineCover>
  );
}
