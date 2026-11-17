import { Ionicons } from '@expo/vector-icons';
import type { VerificationView } from '@gymsheet/domain';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Card } from '@/components/layout';
import { Text } from '@/components/text';
import { iconSizes, radii, spacing, tones } from '@/theme';

const ICON: Record<VerificationView['tone'], keyof typeof Ionicons.glyphMap> = {
  neutral: 'scan-outline',
  info: 'time-outline',
  success: 'shield-checkmark-outline',
  warning: 'alert-circle-outline',
};

/** One verification state: glyph, title and one line; the state is in words, never only colour. */
export function VerificationStatusBlock({
  view,
  action,
}: {
  view: Pick<VerificationView, 'tone' | 'title' | 'body'>;
  action?: ReactNode;
}) {
  const palette = tones.dark[view.tone];
  return (
    <Card>
      <View accessibilityRole="summary" style={{ alignItems: 'center', gap: spacing.smd }} testID="verification-status">
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            width: 56,
            height: 56,
            borderRadius: radii.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: palette.bg,
          }}
        >
          <Ionicons color={palette.text} name={ICON[view.tone]} size={iconSizes.lg} />
        </View>
        <Text style={{ textAlign: 'center' }} variant="headline">
          {view.title}
        </Text>
        <Text style={{ textAlign: 'center' }} tone="secondary" variant="subhead">
          {view.body}
        </Text>
        {action ? <View style={{ alignSelf: 'stretch', marginTop: spacing.xs }}>{action}</View> : null}
      </View>
    </Card>
  );
}
