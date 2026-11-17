import { Ionicons } from '@expo/vector-icons';
import { offersConocer, offersVerificationCta, verificationCopy } from '@gymsheet/domain';
import { useRouter } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/state/auth-store';
import { colors, iconSizes, radii, shadows, spacing, tones } from '@/theme';
import { verificationCtaDismissal } from './verification-logic';
import { useMyVerification } from './use-verification-flow';

/**
 * «Verifícate para aparecer antes» in Conocer and the own profile: members
 * only, while there is something to do, and gone for the app session after
 * «Ahora no» (in memory). Quiet on purpose: the screen keeps its own primary.
 */
export function VerificationCta({ inset = false }: { inset?: boolean }) {
  const router = useRouter();
  const enabled = useAuthStore((state) => offersConocer(state.principal?.role));
  const dismissed = useSyncExternalStore(verificationCtaDismissal.subscribe, verificationCtaDismissal.get);
  const status = useMyVerification(enabled && !dismissed);
  if (!enabled || dismissed || !offersVerificationCta(status.data?.status)) return null;

  return (
    <View
      style={{
        gap: spacing.smd,
        marginHorizontal: inset ? spacing.md : 0,
        padding: spacing.md,
        borderRadius: radii.lg,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceLow,
        boxShadow: shadows.e1,
      }}
      testID="verification-cta"
    >
      <View style={{ flexDirection: 'row', gap: spacing.smd, alignItems: 'flex-start' }}>
        <Ionicons color={tones.dark.info.text} name="shield-checkmark-outline" size={iconSizes.md} />
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text accessibilityRole="header" variant="headline">
            {verificationCopy.ctaTitle}
          </Text>
          <Text tone="secondary" variant="footnote">
            {verificationCopy.ctaWhy}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button label={verificationCopy.ctaAction} onPress={() => router.push('/verificacion')} size="sm" variant="secondary" />
        <Button label={verificationCopy.ctaDismiss} onPress={verificationCtaDismissal.dismiss} size="sm" variant="ghost" />
      </View>
    </View>
  );
}
