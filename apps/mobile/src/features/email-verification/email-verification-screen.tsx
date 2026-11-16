import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { emailVerificationCopy } from '@gymsheet/domain';
import { ScrollScreen, ScreenHeader } from '@/components/layout';
import { BackLink } from '@/components/nav';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/state/auth-store';
import { accentPolicy, iconSizes, spacing } from '@/theme';
import { PinField } from './pin-field';
import { useEmailVerification } from './use-email-verification';

/** Where to go once verified: back to whatever sent the person here, or Comunidad. */
function useLeave() {
  const router = useRouter();
  return () => (router.canGoBack() ? router.back() : router.replace('/comunidad'));
}

function VerifiedView({ onContinue }: { onContinue: () => void }) {
  return (
    <View style={{ gap: spacing.lg, alignItems: 'flex-start' }}>
      <Ionicons
        accessibilityElementsHidden
        color={accentPolicy.glyph}
        importantForAccessibility="no-hide-descendants"
        name="checkmark-circle-outline"
        size={iconSizes.xl}
      />
      <Text accessibilityLiveRegion="polite" accessibilityRole="alert" variant="headline">
        {emailVerificationCopy.verified}
      </Text>
      <Button iconPosition="end" icon="arrow-forward" label="Continuar" onPress={onContinue} style={{ alignSelf: 'stretch' }} />
    </View>
  );
}

export function EmailVerificationScreen() {
  const email = useAuthStore((state) => state.principal?.email);
  const flow = useEmailVerification();
  const leave = useLeave();
  const resendLabel = flow.cooldown > 0 ? emailVerificationCopy.resendIn(flow.cooldown) : emailVerificationCopy.resend;

  return (
    <ScrollScreen>
      <BackLink />
      <ScreenHeader detail title={emailVerificationCopy.title} />
      {flow.verified ? (
        <VerifiedView onContinue={leave} />
      ) : (
        <View style={{ gap: spacing.lg }}>
          <View style={{ gap: spacing.xs }}>
            <Text tone="secondary" variant="body">{emailVerificationCopy.description}</Text>
            {email ? (
              <Text selectable strong variant="body">{email}</Text>
            ) : null}
          </View>
          <PinField editable={!flow.confirming} error={flow.error} onChangeText={flow.setPin} value={flow.pin} />
          {flow.notice ? (
            <Text accessibilityLiveRegion="polite" tone="secondary" variant="footnote">{flow.notice}</Text>
          ) : null}
          <Button
            disabled={!flow.canSubmit}
            label={emailVerificationCopy.submit}
            loading={flow.confirming}
            onPress={flow.submit}
          />
          {/* Secondary and quiet: the code is usually already in the inbox. */}
          <Button
            accessibilityHint={flow.cooldown > 0 ? 'Podrás pedir otro código cuando termine la cuenta atrás' : undefined}
            disabled={flow.cooldown > 0}
            icon="mail-outline"
            label={resendLabel}
            loading={flow.resending}
            onPress={flow.resend}
            variant="ghost"
          />
        </View>
      )}
    </ScrollScreen>
  );
}
