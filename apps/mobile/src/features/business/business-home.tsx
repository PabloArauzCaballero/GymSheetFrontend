import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import {
  businessDestination,
  businessHomeCopy,
  businessNextStepCopy,
  businessTypeLabel,
  kycBanner,
} from '@gymsheet/domain';
import type { BusinessMe } from '@gymsheet/schemas';
import { Card } from '@/components/layout';
import { Text } from '@/components/text';
import { iconSizes, minTouchTarget, radii, spacing, tones } from '@/theme';

const BANNER_ICON = { success: 'checkmark-circle-outline', warning: 'time-outline', danger: 'shield-outline', info: 'hourglass-outline' } as const;

/**
 * «Inicio» of the business shell: who you are, the KYC banner (with the way
 * to continue or see the status, franja 8b) and what is still missing.
 * Orders, members and messages join with their franjas.
 */
export function BusinessHome({ me }: { me: BusinessMe }) {
  const router = useRouter();
  const banner = kycBanner(me.account.kycStatus, me.account.status);
  const palette = tones.dark[banner.tone];
  const kycHref = me.account.kycStatus === 'DRAFT' ? businessDestination.mobile.kycWizard : businessDestination.mobile.kyc;
  const handle = me.handle
    ? me.handle.status === 'ACTIVE'
      ? businessHomeCopy.handleActive(me.handle.handle)
      : businessHomeCopy.handlePending(me.handle.handle)
    : null;
  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <Text tone="secondary" variant="footnote">{businessTypeLabel(me.entity.entityType)}</Text>
        <Text accessibilityRole="header" variant="title">{me.entity.name}</Text>
        {handle ? <Text tone="secondary" variant="subhead">{handle}</Text> : null}
      </View>
      <Pressable
        accessibilityHint={banner.action ?? undefined}
        accessibilityLabel={`Estado de tu negocio: ${banner.text}`}
        accessibilityRole="button"
        onPress={() => router.push(kycHref)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          gap: spacing.smd,
          alignItems: 'center',
          minHeight: minTouchTarget,
          padding: spacing.md,
          borderRadius: radii.lg,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: palette.bg,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Ionicons accessibilityElementsHidden color={palette.text} importantForAccessibility="no-hide-descendants" name={BANNER_ICON[banner.tone]} size={iconSizes.md} />
        <Text strong style={{ flex: 1, color: palette.text }} variant="subhead">{banner.text}</Text>
        <Ionicons accessibilityElementsHidden color={palette.text} importantForAccessibility="no-hide-descendants" name="chevron-forward" size={iconSizes.sm} />
      </Pressable>
      <View style={{ gap: spacing.smd }}>
        <Text accessibilityRole="header" variant="headline">{businessHomeCopy.pendingTitle}</Text>
        {me.nextSteps.length === 0 ? (
          <Text tone="secondary" variant="body">{businessHomeCopy.allDone}</Text>
        ) : (
          me.nextSteps.map((step) => {
            const copy = businessNextStepCopy[step];
            return (
              <Card key={step} {...(copy.available && step === 'SUBMIT_KYC' ? { onPress: () => router.push(businessDestination.mobile.kycWizard), accessibilityLabel: copy.title } : {})}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <View style={{ flex: 1, gap: spacing.xxs }}>
                    <Text strong variant="body">{copy.title}</Text>
                    <Text tone="secondary" variant="subhead">{copy.description}</Text>
                  </View>
                  {copy.available ? null : <Text tone="secondary" variant="footnote">{businessHomeCopy.soon}</Text>}
                </View>
              </Card>
            );
          })
        )}
      </View>
    </View>
  );
}
