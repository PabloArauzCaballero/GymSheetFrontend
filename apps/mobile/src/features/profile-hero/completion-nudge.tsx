import { Ionicons } from '@expo/vector-icons';
import type { ProfileCompletion, ProfileCompletionItem } from '@gymsheet/schemas';
import { noOrphan, pendingProfileItems, pointsChip, profileNudgeTitle, profileProgress } from '@gymsheet/domain';
import { View } from 'react-native';
import { Skeleton } from '@/components/feedback';
import { Card, Divider } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import { ProgressTrack } from '@/components/progression';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { CompletionDone } from './completion-done';
import { accentPolicy, colors, iconSizes, minTouchTarget, radii, spacing, textVariants } from '@/theme';

/** Un glifo por dato: la lista se escanea por forma antes que por texto. */
export const PROFILE_ITEM_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  FOTO: 'camera-outline',
  FOTOS_3: 'images-outline',
  BIO: 'chatbubble-ellipses-outline',
  DATOS: 'body-outline',
  NIVEL: 'speedometer-outline',
  INTERESES: 'heart-outline',
  NACIMIENTO: 'calendar-outline',
  GENERO: 'person-outline',
};

/** Ficha «+50»: tinta de acento sobre superficie, no relleno (el relleno es de «Editar perfil»). */
export function PointsChip({ points }: { points: number }) {
  return (
    <View
      style={{
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: radii.full,
        backgroundColor: colors.surfaceHighest,
      }}
    >
      <Text style={{ color: accentPolicy.ink }} strong variant="footnote">
        {`${pointsChip(points)} pts`}
      </Text>
    </View>
  );
}

function NudgeRow({ item, onPress }: { item: ProfileCompletionItem; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityHint={item.hint}
      accessibilityLabel={`${item.label}. Suma ${item.points} puntos.`}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd, minHeight: minTouchTarget + spacing.sm, paddingVertical: spacing.smd }}
      testID={`profile-nudge-${item.code}`}
    >
      <Ionicons color={colors.textSecondary} name={PROFILE_ITEM_ICON[item.code] ?? 'ellipse-outline'} size={iconSizes.md} />
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text strong variant="subhead">
          {noOrphan(item.label)}
        </Text>
        <Text tone="secondary" variant="footnote">
          {noOrphan(item.hint)}
        </Text>
      </View>
      <PointsChip points={item.points} />
    </PressableScale>
  );
}

/**
 * El empujón honesto: cuántos puntos quedan, de verdad, y qué dato da cada
 * uno. Todo sale de `GET /me/progression/profile-completion`; si el servidor
 * no respondió no se promete nada, y sin puntos pendientes la tarjeta no está.
 */
export function CompletionNudge({
  completion,
  onItemPress,
  onSeePreview,
  seenBefore,
}: {
  completion: ProfileCompletion;
  onItemPress: (code: string) => void;
  /** At 100 % the card turns into the reward: how others see you. */
  onSeePreview: () => void;
  /** Whether the 100 % card was already seen on this device (`useCompleteSeen`). */
  seenBefore: boolean | undefined;
}) {
  const title = profileNudgeTitle(completion.pointsAvailable);
  const pending = pendingProfileItems(completion.items);
  if (!title || pending.length === 0) return <CompletionDone completion={completion} onPress={onSeePreview} seenBefore={seenBefore} />;
  const shown = pending.slice(0, 3);
  const rest = pending.length - shown.length;
  const progress = profileProgress(completion);

  return (
    <Card>
      <View style={{ gap: spacing.sm }}>
        <Text accessibilityRole="header" variant="headline">
          {noOrphan(title)}
        </Text>
        <Text tone="secondary" variant="footnote">
          {noOrphan(`${progress.label}. Cada dato suma una vez y no se pierde.`)}
        </Text>
        <ProgressTrack color={colors.volt} height={6} ratio={progress.ratio} />
      </View>
      <View>
        {shown.map((item, index) => (
          <View key={item.code}>
            {index > 0 ? <Divider /> : null}
            <NudgeRow item={item} onPress={() => onItemPress(item.code)} />
          </View>
        ))}
      </View>
      {rest > 0 ? (
        <PressableScale
          accessibilityLabel={rest === 1 ? 'Ver 1 dato más' : `Ver ${rest} datos más`}
          haptic="light"
          onPress={() => onItemPress(pending[shown.length]?.code ?? '')}
          style={{ minHeight: minTouchTarget, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: spacing.xxs }}
        >
          <Text style={{ color: accentPolicy.ink }} strong variant="subhead">
            {rest === 1 ? 'Ver 1 dato más' : `Ver ${rest} datos más`}
          </Text>
          <Ionicons color={accentPolicy.ink} name="chevron-forward" size={iconSizes.sm} />
        </PressableScale>
      ) : null}
    </Card>
  );
}

/**
 * The completion read failed: say so where the card would be, with a retry,
 * instead of hiding the card (an absent nudge reads as «nothing left to earn»).
 */
export function CompletionError({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  return (
    <Card>
      <View accessibilityRole="alert" style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.smd }}>
        <Ionicons color={colors.textSecondary} name="cloud-offline-outline" size={iconSizes.md} />
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text variant="headline">{noOrphan('No pudimos cargar tu progreso')}</Text>
          <Text tone="secondary" variant="footnote">
            {noOrphan('Tus puntos están a salvo. Vuelve a intentarlo en un momento.')}
          </Text>
        </View>
      </View>
      <Button icon="refresh-outline" label="Reintentar" loading={retrying} onPress={onRetry} size="sm" style={{ alignSelf: 'flex-start' }} testID="profile-completion-retry" variant="secondary" />
    </Card>
  );
}

/** Loading: the nudge's own silhouette (title, bar, three rows), so nothing jumps when it arrives. */
export function CompletionSkeleton() {
  return (
    <Card>
      <View style={{ gap: spacing.sm }}>
        <Skeleton height={textVariants.headline.lineHeight} radius={radii.sm} width="80%" />
        <Skeleton height={textVariants.footnote.lineHeight} radius={radii.sm} width="60%" />
        <Skeleton height={spacing.xs + spacing.xxs} radius={radii.full} />
      </View>
      {[0, 1, 2].map((row) => (
        <View key={row} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd, minHeight: minTouchTarget + spacing.sm }}>
          <Skeleton height={iconSizes.md} radius={radii.full} width={iconSizes.md} />
          <View style={{ flex: 1, gap: spacing.xxs }}>
            <Skeleton height={textVariants.subhead.lineHeight} radius={radii.sm} width="70%" />
            <Skeleton height={textVariants.footnote.lineHeight} radius={radii.sm} width="50%" />
          </View>
          <Skeleton height={textVariants.footnote.lineHeight + spacing.xs} radius={radii.full} width={spacing["2xl"] + spacing.sm} />
        </View>
      ))}
    </Card>
  );
}
