import { View } from 'react-native';
import { FilterChip } from '@/components/filter-chip';
import { Text } from '@/components/text';
import { spacing } from '@/theme';
import { toggleSingle } from './selection';

/**
 * One optional question answered with a chip. A second tap on the chosen chip
 * clears it: nothing here is mandatory.
 */
export function SingleChoice<T extends string>({
  title,
  labels,
  value,
  onChange,
}: {
  title: string;
  labels: Record<T, string>;
  value: T | null;
  onChange: (next: T | null) => void;
}) {
  const options = Object.keys(labels) as T[];
  return (
    <View accessibilityRole="radiogroup" style={{ gap: spacing.sm }}>
      <Text strong tone="secondary" variant="subhead">
        {title}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {options.map((option) => (
          <FilterChip
            key={option}
            label={labels[option]}
            onPress={() => onChange(toggleSingle(value, option))}
            selected={value === option}
          />
        ))}
      </View>
    </View>
  );
}
