import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { LeaderboardSortBy } from '@gymsheet/schemas';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { progressionService } from '@/api/services';
import { ErrorState, Skeleton } from '@/components/feedback';
import { Card, Section } from '@/components/layout';
import { CountUpText, SegmentLabel, SegmentedPill } from '@/components/motion';
import { RankBadge } from '@/components/rank-badge';
import { colors, fontSizes, iconSizes, radii, semibold, spacing } from '@/theme';

/** La clasificación del gimnasio, al final de la senda: es contexto, no el objetivo. */
export function LeaderboardSection() {
  const [leaderboardSort, setLeaderboardSort] = useState<LeaderboardSortBy>('points');
  const leaderboard = useQuery({
    queryKey: ['progression', 'leaderboard', leaderboardSort],
    queryFn: () => progressionService.leaderboard(5, leaderboardSort),
  });
  return (
    <Section icon="podium-outline" title="Clasificación del gimnasio">
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: 18 }}>
        Los cinco primeros de tu gimnasio.
      </Text>
      <SegmentedPill
        gap={spacing.xs}
        itemStyle={{
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderRadius: radii.full,
        }}
        onChange={setLeaderboardSort}
        options={[
          { value: 'points' as const },
          { value: 'streak' as const },
        ]}
        pillColor={colors.volt}
        renderItem={(option, active) => (
          <SegmentLabel
            active={active}
            activeColor={colors.background}
            inactiveColor={colors.textMuted}
            label={option.value === 'points' ? 'Puntos' : 'Racha'}
            style={{ fontSize: fontSizes.xs, fontWeight: semibold }}
          />
        )}
        style={{
          backgroundColor: colors.surfaceHigh,
          borderRadius: radii.full,
          padding: 4,
          alignSelf: 'flex-start',
        }}
        value={leaderboardSort}
      />
      {leaderboard.isPending ? (
        <Skeleton height={140} />
      ) : leaderboard.isError ? (
        <ErrorState error={leaderboard.error} onRetry={() => void leaderboard.refetch()} />
      ) : (
        <Card>
          {(leaderboard.data ?? []).map((entry, index) => (
            <View
              key={`${entry.position}-${entry.displayName}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
            >
              <RankBadge isMe={entry.isMe} position={entry.position} />
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  color: entry.isMe ? colors.text : colors.textMuted,
                  fontSize: fontSizes.sm,
                  fontWeight: entry.isMe ? semibold : '400',
                }}
              >
                {entry.displayName}
                {entry.isMe ? ' · tú' : ''}
              </Text>
              {leaderboardSort === 'streak' ? (
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, fontVariant: ['tabular-nums'] }}>
                  {`${entry.streakDays} ${entry.streakDays === 1 ? 'día' : 'días'}`}
                </Text>
              ) : (
                <CountUpText
                  delayMs={index * 60}
                  style={{ color: colors.textMuted, fontSize: fontSizes.sm }}
                  value={entry.points}
                />
              )}
            </View>
          ))}
          {(leaderboard.data ?? []).length === 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons color={colors.textDisabled} name="podium-outline" size={iconSizes.md} />
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, flex: 1 }}>
                Todavía no hay nadie en la tabla. Entrena y sé el primero.
              </Text>
            </View>
          ) : null}
        </Card>
      )}
    </Section>
  );
}
