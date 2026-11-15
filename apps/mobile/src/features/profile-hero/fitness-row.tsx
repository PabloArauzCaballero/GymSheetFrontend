import type { Progression } from '@gymsheet/schemas';
import { View } from 'react-native';
import { Skeleton } from '@/components/feedback';
import { Text } from '@/components/text';
import { fitnessNumbers } from '@/features/profile-hero/fitness-numbers';
import { plural } from '@/features/profile-hero/profile-hero';
import { colors, radii, spacing, textVariants } from '@/theme';

type Stat = { key: string; value: number | null; label: string };

function fitnessStats(progress: Progression | undefined): Stat[] {
  if (!progress) {
    // Same labels while loading or after an error, so the row keeps its height.
    return [
      { key: 'points', value: null, label: 'puntos' },
      { key: 'streak', value: null, label: 'días de racha' },
      { key: 'sessions', value: null, label: 'sesiones' },
    ];
  }
  const { points, streak, sessions } = fitnessNumbers(progress);
  return [
    { key: 'points', value: points, label: 'puntos' },
    { key: 'streak', value: streak, label: plural(streak, 'día de racha', 'días de racha') },
    { key: 'sessions', value: sessions, label: plural(sessions, 'sesión', 'sesiones') },
  ];
}

/**
 * La identidad de gimnasio bajo el nombre: puntos · racha · sesiones, en tres
 * columnas iguales. Cifras neutras (el acento es de «Editar»). La fila siempre
 * ocupa lo mismo: cargando, la cifra es una silueta; si falló, una raya (el
 * reintento está en la tarjeta de la senda). Nada salta al llegar el dato.
 */
export function FitnessRow({ progress, pending }: { progress: Progression | undefined; pending: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignSelf: 'stretch' }} testID="profile-fitness-row">
      {fitnessStats(progress).map((stat, index) => (
        <View
          accessible
          accessibilityLabel={stat.value === null ? `${stat.label}: ${pending ? 'cargando' : 'no disponible'}` : `${stat.value.toLocaleString('es-ES')} ${stat.label}`}
          key={stat.key}
          style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: spacing.xxs, borderLeftWidth: index > 0 ? 1 : 0, borderColor: colors.border }}
        >
          {stat.value === null && pending ? (
            <Skeleton height={textVariants.numeric.lineHeight} radius={radii.sm} width={40} />
          ) : (
            <Text numberOfLines={1} tone={stat.value === null ? 'secondary' : 'default'} variant="numeric">
              {stat.value === null ? '—' : stat.value.toLocaleString('es-ES')}
            </Text>
          )}
          <Text numberOfLines={2} style={{ textAlign: 'center' }} tone="secondary" variant="footnote">
            {stat.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
