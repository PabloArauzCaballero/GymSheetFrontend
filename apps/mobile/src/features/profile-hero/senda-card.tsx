import { Ionicons } from '@expo/vector-icons';
import type { Progression } from '@gymsheet/schemas';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { ErrorState, Skeleton } from '@/components/feedback';
import { Card, Section } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import { ProgressTrack } from '@/components/progression';
import { Text } from '@/components/text';
import { colors, iconSizes, spacing } from '@/theme';

/**
 * La senda en el perfil: el camino al siguiente rango y las insignias. Las
 * cifras (puntos, racha, sesiones) y «Compartir» viven en el héroe; aquí no se
 * repiten, ni el rango (es la ficha bajo el nombre). Tocarla abre la senda completa.
 */
export function SendaCard({
  progress,
  pending,
  error,
  onRetry,
}: {
  progress: Progression | undefined;
  pending: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  const router = useRouter();
  if (pending) return <Skeleton height={112} />;
  if (error || !progress) return <ErrorState error={error} onRetry={onRetry} />;

  const rank = progress.level?.name ?? 'Sin empezar';
  const earned = progress.badges.filter((badge) => badge.earned).length;
  const next =
    progress.nextLevel && progress.pointsToNextLevel !== null
      ? `Faltan ${progress.pointsToNextLevel.toLocaleString('es-ES')} puntos para ${progress.nextLevel.name}`
      : 'Senda completa';

  return (
    <Section title="Tu senda">
      <PressableScale accessibilityLabel={`Tu senda: ${rank}. ${next}. ${earned} insignias. Ver la senda completa.`} onPress={() => router.push('/trayectoria')}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <View style={{ flex: 1, gap: spacing.xxs }}>
              <Text variant="headline">{next}</Text>
              <Text tone="secondary" variant="footnote">
                {earned === 1 ? '1 insignia ganada' : `${earned} insignias ganadas`}
              </Text>
            </View>
            <Ionicons color={colors.textSecondary} name="chevron-forward" size={iconSizes.sm} />
          </View>
          <ProgressTrack color={colors.textSecondary} ratio={progress.levelProgress} />
        </Card>
      </PressableScale>
    </Section>
  );
}
