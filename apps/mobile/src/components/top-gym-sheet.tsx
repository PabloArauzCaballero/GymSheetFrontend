import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LeaderboardBadge, LeaderboardSortBy } from '@gymsheet/schemas';
import { chatService, progressionService } from '@/api/services';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { Card, Section } from '@/components/layout';
import { CountUpText, PressableScale, SegmentLabel, SegmentedPill } from '@/components/motion';
import { RankBadge } from '@/components/rank-badge';
import { levelTitle } from '@/components/directory-card';
import { initialsOf } from '@/lib/format';
import { notify } from '@/notifications';
import {
  colors,
  fontSizes,
  iconSizes,
  minTouchTarget,
  overlay,
  radii,
  semibold,
  spacing,
} from '@/theme';

const AVATAR_SIZE = 48;

function BadgeChip({ badge }: { badge: LeaderboardBadge }) {
  const iconName = (badge.icon || 'ribbon-outline') as keyof typeof Ionicons.glyphMap;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: radii.full,
        backgroundColor: colors.surfaceHigh,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: badge.color || colors.borderSubtle,
      }}
    >
      <Ionicons
        color={badge.color || colors.volt}
        name={iconName in Ionicons.glyphMap ? iconName : 'ribbon-outline'}
        size={11}
      />
      <Text
        numberOfLines={1}
        style={{
          color: colors.textMuted,
          fontSize: 10,
          fontWeight: '600',
          maxWidth: 90,
        }}
      >
        {badge.name}
      </Text>
    </View>
  );
}

