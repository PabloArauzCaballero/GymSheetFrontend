import { Ionicons } from '@expo/vector-icons';
import type { Progression } from '@gymsheet/schemas';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { ErrorState, Skeleton } from '@/components/feedback';
import { Card, Section } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import { ProgressTrack } from '@/components/progression';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { HeroStats, plural } from '@/features/profile-hero/profile-hero';
import { proudStat, shareMyProfile } from '@/features/profile-hero/profile-share';
import { colors, iconSizes, spacing } from '@/theme';

/**
 * La senda en el perfil: puntos, racha y sesiones reales, la barra hacia el
 * siguiente rango y «Compartir mi perfil». Tocarla abre la senda completa.
 */
export function SendaCard({
  progress,
  pending,
  error,
  onRetry,
  userId,
}: {
  progress: Progression | undefined;
  pending: boolean;
  error: unknown;
  onRetry: () => void;
  userId: string | null;
}) {
  const router = useRouter();
  if (pending) return <Skeleton height={140} />;
  if (error || !progress) return <ErrorState error={error} onRetry={onRetry} />;

  const rank = progress.level?.name ?? null;
  const earned = progress.badges.filter((badge) => badge.earned).length;
  const streak = progress.streak?.current ?? progress.stats.currentStreakDays;
  const sessions = progress.stats.totalSessions;
  const points = progress.points;

  return (
    <Section title="Tu senda">
      <Card>
        <PressableScale
          accessibilityLabel={`Tu senda: ${rank ?? 'sin empezar'}, ${points} puntos, ${earned} insignias. Ver la senda completa.`}
          onPress={() => router.push('/trayectoria')}
          style={{ gap: spacing.smd }}
        >
          <HeroStats
            stats={[
              { key: 'points', value: points, label: 'puntos' },
              { key: 'streak', value: streak, label: plural(streak, 'día de racha', 'días de racha') },
              { key: 'sessions', value: sessions, label: plural(sessions, 'sesión', 'sesiones') },
            ]}
          />
          <ProgressTrack color={colors.textSecondary} ratio={progress.levelProgress} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Text style={{ flex: 1 }} tone="secondary" variant="footnote">
              {[
                progress.nextLevel && progress.pointsToNextLevel !== null
                  ? `Faltan ${progress.pointsToNextLevel.toLocaleString('es-ES')} para ${progress.nextLevel.name}`
                  : 'Senda completa',
                earned === 1 ? '1 insignia' : `${earned} insignias`,
              ].join(' · ')}
            </Text>
            <Ionicons color={colors.textSecondary} name="chevron-forward" size={iconSizes.sm} />
          </View>
        </PressableScale>
        {rank && userId ? (
          <Button
            haptic="light"
            icon="share-outline"
            label="Compartir mi perfil"
            onPress={() => shareMyProfile({ userId, rank, stat: proudStat({ streak, sessions, points }) })}
            size="sm"
            style={{ alignSelf: 'flex-start' }}
            testID="profile-share"
            variant="ghost"
          />
        ) : null}
      </Card>
    </Section>
  );
}
