import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { emailVerificationCopy } from '@gymsheet/domain';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { accentPolicy, iconSizes, spacing } from '@/theme';

export const verifyEmailHref = '/verificar-correo' as const;

export function MailGlyph({ size }: { size: number }) {
  return (
    <Ionicons
      accessibilityElementsHidden
      color={accentPolicy.glyph}
      importantForAccessibility="no-hide-descendants"
      name="mail-unread-outline"
      size={size}
    />
  );
}

/**
 * What a social screen shows instead of a generic error when the API answers
 * 403 EMAIL_VERIFICATION_REQUIRED: the reason and the way out, in place.
 */
export function VerifyEmailState() {
  const router = useRouter();
  return (
    <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl, paddingHorizontal: spacing.lg }}>
      <MailGlyph size={iconSizes['2xl']} />
      <View style={{ alignItems: 'center', gap: spacing.xs, maxWidth: 320 }}>
        <Text accessibilityRole="header" style={{ textAlign: 'center' }} variant="headline">
          {emailVerificationCopy.title}
        </Text>
        <Text style={{ textAlign: 'center' }} tone="muted" variant="subhead">
          {emailVerificationCopy.banner}
        </Text>
      </View>
      <Button
        icon="mail-outline"
        label={emailVerificationCopy.bannerAction}
        onPress={() => router.push(verifyEmailHref)}
      />
    </View>
  );
}
