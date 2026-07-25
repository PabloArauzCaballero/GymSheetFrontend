import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSizes, minTouchTarget, radii, spacing } from '@/theme';

/** Full-screen container that respects the safe area and applies the base background. */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, padding: spacing.lg, gap: spacing.md }}>{children}</View>
    </SafeAreaView>
  );
}

export function AppText({
  children,
  variant = 'body',
}: {
  children: ReactNode;
  variant?: 'title' | 'body' | 'muted';
}) {
  const style = {
    title: { color: colors.text, fontSize: fontSizes.xl, fontWeight: '700' as const },
    body: { color: colors.text, fontSize: fontSizes.md },
    muted: { color: colors.textMuted, fontSize: fontSizes.sm },
  }[variant];
  return <Text style={style}>{children}</Text>;
}

export function Button({
  label,
  onPress,
  loading = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      style={{
        minHeight: minTouchTarget,
        borderRadius: radii.md,
        backgroundColor: isDisabled ? colors.surfaceHigh : colors.volt,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
      }}
    >
      {loading ? (
        <ActivityIndicator color={colors.background} />
      ) : (
        <Text style={{ color: colors.background, fontSize: fontSizes.md, fontWeight: '600' }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Input({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textDisabled}
        style={{
          minHeight: minTouchTarget,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.border,
          backgroundColor: colors.surface,
          color: colors.text,
          paddingHorizontal: spacing.md,
          fontSize: fontSizes.md,
        }}
        {...props}
      />
      {error ? <Text style={{ color: colors.danger, fontSize: fontSizes.xs }}>{error}</Text> : null}
    </View>
  );
}
