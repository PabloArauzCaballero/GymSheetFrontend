import { Ionicons } from '@expo/vector-icons';
import { buyerOrderSteps, formatDateTime, timelineEntryText, type OrderStep } from '@gymsheet/domain';
import type { BusinessOrderDetail, BuyerOrderDetail } from '@gymsheet/schemas';
import { View } from 'react-native';
import { Text } from '@/components/text';
import { colors, iconSizes, radii, spacing, tones } from '@/theme';

const STATE_TEXT: Record<OrderStep['state'], string> = { done: 'hecho', current: 'ahora', upcoming: 'después', stopped: 'se detuvo aquí' };

function Marker({ step, index }: { step: OrderStep; index: number }) {
  const size = 28;
  const base = { width: size, height: size, borderRadius: radii.full, alignItems: 'center' as const, justifyContent: 'center' as const };
  if (step.state === 'done') return <View style={[base, { backgroundColor: tones.dark.success.bg }]}><Ionicons color={tones.dark.success.text} name="checkmark" size={iconSizes.sm} /></View>;
  if (step.state === 'stopped') return <View style={[base, { backgroundColor: tones.dark.danger.bg }]}><Ionicons color={tones.dark.danger.text} name="close" size={iconSizes.sm} /></View>;
  if (step.state === 'current') return <View style={[base, { backgroundColor: colors.text }]}><Text style={{ color: colors.background }} strong variant="footnote">{index + 1}</Text></View>;
  return <View style={[base, { borderWidth: 1, borderColor: colors.border }]}><Text tone="muted" variant="footnote">{index + 1}</Text></View>;
}

/** The buyer's track (plan §4.3) and every change with its date; each step says its state in words. */
export function OrderSteps({ order }: { order: BuyerOrderDetail | BusinessOrderDetail }) {
  const steps = buyerOrderSteps(order);
  return (
    <View style={{ gap: spacing.md }}>
      {steps.map((step, index) => (
        <View accessibilityLabel={`${step.label}, ${STATE_TEXT[step.state]}`} accessible key={step.key} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd }}>
          <Marker index={index} step={step} />
          <Text strong={step.state !== 'upcoming'} tone={step.state === 'upcoming' ? 'muted' : 'default'} variant="body">{step.label}</Text>
        </View>
      ))}
      {order.timeline.length > 0 ? (
        <View style={{ gap: spacing.xs, paddingTop: spacing.sm }}>
          {order.timeline.map((entry) => (
            <View key={`${entry.status}-${entry.at}`} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
              <Text style={{ flex: 1 }} variant="subhead">{timelineEntryText(entry, order.method)}</Text>
              <Text tabular tone="secondary" variant="footnote">{formatDateTime(entry.at)}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
