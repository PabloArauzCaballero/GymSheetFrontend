import { Text, View } from 'react-native';
import { signupSexOptions } from '@gymsheet/domain';
import { SegmentLabel, SegmentedPill } from '@/components/motion';
import { colors, fontSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';
import { signupCopy } from './signup-logic';

type SexValue = '' | 'MALE' | 'FEMALE';

const options = signupSexOptions.map((option) => ({ value: option.value, accessibilityLabel: option.label }));
const labels: Record<'MALE' | 'FEMALE', string> = Object.fromEntries(
  signupSexOptions.map((option) => [option.value, option.label]),
) as Record<'MALE' | 'FEMALE', string>;

/**
 * Required sex at signup: two options, nothing chosen until the person taps
 * one (the sliding pill only appears then). Selection haptic per the map.
 */
export function SexField({
  value,
  error,
  onChange,
}: {
  value: SexValue;
  error?: string;
  onChange: (next: 'MALE' | 'FEMALE') => void;
}) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{signupCopy.sex.label}</Text>
      <SegmentedPill<SexValue>
        fill
        itemStyle={{ minHeight: minTouchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radii.full }}
        onChange={(next) => {
          if (next !== '') onChange(next);
        }}
        options={options}
        renderItem={(option, active) => (
          <SegmentLabel
            active={active}
            activeColor={colors.text}
            inactiveColor={colors.textMuted}
            label={option.value === '' ? '' : labels[option.value]}
            style={{ fontSize: fontSizes.md, fontWeight: active ? semibold : '400' }}
          />
        )}
        style={{
          padding: 3,
          borderRadius: radii.full,
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.border,
          backgroundColor: colors.surface,
        }}
        value={value}
      />
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={{ color: colors.danger, fontSize: fontSizes.xs }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
