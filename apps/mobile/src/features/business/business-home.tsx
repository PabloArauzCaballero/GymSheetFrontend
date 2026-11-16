import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import {
  businessHomeCopy,
  businessNextStepCopy,
  businessTypeLabel,
  kycBannerCopy,
} from '@gymsheet/domain';
import type { BusinessMe } from '@gymsheet/schemas';
import { Card } from '@/components/layout';
import { Text } from '@/components/text';
import { alpha, colors, iconSizes, radii, spacing } from '@/theme';

/**
 * «Inicio» of the business shell (franja 8a): who you are, the KYC banner and
 * what is still missing. Orders, members and messages join with their franjas.
 */
export function BusinessHome({ me }: { me: BusinessMe }) {
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
      <View
        accessibilityLabel="Estado de tu negocio"
        accessibilityRole="summary"
        style={{
          flexDirection: 'row',
          gap: spacing.smd,
          alignItems: 'flex-start',
          padding: spacing.md,
          borderRadius: radii.lg,
          borderCurve: 'continuous',
          backgroundColor: alpha(colors.warning, 0.12),
        }}
      >
        <Ionicons accessibilityElementsHidden color={colors.warning} importantForAccessibility="no-hide-descendants" name="time-outline" size={iconSizes.md} />
        <Text strong style={{ flex: 1 }} tone="warning" variant="subhead">{kycBannerCopy(me.account.kycStatus)}</Text>
      </View>
      <View style={{ gap: spacing.smd }}>
        <Text accessibilityRole="header" variant="headline">{businessHomeCopy.pendingTitle}</Text>
        {me.nextSteps.length === 0 ? (
          <Text tone="secondary" variant="body">{businessHomeCopy.allDone}</Text>
        ) : (
          me.nextSteps.map((step) => {
            const copy = businessNextStepCopy[step];
            return (
              <Card key={step}>
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
