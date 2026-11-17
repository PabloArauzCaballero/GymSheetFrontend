import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { businessDestination, kycFailure, type KycOutcome } from '@gymsheet/domain';
import { queryKeys } from '@gymsheet/hooks';
import { AuthAlert } from '@/components/auth-shell';
import { Card } from '@/components/layout';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { iconSizes, spacing, tones } from '@/theme';
import { kycService } from './kyc-service';

const ICON = { success: 'checkmark-circle', info: 'time-outline', warning: 'alert-circle-outline', danger: 'shield-outline' } as const;

/**
 * The KYC result: published, in review, to correct or final. The first
 * listing (8c) and «Configura tu cobro por QR» (8d) open their screens; an
 * action not available yet shows disabled with its hint (no dead links). The mobile has no public
 * profile screen for a business yet, so «Ver mi ficha» is the web's job.
 */
export function ResultView({ outcome }: { outcome: KycOutcome }) {
  const router = useRouter();
  const client = useQueryClient();
  const reopen = useMutation({
    mutationFn: (key: 'resubmit' | 'startChange') => (key === 'resubmit' ? kycService.resubmit() : kycService.startChange()),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.business.me });
      router.replace(businessDestination.mobile.kycWizard);
    },
  });
  const palette = tones.dark[outcome.tone];

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', gap: spacing.smd, alignItems: 'flex-start' }}>
        <Ionicons accessibilityElementsHidden color={palette.text} importantForAccessibility="no-hide-descendants" name={ICON[outcome.tone]} size={iconSizes.xl} />
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text accessibilityRole="header" variant="title">{outcome.title}</Text>
          <Text tone="secondary" variant="body">{outcome.body}</Text>
        </View>
      </View>
      {outcome.notes.length > 0 ? (
        <Card>
          {outcome.notes.map((note) => (
            <Text key={note} variant="subhead">• {note}</Text>
          ))}
        </Card>
      ) : null}
      {reopen.error ? <AuthAlert message={kycFailure(reopen.error).message} /> : null}
      {outcome.actions
        .filter((action) => action.key !== 'publicProfile')
        .map((action, index) => {
          if (!action.available) {
            return <Button accessibilityHint={action.hint} disabled key={action.key} label={`${action.label} · ${action.hint ?? ''}`} onPress={() => undefined} variant="ghost" />;
          }
          const onPress =
            action.key === 'portal'
              ? () => router.replace(businessDestination.mobile.home)
              : action.key === 'firstListing'
                ? () => router.push(businessDestination.mobile.newListing)
              : action.key === 'qrPayments'
                ? () => router.push(businessDestination.mobile.payments)
              : () => reopen.mutate(action.key === 'resubmit' ? 'resubmit' : 'startChange');
          return (
            <Button
              key={action.key}
              label={action.label}
              loading={reopen.isPending && reopen.variables === action.key}
              onPress={onPress}
              variant={index === 0 ? 'primary' : 'ghost'}
            />
          );
        })}
    </View>
  );
}
