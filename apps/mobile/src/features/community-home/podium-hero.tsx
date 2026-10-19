import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import type { LeaderboardEntry } from '@gymsheet/schemas';
import { progressionService } from '@/api/services';
import { HeroSurface } from '@/components/hero-surface';
import { CountUpText, PressableScale } from '@/components/motion';
import { RankBadge } from '@/components/rank-badge';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { Text } from '@/components/text';
import { accentPolicy, colors, fontFamilies, fontSizes, iconSizes, medalColors, spacing, tabularNums } from '@/theme';

const MEDAL: Record<number, string> = { 1: medalColors.gold, 2: medalColors.silver, 3: medalColors.bronze };

function PodiumTitle({ withChevron }: { withChevron: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Ionicons color={accentPolicy.glyph} name="podium-outline" size={iconSizes.md} />
        <Text accessibilityRole="header" variant="headline">
          Podio del gimnasio
        </Text>
      </View>
      {withChevron ? <Ionicons color={colors.textMuted} name="chevron-forward" size={iconSizes.sm} /> : null}
    </View>
  );
}

function PodiumPlace({ entry, index, first }: { entry: LeaderboardEntry; index: number; first: boolean }) {
  const medal = MEDAL[entry.position];
  return (
    <View style={{ flex: first ? 1.3 : 1, alignItems: 'center', gap: spacing.xs }}>
      <RankBadge isMe={entry.isMe} position={entry.position} size={first ? 64 : 44} />
      <Text
        numberOfLines={1}
        strong={entry.isMe || first}
        style={{ textAlign: 'center', alignSelf: 'stretch' }}
        tone={entry.isMe || first ? 'default' : 'secondary'}
        variant="subhead"
      >
        {entry.displayName}
        {entry.isMe ? ' · tú' : ''}
      </Text>
      <CountUpText
        delayMs={index * 60}
        style={{
          ...tabularNums,
          color: first && medal ? medal : colors.textSecondary,
          fontFamily: fontFamilies.display,
          fontSize: first ? fontSizes.xl : fontSizes.md,
        }}
        suffix=" pts"
        value={entry.points}
      />
    </View>
  );
}

/**
 * El podio del gimnasio como protagonista de Comunidad: prueba social con los
 * tres primeros, el primero más grande. Lleva al ranking completo al tocarlo.
 */
export function PodiumHero() {
  const router = useRouter();
  const leaderboard = useQuery({
    queryKey: ['progression', 'leaderboard', 'points', 'preview'],
    queryFn: () => progressionService.leaderboard(3, 'points'),
    staleTime: 60_000,
  });

  if (leaderboard.isPending) return <Skeleton height={200} radius={24} />;

  if (leaderboard.isError) {
    return (
      <HeroSurface>
        <PodiumTitle withChevron={false} />
        <ErrorState error={leaderboard.error} onRetry={() => void leaderboard.refetch()} />
      </HeroSurface>
    );
  }

  const entries = leaderboard.data ?? [];
  if (!entries.length) {
    return (
      <HeroSurface>
        <PodiumTitle withChevron={false} />
        <EmptyState
          icon="podium-outline"
          message="Entrena y suma puntos para abrir el podio."
          title="Aún no hay podio"
        />
      </HeroSurface>
    );
  }

  const byPosition = [...entries].sort((a, b) => a.position - b.position);
  const first = byPosition[0];
  const second = byPosition[1];
  const third = byPosition[2];
  // Orden de podio: segundo, primero, tercero.
  const order = [second, first, third].filter((entry): entry is LeaderboardEntry => Boolean(entry));

  return (
    <PressableScale accessibilityLabel="Ver el podio completo" onPress={() => router.push('/trayectoria')}>
      <HeroSurface>
        <PodiumTitle withChevron />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
          {order.map((entry, index) => (
            <PodiumPlace entry={entry} first={entry === first} index={index} key={`${entry.position}-${entry.displayName}`} />
          ))}
        </View>
      </HeroSurface>
    </PressableScale>
  );
}
