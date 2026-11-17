import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { emailVerificationCopy } from '@gymsheet/domain';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/state/auth-store';
import { colors, iconSizes, radii, shadows, spacing } from '@/theme';
import { MailGlyph, verifyEmailHref } from './verify-email-state';

/**
 * Persistent reminder on top of Comunidad and Mensajes while the email is
 * unverified. Renders nothing otherwise (also while the flag is unknown, so an
 * old backend never shows it). Quiet on purpose: a ghost action, no accent
 * fill, the screen keeps its own primary.
 */
export function EmailVerificationBanner({ inset = false }: { inset?: boolean }) {
  const router = useRouter();
  const unverified = useAuthStore((state) => state.emailVerified === false);
  if (!unverified) return null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.smd,
        marginHorizontal: inset ? spacing.md : 0,
        paddingVertical: spacing.sm,
        paddingLeft: spacing.md,
        paddingRight: spacing.xs,
        borderRadius: radii.lg,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceLow,
        boxShadow: shadows.e1,
      }}
    >
      <MailGlyph size={iconSizes.md} />
      <Text style={{ flex: 1 }} tone="secondary" variant="footnote">
        {emailVerificationCopy.banner}
      </Text>
      <Button
        label={emailVerificationCopy.bannerAction}
        onPress={() => router.push(verifyEmailHref)}
        size="sm"
        variant="ghost"
      />
    </View>
  );
}
