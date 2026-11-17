import { useEffect } from 'react';
import { View } from 'react-native';
import { emailVerificationCopy } from '@gymsheet/domain';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { PinField } from '@/features/email-verification/pin-field';
import { useEmailVerification } from '@/features/email-verification/use-email-verification';
import { spacing } from '@/theme';

/** Step 2, «Verifica tu correo»: the existing PIN flow; signup already sent the code. */
export function VerifyStep({ email, onVerified }: { email: string; onVerified: () => void }) {
  const flow = useEmailVerification();
  const resendLabel = flow.cooldown > 0 ? emailVerificationCopy.resendIn(flow.cooldown) : emailVerificationCopy.resend;

  useEffect(() => {
    if (flow.verified) onVerified();
  }, [flow.verified, onVerified]);

  return (
    <View style={{ gap: spacing.lg }}>
      <Text selectable strong variant="body">{email}</Text>
      <PinField editable={!flow.confirming} error={flow.error} onChangeText={flow.setPin} value={flow.pin} />
      {flow.notice ? (
        <Text accessibilityLiveRegion="polite" tone="secondary" variant="footnote">{flow.notice}</Text>
      ) : null}
      <Button disabled={!flow.canSubmit} label={emailVerificationCopy.submit} loading={flow.confirming} onPress={flow.submit} />
      <Button
        disabled={flow.cooldown > 0}
        icon="mail-outline"
        label={resendLabel}
        loading={flow.resending}
        onPress={flow.resend}
        variant="ghost"
      />
    </View>
  );
}
