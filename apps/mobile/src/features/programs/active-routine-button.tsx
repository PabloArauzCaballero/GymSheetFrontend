import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { useActivePrograms } from '@/features/programs/use-active-programs';
import { accentContrast, alpha, colors, iconSizes, ink, minTouchTarget, radii, spacing } from '@/theme';

/**
 * «Mi rutina» en la cabecera de Rutinas: un toque y estás en la rutina
 * activada (gym o cardio). Con algo activado va en jade, es el atajo del día;
 * sin nada, neutro, y la pantalla explica cómo activar una.
 */
export function ActiveRoutineButton() {
  const router = useRouter();
  const programs = useActivePrograms();
  const strength = programs.data?.fuerza ?? null;
  const cardio = programs.data?.cardio ?? null;
  const active = Boolean(strength || cardio);
  const glyph = active ? accentContrast() : colors.text;
  const label = active
    ? `Mi rutina: ${strength?.rutinaNombre ?? 'plan de cardio'}`
    : 'Mi rutina, no tienes ninguna activada';

  return (
    <PressableScale
      accessibilityHint="Abre tu rutina activada de gym o de cardio"
      accessibilityLabel={label}
      accessibilityRole="button"
      haptic="selection"
      onPress={() => router.push('/routines/activa')}
      scaleTo={0.94}
      style={{
        height: minTouchTarget,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingLeft: spacing.smd,
        paddingRight: spacing.md,
        borderRadius: radii.full,
        borderCurve: 'continuous',
        backgroundColor: active ? colors.volt : colors.surfaceHigh,
      }}
      testID="open-active-routine"
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: radii.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active ? alpha(ink.black, 0.14) : colors.surfaceHighest,
        }}
      >
        <Ionicons color={glyph} name={cardio && !strength ? 'pulse' : 'play'} size={iconSizes.xs + 2} />
      </View>
      <Text strong style={{ color: glyph }} variant="subhead">
        Mi rutina
      </Text>
    </PressableScale>
  );
}
