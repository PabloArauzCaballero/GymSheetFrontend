import { useState } from 'react';
import { Text, View } from 'react-native';
import { numericInputProps } from '@/components/keyboard';
import { Input } from '@/components/ui';
import { BIRTH_DATE_PARTS, type BirthDateParts } from '@/lib/birth-date';
import { colors, fontSizes, spacing } from '@/theme';
import { birthDateFromParts, signupCopy } from './signup-logic';

/**
 * Birth date as day / month / year number fields, the same pattern as the
 * map's birth date sheet: no native picker exists in the app, and three short
 * number pads are faster than scrolling a wheel back 30 years.
 */
export function BirthDateField({
  error,
  onChange,
}: {
  error?: string;
  onChange: (isoDate: string) => void;
}) {
  const [parts, setParts] = useState<BirthDateParts>({ dia: '', mes: '', anio: '' });

  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{signupCopy.birthDate.label}</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {BIRTH_DATE_PARTS.map((part) => (
          <View key={part.key} style={{ flex: part.flex }}>
            <Input
              keyboardType="number-pad"
              {...numericInputProps}
              accessibilityHint={signupCopy.birthDate.label}
              label={part.label}
              maxLength={part.maxLength}
              onChangeText={(text) => {
                const next = { ...parts, [part.key]: text.replace(/\D/g, '') };
                setParts(next);
                onChange(birthDateFromParts(next));
              }}
              placeholder={part.placeholder}
              value={parts[part.key]}
            />
          </View>
        ))}
      </View>
      <Text
        accessibilityLiveRegion={error ? 'polite' : 'none'}
        accessibilityRole={error ? 'alert' : undefined}
        style={{ color: error ? colors.danger : colors.textMuted, fontSize: fontSizes.xs }}
      >
        {error ?? signupCopy.birthDate.hint}
      </Text>
    </View>
  );
}
