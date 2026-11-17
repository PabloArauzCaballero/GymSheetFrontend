import { useMutation } from '@tanstack/react-query';
import { View } from 'react-native';
import { formatCountdown, gestureGlyph, kycCopy, kycFailure } from '@gymsheet/domain';
import { withSelfieChallenge, withSelfieConsent } from '@gymsheet/hooks';
import type { KycSelfieChallenge, KycState } from '@gymsheet/schemas';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { colors, radii, spacing, tabularNums } from '@/theme';
import { kycService, useKycCache } from './kyc-service';
import { useSecondsLeft } from './use-seconds-left';

/** Whether the selfie can be taken now: consent up to date and a gesture still open. */
export function useSelfieReady(consent: KycState['consent'], challenge: KycSelfieChallenge | null): boolean {
  const seconds = useSecondsLeft(challenge?.expiresAt ?? null);
  return consent.upToDate && Boolean(challenge) && seconds > 0;
}

/** The KYC_SELFIE consent with its purpose, right before the photo; then a one-use gesture with its deadline. */
export function SelfieGate({ consent, challenge }: { consent: KycState['consent']; challenge: KycSelfieChallenge | null }) {
  const cache = useKycCache();
  const seconds = useSecondsLeft(challenge?.expiresAt ?? null);
  const grant = useMutation({ mutationFn: () => kycService.grantSelfieConsent(consent.currentVersion), onSuccess: () => cache(withSelfieConsent) });
  const ask = useMutation({ mutationFn: kycService.selfieChallenge, onSuccess: (next) => cache((state) => withSelfieChallenge(state, next)) });
  const failure = grant.error ?? ask.error;
  const box = { gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, borderCurve: 'continuous' as const, backgroundColor: colors.surfaceHigh };

  if (!consent.upToDate) {
    return (
      <View style={box}>
        <Text strong variant="subhead">{kycCopy.documents.consentTitle}</Text>
        <Text tone="secondary" variant="subhead">{kycCopy.documents.consentBody}</Text>
        {failure ? <Text tone="danger" variant="footnote">{kycFailure(failure).message}</Text> : null}
        <Button label={kycCopy.documents.consentAccept} loading={grant.isPending} onPress={() => grant.mutate()} size="sm" variant="secondary" />
      </View>
    );
  }
  if (!challenge || seconds === 0) {
    return (
      <View style={{ gap: spacing.sm }}>
        {challenge ? <Text tone="secondary" variant="subhead">{kycCopy.documents.gestureExpired}</Text> : null}
        {failure ? <Text tone="danger" variant="footnote">{kycFailure(failure).message}</Text> : null}
        <Button icon="hand-left-outline" label={kycCopy.documents.gestureAsk} loading={ask.isPending} onPress={() => ask.mutate()} size="sm" variant="secondary" />
      </View>
    );
  }
  return (
    <View accessibilityLabel={`${kycCopy.documents.gestureTitle}: ${challenge.instruction}`} accessible style={[box, { flexDirection: 'row', alignItems: 'center' }]}>
      <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" variant="hero">
        {gestureGlyph(challenge)}
      </Text>
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text strong variant="body">{challenge.instruction}</Text>
        <Text style={tabularNums} tone="secondary" variant="footnote">{kycCopy.documents.gestureLeft(formatCountdown(seconds))}</Text>
      </View>
    </View>
  );
}
