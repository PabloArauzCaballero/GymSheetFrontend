import { formatCountdown, gestureGlyph, verificationCopy } from '@gymsheet/domain';
import type { VerificationGesture } from '@gymsheet/schemas';
import { View } from 'react-native';
import { Card } from '@/components/layout';
import { Text } from '@/components/text';
import { radii, spacing, tones } from '@/theme';

/** The gesture to perform, big and plain, and the time left (in words, warning tone in the last minute). */
export function ChallengePanel({ gesture, seconds }: { gesture: VerificationGesture; seconds: number }) {
  const urgent = seconds <= 60;
  const palette = urgent ? tones.dark.warning : tones.dark.neutral;
  return (
    <Card>
      <View style={{ alignItems: 'center', gap: spacing.smd }}>
        <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" variant="hero">
          {gestureGlyph(gesture)}
        </Text>
        <Text tone="muted" variant="caption">
          {verificationCopy.gestureTitle}
        </Text>
        <Text style={{ textAlign: 'center' }} variant="title">
          {gesture.instruction}
        </Text>
        <View
          style={{
            paddingHorizontal: spacing.smd,
            paddingVertical: spacing.xs,
            borderRadius: radii.full,
            backgroundColor: palette.bg,
          }}
        >
          <Text accessibilityRole="timer" style={{ color: palette.text }} tabular testID="verification-countdown" variant="subhead">
            {verificationCopy.countdown(formatCountdown(seconds))}
          </Text>
        </View>
      </View>
    </Card>
  );
}