export function TopGymModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sortBy, setSortBy] = useState<LeaderboardSortBy>('points');

  const leaderboard = useQuery({
    queryKey: ['progression', 'leaderboard', 15, sortBy],
    queryFn: () => progressionService.leaderboard(15, sortBy),
    staleTime: 30_000,
  });

  const message = useMutation({
    mutationFn: (userId: string) => chatService.startConversation(userId),
    onSuccess: (conversation) => {
      onClose();
      router.push({ pathname: '/chat/[id]', params: { id: conversation.conversationId } });
    },
    onError: (error: Error) => notify.error(error.message),
  });

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: overlay.scrim }}>
        <Pressable accessible={false} onPress={onClose} style={{ flex: 1 }} />

        <View
          accessibilityViewIsModal
          style={{
            maxHeight: '90%',
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            backgroundColor: colors.surfaceLow,
            paddingTop: spacing.sm,
            paddingBottom: Math.max(insets.bottom, spacing.md),
          }}
        >
          {/* iOS Grab Handle */}
          <View
            style={{
              width: 38,
              height: 4,
              borderRadius: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              alignSelf: 'center',
              marginBottom: spacing.xs,
            }}
          />

          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: spacing.lg,
              paddingBottom: spacing.sm,
            }}
          >
            <View style={{ gap: 2, flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Ionicons color={colors.volt} name="trophy" size={iconSizes.md} />
                <Text
                  accessibilityRole="header"
                  style={{
                    color: colors.text,
                    fontSize: fontSizes.xl,
                    fontWeight: '700',
                    letterSpacing: -0.5,
                  }}
                >
                  Top 15 del Gimnasio
                </Text>
              </View>
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                Los miembros más dedicados con sus puntos, insignias y logros.
              </Text>
            </View>

            <Pressable
              accessibilityLabel="Cerrar ranking"
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => ({
                width: minTouchTarget,
                height: minTouchTarget,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radii.full,
                backgroundColor: colors.surfaceHigh,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Ionicons color={colors.text} name="close" size={iconSizes.md} />
            </Pressable>
          </View>

          {/* Sort pills */}
          <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.xs }}>
            <SegmentedPill
              gap={spacing.xs}
              itemStyle={{
                paddingHorizontal: spacing.md,
                paddingVertical: 6,
                borderRadius: radii.full,
              }}
              onChange={setSortBy}
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
                  label={option.value === 'points' ? 'Por Puntos' : 'Por Racha'}
                  style={{ fontSize: fontSizes.xs, fontWeight: semibold }}
                />
              )}
              style={{
                backgroundColor: colors.surfaceHigh,
                borderRadius: radii.full,
                padding: 3,
                alignSelf: 'flex-start',
              }}
              value={sortBy}
            />
          </View>

          {/* Leaderboard content */}
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.sm,
              paddingBottom: spacing.xl,
              gap: spacing.sm,
            }}
            showsVerticalScrollIndicator={false}
          >
            {leaderboard.isPending ? (
              <View style={{ gap: spacing.sm }}>
                <Skeleton height={68} />
                <Skeleton height={68} />
                <Skeleton height={68} />
                <Skeleton height={68} />
              </View>
            ) : leaderboard.isError ? (
              <ErrorState error={leaderboard.error} onRetry={() => void leaderboard.refetch()} />
            ) : !leaderboard.data?.length ? (
              <EmptyState
                icon="trophy-outline"
                message="Aún no hay puntuaciones registradas en este período."
                title="Sin clasificados"
              />
            ) : (
              leaderboard.data.map((entry, index) => {
                const badges = entry.badges ?? [];
                return (
                  <View
                    key={`${entry.position}-${entry.displayName}-${index}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                      padding: spacing.md,
                      borderRadius: radii.lg,
                      backgroundColor: entry.isMe ? colors.surfaceHigh : colors.surfaceLow,
                      borderWidth: 1,
                      borderColor: entry.isMe
                        ? colors.volt
                        : entry.position <= 3
                        ? colors.border
                        : colors.borderSubtle,
                    }}
                  >
                    {/* Position */}
                    <RankBadge isMe={entry.isMe} position={entry.position} />

                    {/* Avatar */}
                    {entry.photoUrl ? (
                      <Image
                        cachePolicy="memory-disk"
                        contentFit="cover"
                        recyclingKey={entry.photoUrl}
                        source={{ uri: entry.photoUrl }}
                        style={{
                          width: AVATAR_SIZE,
                          height: AVATAR_SIZE,
                          borderRadius: radii.full,
                          backgroundColor: colors.surfaceHigh,
                          borderWidth: 1,
                          borderColor: entry.position <= 3 ? colors.volt : colors.borderSubtle,
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          width: AVATAR_SIZE,
                          height: AVATAR_SIZE,
                          borderRadius: radii.full,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: entry.position <= 3 ? colors.volt : colors.surfaceHigh,
                        }}
                      >
                        <Text
                          style={{
                            color: entry.position <= 3 ? colors.background : colors.text,
                            fontSize: fontSizes.md,
                            fontWeight: '700',
                          }}
                        >
                          {initialsOf(entry.displayName, undefined)}
                        </Text>
                      </View>
                    )}

                    {/* Info */}
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                        <Text
                          numberOfLines={1}
                          style={{
                            color: entry.isMe ? colors.text : colors.text,
                            fontSize: fontSizes.sm,
                            fontWeight: semibold,
                            flexShrink: 1,
                          }}
                        >
                          {entry.displayName}
                        </Text>
                        {entry.isMe ? (
                          <View
                            style={{
                              backgroundColor: colors.volt,
                              paddingHorizontal: 6,
                              paddingVertical: 1,
                              borderRadius: radii.full,
                            }}
                          >
                            <Text
                              style={{
                                color: colors.background,
                                fontSize: 10,
                                fontWeight: '700',
                              }}
                            >
                              TÚ
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Level and Points / Streak */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {entry.levelCode ? (
                          <Text
                            style={{
                              color: colors.volt,
                              fontSize: fontSizes.xs,
                              fontWeight: semibold,
                            }}
                          >
                            {levelTitle(entry.levelCode)}
                          </Text>
                        ) : null}
                        <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>•</Text>
                        {sortBy === 'streak' ? (
                          <Text
                            style={{
                              color: colors.textMuted,
                              fontSize: fontSizes.xs,
                              fontVariant: ['tabular-nums'],
                            }}
                          >
                            {`${entry.streakDays} ${entry.streakDays === 1 ? 'día' : 'días'}`}
                          </Text>
                        ) : (
                          <CountUpText
                            delayMs={index * 40}
                            style={{
                              color: colors.volt,
                              fontSize: fontSizes.xs,
                              fontWeight: semibold,
                            }}
                            suffix=" pts"
                            value={entry.points}
                          />
                        )}
                      </View>

                      {/* Badges preview */}
                      {badges.length > 0 ? (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                          {badges.slice(0, 3).map((badge) => (
                            <BadgeChip badge={badge} key={badge.code} />
                          ))}
                        </View>
                      ) : null}
                    </View>

                    {/* Chat action if not self */}
                    {!entry.isMe && entry.userId ? (
                      <PressableScale
                        accessibilityLabel={`Chatear con ${entry.displayName}`}
                        disabled={message.isPending && message.variables === entry.userId}
                        onPress={() => message.mutate(entry.userId!)}
                        style={{
                          width: minTouchTarget,
                          height: minTouchTarget,
                          borderRadius: radii.full,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: colors.surfaceHigh,
                          borderWidth: 1,
                          borderColor: colors.borderSubtle,
                        }}
                      >
                        {message.isPending && message.variables === entry.userId ? (
                          <ActivityIndicator color={colors.volt} size="small" />
                        ) : (
                          <Ionicons color={colors.volt} name="chatbubble-outline" size={iconSizes.sm} />
                        )}
                      </PressableScale>
                    ) : null}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
