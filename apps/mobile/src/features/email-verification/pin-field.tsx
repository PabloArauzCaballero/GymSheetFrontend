import { useState } from 'react';
import { Platform, TextInput, View } from 'react-native';
import { emailVerificationCopy } from '@gymsheet/domain';
import { Text } from '@/components/text';
import { colors, fontSizes, radii, spacing, tabularNums } from '@/theme';

/**
 * The six-digit code as one field, large and tabular, so each digit keeps its
 * place while typing. One `TextInput` (not six boxes) keeps paste, the iOS
 * «From Messages / Mail» suggestion and VoiceOver working without tricks. No
 * `maxLength`: it would cut a pasted «123 456» before the digits are filtered.
 */
export function PinField({
  value,
  onChangeText,
  error,
  editable = true,
}: {
  value: string;
  onChangeText: (text: string) => void;
  error?: string | null;
  editable?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  // Error wins over focus, as in `Input`: the warning must survive while fixing it.
  const borderColor = error ? colors.danger : focused ? colors.volt : colors.borderControl;

  return (
    <View style={{ gap: spacing.xs }}>
      <Text tone="muted" variant="subhead">{emailVerificationCopy.pinLabel}</Text>
      <TextInput
        accessibilityLabel={emailVerificationCopy.pinLabel}
        accessibilityHint="Seis dígitos"
        // Android names its code autofill `sms-otp`; iOS reads `textContentType`.
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        autoFocus
        editable={editable}
        importantForAutofill="yes"
        keyboardAppearance="dark"
        keyboardType="number-pad"
        onBlur={() => setFocused(false)}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        placeholder="••••••"
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.volt}
        style={[
          tabularNums,
          {
            minHeight: 64,
            borderRadius: radii.lg,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor,
            backgroundColor: colors.surface,
            color: colors.text,
            fontSize: fontSizes['2xl'],
            letterSpacing: spacing.smd,
            textAlign: 'center',
            paddingHorizontal: spacing.md,
          },
        ]}
        textContentType="oneTimeCode"
        value={value}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" accessibilityRole="alert" tone="danger" variant="footnote">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
