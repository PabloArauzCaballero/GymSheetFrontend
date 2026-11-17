import { Ionicons } from '@expo/vector-icons';
import { businessClosureCopy, type ClosureBlockerNotice } from '@gymsheet/domain';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Card, Section } from '@/components/layout';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { iconSizes, radii, spacing, tones } from '@/theme';

/**
 * What stops the closure right now (a business with receipts to decide,
 * ADR-0028), each with the way to solve it. The proof is not offered while
 * one is listed: the backend would answer 409 anyway.
 */
export function ClosureBlockers({ notices }: { notices: readonly ClosureBlockerNotice[] }) {
  const router = useRouter();
  if (notices.length === 0) return null;
  const warning = tones.dark.warning;
  return (
    <Section icon="alert-circle-outline" title={businessClosureCopy.blockedTitle}>
      {notices.map((notice) => (
        <View
          accessibilityRole="alert"
          key={notice.code}
          style={{ gap: spacing.sm, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, borderColor: warning.border, backgroundColor: warning.bg }}
        >
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
            <Ionicons color={warning.text} name="receipt-outline" size={iconSizes.md} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text strong style={{ color: warning.text }} variant="subhead">{notice.title}</Text>
              <Text style={{ color: warning.text }} variant="footnote">{notice.message}</Text>
            </View>
          </View>
          {notice.action ? (
            <Button label={notice.action.label} onPress={() => router.push(notice.action?.mobile as Href)} size="sm" testID="closure-blocker-action" variant="secondary" />
          ) : null}
        </View>
      ))}
    </Section>
  );
}

/** «Qué pasa al cerrar»: the effects of closing a business account. */
export function BusinessClosureEffects() {
  return (
    <Section icon="information-circle-outline" title={businessClosureCopy.effectsTitle}>
      <Card>
        {businessClosureCopy.effects.map((effect) => (
          <View key={effect} style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Text tone="secondary" variant="footnote">•</Text>
            <Text style={{ flex: 1 }} tone="secondary" variant="footnote">{effect}</Text>
          </View>
        ))}
      </Card>
    </Section>
  );
}
