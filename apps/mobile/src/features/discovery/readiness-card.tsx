import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { readinessLabels } from '@gymsheet/domain';
import type { DiscoveryReadinessCode } from '@gymsheet/schemas';
import { socialService } from '@/api/services';
import { Card } from '@/components/layout';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { verifyEmailHref } from '@/features/email-verification/verify-email-state';
import { refreshDiscoveryReadiness } from '@/features/social-profile/query-keys';
import { notify } from '@/notifications';
import { accentPolicy, colors, iconSizes, spacing } from '@/theme';

const GAP_ICON: Record<DiscoveryReadinessCode, keyof typeof Ionicons.glyphMap> = {
  EMAIL_VERIFICATION: 'mail-unread-outline',
  PROFILE_ENABLED: 'eye-outline',
  PREFERENCES: 'options-outline',
  PHOTOS: 'images-outline',
};

/**
 * The action behind each gap. Turning the profile on is one tap; the email
 * opens the PIN screen; the rest open the "Conocer" step.
 */
function useGapAction(needsSettings: boolean) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: ['social', 'discovery-settings'],
    queryFn: socialService.getDiscoverySettings,
    enabled: needsSettings,
  });
  const enable = useMutation({
    mutationFn: async () => {
      const current = settings.data ?? (await settings.refetch()).data;
      if (!current) throw new Error('No pudimos leer tu perfil social. Inténtalo de nuevo.');
      return socialService.updateDiscoverySettings({
        profileEnabled: true,
        crossGymEnabled: current.crossGymEnabled,
        mapEnabled: current.mapEnabled,
        expectedVersion: current.version,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['social', 'discovery-settings'] }),
        refreshDiscoveryReadiness(queryClient),
      ]);
      notify.success('Perfil social activado.');
    },
    onError: (error: Error) => notify.error(error),
  });
  const run = (gap: DiscoveryReadinessCode) => {
    if (gap === 'PROFILE_ENABLED') enable.mutate();
    else if (gap === 'EMAIL_VERIFICATION') router.push(verifyEmailHref);
    else router.push({ pathname: '/onboarding-conocer', params: { modo: 'perfil', paso: gap === 'PHOTOS' ? 'photos' : 'search' } });
  };
  return { run, enabling: enable.isPending };
}

/**
 * «Para aparecer en Conocer»: what keeps this member out of other decks, first
 * gap first. Full card when the deck is empty; `compact` is a single line over
 * the deck, so the cards keep the stage.
 */
export function ReadinessCard({ gaps, compact = false }: { gaps: readonly DiscoveryReadinessCode[]; compact?: boolean }) {
  const { run, enabling } = useGapAction(gaps.includes('PROFILE_ENABLED'));
  const first = gaps[0];
  if (!first) return null;

  if (compact) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md }}>
        <Ionicons color={accentPolicy.glyph} name={GAP_ICON[first]} size={iconSizes.sm} />
        <Text numberOfLines={2} style={{ flex: 1 }} tone="secondary" variant="footnote">
          {`Aún no apareces en Conocer. ${readinessLabels[first].title}.`}
        </Text>
        <Button label={readinessLabels[first].action} loading={first === 'PROFILE_ENABLED' && enabling} onPress={() => run(first)} size="sm" variant="ghost" />
      </View>
    );
  }

  return (
    <Card>
      <View style={{ gap: spacing.xs }}>
        <Text accessibilityRole="header" variant="headline">Para aparecer en Conocer</Text>
        <Text tone="secondary" variant="subhead">Completa esto y otras personas podrán verte.</Text>
      </View>
      {gaps.map((gap, index) => (
        <View key={gap} style={{ gap: spacing.sm, paddingTop: spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Ionicons color={index === 0 ? accentPolicy.ink : colors.textMuted} name={GAP_ICON[gap]} size={iconSizes.md} />
            <Text strong style={{ flex: 1 }} variant="body">{readinessLabels[gap].title}</Text>
          </View>
          {/* One primary: the next step. The rest wait their turn in ghost. */}
          <Button
            label={readinessLabels[gap].action}
            loading={gap === 'PROFILE_ENABLED' && enabling}
            onPress={() => run(gap)}
            size="sm"
            variant={index === 0 ? 'primary' : 'ghost'}
          />
        </View>
      ))}
    </Card>
  );
}
